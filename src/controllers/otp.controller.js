import { sendOTPService, verifyOTPService } from "../services/otp.service.js";
import { getApplicationById } from "../services/application.service.js";
import { createApplicationUploadToken } from "../middleware/applicationSession.middleware.js";

export const sendOTP = async (req, res, next) => {
  const { email, phone } = req.body;
  const isProduction = process.env.NODE_ENV === "production";

  try {
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: "Phone or email is required" });
    }

    const result = await sendOTPService({ email, phone });
    return res.status(200).json({ success: true, message: "OTP sent", data: result });
  } catch (err) {
    if (err.statusCode === 429) {
      return res.status(429).json({ success: false, message: err.message });
    }
    if (err.details) {
      const response = {
        success: false,
        message: err.message,
      };

      if (!isProduction) {
        response.details = err.details;
      }

      return res.status(err.statusCode || 500).json(response);
    }
    return next(err);
  }
};

const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const verifyOTP = async (req, res, next) => {
  const { email, phone, otp, applicationId, id } = req.body;

  if ((!email && !phone) || !otp) {
    return res.status(400).json({ success: false, message: "Phone/email and OTP are required" });
  }

  const result = verifyOTPService({ email, phone, otp });

  if (result === true) {
    const requestedApplicationId = String(applicationId || id || "").trim();
    const response = { success: true, message: "OTP Verified" };

    if (requestedApplicationId) {
      try {
        const application = await getApplicationById(requestedApplicationId);
        const mobileMatches =
          normalizeMobile(phone) &&
          normalizeMobile(application?.mobile) &&
          normalizeMobile(phone) === normalizeMobile(application.mobile);
        const emailMatches =
          normalizeEmail(email) &&
          normalizeEmail(application?.email) &&
          normalizeEmail(email) === normalizeEmail(application.email);

        if (application && (mobileMatches || emailMatches)) {
          response.applicationUploadToken = createApplicationUploadToken({
            applicationId: application.application_id || requestedApplicationId,
          });
        }
      } catch (error) {
        return next(error);
      }
    }

    return res.status(200).json(response);
  }

  if (result === "expired") {
    return res.status(400).json({ success: false, message: "OTP Expired" });
  }

  return res.status(400).json({ success: false, message: "Invalid OTP" });
};
