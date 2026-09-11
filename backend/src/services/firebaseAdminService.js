import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure .env variables are loaded even if module is imported before index.js executes dotenv.config()
dotenv.config({ path: resolve(__dirname, "../../.env") });
if (!process.env.MONGO_URI && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  dotenv.config({ path: resolve(__dirname, "../../../.env") });
}

let isFirebaseInitialized = false;

function initFirebaseAdmin() {
  const currentApps = getApps();
  if (currentApps.length > 0) {
    isFirebaseInitialized = true;
    return true;
  }

  console.log(
    "[FCM DEBUG] service account path configured:",
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  );

  try {
    let credential = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = cert(parsed);
      console.log(`[FCM] Loaded service account from JSON string for project: ${parsed.project_id}`);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const rawPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      let fullPath = resolve(process.cwd(), rawPath);
      if (!existsSync(fullPath)) {
        fullPath = resolve(__dirname, "../../", rawPath);
      }

      if (existsSync(fullPath)) {
        const fileContent = readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(fileContent);
        credential = cert(parsed);
        console.log(`[FCM] Loaded service account file for project: ${parsed.project_id}`);
      } else {
        console.warn(`[FCM] Service account file not found at: ${fullPath}`);
      }
    }

    if (credential) {
      initializeApp({ credential });
      isFirebaseInitialized = true;
      console.log(`[FCM] Firebase Admin SDK initialized successfully (App count: ${getApps().length}).`);
      return true;
    } else {
      console.warn(
        "[FCM] Service account key not found in FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH. Mobile push notifications will log locally until configured."
      );
      return false;
    }
  } catch (error) {
    console.error("[FCM] Failed to initialize Firebase Admin SDK:", error?.message || error);
    return false;
  }
}

// Attempt initialization on file import
initFirebaseAdmin();

/**
 * Send push notification to all registered FCM tokens for a given user.
 * Automatically cleans up expired/unregistered FCM tokens.
 */
export async function sendPushNotificationToUser(userId, { title, body, data = {} }) {
  if (!userId || !title || !body) {
    return { success: false, reason: "Missing required notification fields" };
  }

  try {
    const user = await User.findById(userId).select("fcmTokens email");
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: false, reason: "User has no registered FCM tokens" };
    }

    // Filter non-empty tokens
    const validTokens = user.fcmTokens.filter(t => typeof t === "string" && t.trim().length > 0);
    if (validTokens.length === 0) {
      return { success: false, reason: "User has no valid FCM tokens" };
    }

    if (!isFirebaseInitialized) {
      // Re-check init in case env variables were dynamically updated
      initFirebaseAdmin();
    }

    if (!isFirebaseInitialized) {
      console.log(`[FCM DEV MOCK] Would send push to user (${user.email}) tokens (${validTokens.length}): "${title}" - "${body}"`);
      return { success: true, mock: true, recipientCount: validTokens.length };
    }

    // Ensure all data values are stringified for FCM requirement
    const stringifiedData = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) {
        stringifiedData[key] = String(val);
      }
    }

    const multicastPayload = {
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      tokens: validTokens,
    };

    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast(multicastPayload);

    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === "messaging/invalid-registration-token" ||
          errCode === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(validTokens[idx]);
        }
      }
    });

    // Remove invalid tokens if any
    if (invalidTokens.length > 0) {
      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { $in: invalidTokens } } }
      );
      console.log(`[FCM] Cleaned up ${invalidTokens.length} expired/invalid FCM token(s) for user ${userId}`);
    }

    console.log(`[FCM] Sent push notification to ${response.successCount}/${validTokens.length} token(s) for user ${userId}`);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error(`[FCM] Error sending push notification to user ${userId}:`, error?.message || error);
    return { success: false, error: error?.message || error };
  }
}
