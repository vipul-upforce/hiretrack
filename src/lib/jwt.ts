import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";

const JWT_SECRET = "your_jwt_secret_key";

export const signToken = (payload: any) => {
  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    JWT_SECRET
  ).toString();
  return jwt.sign({ user: encryptedPayload }, JWT_SECRET, { expiresIn: "1d" });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
