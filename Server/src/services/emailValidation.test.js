import test from "node:test";
import assert from "node:assert/strict";
import dns from "node:dns";
import { validateOfficialEmail } from "./emailValidation.service.js";

test("Rejects personal email providers", async () => {
  const personalEmails = [
    "test@gmail.com",
    "test@yahoo.com",
    "test@outlook.com",
    "test@hotmail.com",
    "test@live.com",
    "test@icloud.com",
    "test@protonmail.com",
  ];

  for (const email of personalEmails) {
    const result = await validateOfficialEmail(email);
    assert.equal(result.valid, false, `Expected ${email} to be invalid`);
    assert.equal(result.type, "personal");
    assert.equal(result.is_personal, true);
    assert.ok(result.reason.includes("Personal email providers are not allowed"));
  }
});

test("Rejects disposable email providers", async () => {
  const disposableEmails = [
    "user@10minutemail.com",
    "user@tempmail.com",
    "user@mailinator.com",
    "user@guerrillamail.com",
  ];

  for (const email of disposableEmails) {
    const result = await validateOfficialEmail(email);
    assert.equal(result.valid, false, `Expected ${email} to be invalid`);
    assert.equal(result.type, "disposable");
    assert.equal(result.is_disposable, true);
    assert.ok(result.reason.includes("Disposable/temporary emails are not allowed"));
  }
});

test("Rejects invalid email format and nonexistent MX domain", async (t) => {
  t.mock.method(dns.promises, "resolveMx", async (domain) => {
    if (domain === "nonexistentdomain123456.com") {
      const err = new Error("queryMx ENOTFOUND nonexistentdomain123456.com");
      err.code = "ENOTFOUND";
      throw err;
    }
    return [{ exchange: "mail.example.com", priority: 10 }];
  });

  const invalidEmails = [
    "employee@",
    "@company.com",
    "employee",
    "employee@nonexistentdomain123456.com",
  ];

  for (const email of invalidEmails) {
    const result = await validateOfficialEmail(email);
    assert.equal(result.valid, false, `Expected ${email} to be invalid`);
    assert.equal(result.is_personal, false);
    assert.equal(result.is_disposable, false);
  }
});

test("Accepts legitimate company email domain with valid MX records", async (t) => {
  t.mock.method(dns.promises, "resolveMx", async (domain) => {
    return [{ exchange: `mail.${domain}`, priority: 10 }];
  });

  const validBusinessEmails = [
    "employee@tcs.com",
    "employee@microsoft.com",
    "employee@google.com",
  ];

  for (const email of validBusinessEmails) {
    const result = await validateOfficialEmail(email);
    assert.equal(result.valid, true, `Expected ${email} to be valid`);
    assert.equal(result.type, "business");
    assert.equal(result.mx_valid, true);
    assert.equal(result.is_personal, false);
    assert.equal(result.is_disposable, false);
  }
});

