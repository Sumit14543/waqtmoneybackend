import {
  handleReactAadhaarCallback,
  startReactAadhaarVerification,
} from "./reactAadhaar.controller.js";

const withLegacyAadhaarContext = (req) => {
  req.aadhaarCallbackPath = "/aadhaar/callback";
  req.aadhaarSuccessRedirectPath =
    process.env.AADHAAR_SUCCESS_REDIRECT_PATH ||
    process.env.LEGACY_AADHAAR_SUCCESS_REDIRECT_PATH ||
    "/user/company-details";
  req.aadhaarFailureRedirectPath =
    process.env.AADHAAR_FAILURE_REDIRECT_PATH ||
    process.env.LEGACY_AADHAAR_FAILURE_REDIRECT_PATH ||
    "/user/kyc-aadhaar";
};

export const saveAadhaarDetails = (req, res, next) => {
  withLegacyAadhaarContext(req);
  return startReactAadhaarVerification(req, res, next);
};

export const handleAadhaarCallback = (req, res, next) => {
  withLegacyAadhaarContext(req);
  return handleReactAadhaarCallback(req, res, next);
};
