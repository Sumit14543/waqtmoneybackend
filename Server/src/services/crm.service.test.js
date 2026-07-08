import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { decryptAadhaarNumber } from "./crm.service.js";
import { getAppSecret } from "../configs/secrets.js";

const encryptAadhaar = (value) => {
  const secret = getAppSecret();
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.createHash("sha256").update(secret).digest("hex").slice(0, 16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return encrypted.toString("base64");
};

test("decryptAadhaarNumber decrypts encrypted aadhaar correctly", () => {
  const plainAadhaar = "123456789012";
  const encrypted = encryptAadhaar(plainAadhaar);
  
  assert.notEqual(encrypted, plainAadhaar);
  
  const decrypted = decryptAadhaarNumber(encrypted);
  assert.equal(decrypted, plainAadhaar);
});

test("decryptAadhaarNumber passes through plain 12-digit aadhaar numbers", () => {
  const plainAadhaar = "987654321012";
  const result = decryptAadhaarNumber(plainAadhaar);
  assert.equal(result, plainAadhaar);
});

test("decryptAadhaarNumber returns empty string for invalid aadhaar format", () => {
  assert.equal(decryptAadhaarNumber(""), "");
  assert.equal(decryptAadhaarNumber("123"), "");
  assert.equal(decryptAadhaarNumber("abcdefghijkl"), "");
  assert.equal(decryptAadhaarNumber(null), "");
});
