import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "JWT secret not configured" });
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub).select("_id name email role");
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
