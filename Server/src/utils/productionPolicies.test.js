import assert from "node:assert/strict";
import test from "node:test";
import {
  applicationContactMatches,
  hasApplicationContactProof,
} from "./applicationRecoveryPolicy.js";
import { getTrustedHttpsOrigin } from "./originPolicy.js";

const application = {
  mobile: "919876543210",
  email: "Customer@Example.com",
  pan_number: "ABCDE1234F",
};

test("application recovery requires matching contact proof", () => {
  assert.equal(hasApplicationContactProof({}), false);
  assert.equal(applicationContactMatches(application, {}), false);
  assert.equal(applicationContactMatches(application, { mobile: "9876543210" }), true);
  assert.equal(applicationContactMatches(application, { email: "customer@example.com" }), true);
  assert.equal(applicationContactMatches(application, { pan: "abcde1234f" }), true);
  assert.equal(applicationContactMatches(application, { mobile: "9876543211" }), false);
});

test("payment origins require HTTPS and an exact allowlist match", () => {
  const allowed = ["https://waqtmoney.com", "https://www.waqtmoney.com"];
  assert.equal(getTrustedHttpsOrigin("https://waqtmoney.com/", allowed), "https://waqtmoney.com");
  assert.equal(getTrustedHttpsOrigin("https://evil.example", allowed), "");
  assert.equal(getTrustedHttpsOrigin("http://waqtmoney.com", allowed), "");
  assert.equal(getTrustedHttpsOrigin("https://waqtmoney.com.evil.example", allowed), "");
});