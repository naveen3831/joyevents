import dotenv from "dotenv";
import path from "path";
dotenv.config();

import { sendMerchantCredentials } from "./src/utils/sendEmail.js";

async function main() {
  console.log("Testing SMTP config...");
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  
  const res = await sendMerchantCredentials({
    name: "Test Merchant",
    email: "naveenkumar970100@gmail.com",
    password: "TestPassword123!"
  });
  console.log("Send result:", res);
}

main().catch(err => console.error("Unhandled error:", err));
