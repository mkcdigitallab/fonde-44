import { createHmac, timingSafeEqual } from "node:crypto";

const DEV_SECRET = "fonde44-development-order-tracking-secret";
let warned = false;

function getSecret() {
  if (process.env.ORDER_TRACKING_SECRET) return process.env.ORDER_TRACKING_SECRET;
  if (process.env.NODE_ENV === "production") {
    const error = new Error("ORDER_TRACKING_SECRET is required in production");
    error.code = "TRACKING_DISABLED";
    throw error;
  }
  if (!warned) {
    warned = true;
    console.warn("ORDER_TRACKING_SECRET absent: utilisation du secret de développement fixe.");
  }
  return DEV_SECRET;
}

function digest(publicId) {
  return createHmac("sha256", getSecret()).update(`track:${publicId}`).digest();
}

function toBase64Url(buffer) {
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function trackingToken(publicId) {
  return toBase64Url(digest(publicId));
}

export function verifyTrackingToken(publicId, token) {
  if (!/^FD-[A-Z0-9]{10}$/.test(String(publicId)) || !/^[A-Za-z0-9_-]{43}$/.test(String(token))) return false;
  const supplied = fromBase64Url(token);
  const expected = digest(publicId);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function isTrackingDisabled(error) {
  return error?.code === "TRACKING_DISABLED";
}
