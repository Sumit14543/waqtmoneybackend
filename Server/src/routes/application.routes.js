import express from "express";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  requireApplicationSession,
  requireApplicationSessionOrMatchingContact,
} from "../middleware/applicationSession.middleware.js";
import {
  applyLoan,
  createRepaymentPaymentOrder,
  getApplicationUan,
  getIfscDetails,
  getApp,
  getRepaymentDetails,
  getRepaymentPaymentStatus,
  handleCashfreeRepaymentWebhook,
  recoverApplicationSession,
  sendRepaymentOtp,
  saveContactQuery,
  saveHeroLead,
  updateApp,
  updateBankDetailsApp,
  updateReferenceDetailsApp,
  updateWorkDetailsApp,
  verifyRepaymentOtp,
} from "../controllers/application.controller.js";

const router = express.Router();
const uploadDir = fileURLToPath(new URL("../../uploads/", import.meta.url));

fs.mkdirSync(uploadDir, { recursive: true });

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const allowedVideoMimeTypes = new Set([
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
]);
const mimeExtensionMap = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/mpeg": ".mpeg",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

const createUploadError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildSafeUploadFilename = (file) => {
  const originalExtension = path.extname(file.originalname || "").toLowerCase();
  const extension = mimeExtensionMap[file.mimetype] || originalExtension;
  const originalBase = path.basename(file.originalname || "upload", originalExtension);
  const safeBase = originalBase
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "upload";

  return `${Date.now()}-${crypto.randomUUID()}-${safeBase}${extension}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, buildSafeUploadFilename(file));
  },
});

const documentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
    files: 3,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedDocumentMimeTypes.has(file.mimetype)) {
      cb(createUploadError("Only PDF, JPG, PNG, or WEBP documents are allowed"));
      return;
    }

    cb(null, true);
  },
});

const videoUpload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedVideoMimeTypes.has(file.mimetype)) {
      cb(createUploadError("Only MP4, MPEG, MOV, or WEBM videos are allowed"));
      return;
    }

    cb(null, true);
  },
});

const documentColumnMap = {
  selfie_photo: "selfie_photo",
  current_salary_slip: "salary_slip_current",
};

const fallbackDocumentColumns = [
  "selfie_photo",
  "salary_slip_current",
];

router.post("/apply", applyLoan);
router.post("/lead", saveHeroLead);
router.post("/contact", saveContactQuery);
router.post("/repayment/send-otp", sendRepaymentOtp);
router.post("/repayment/verify-otp", verifyRepaymentOtp);
router.post("/repayment/create-payment-order", createRepaymentPaymentOrder);
router.get("/repayment/details/:id", getRepaymentDetails);
router.get("/repayment/payment-status/:orderId", getRepaymentPaymentStatus);
router.post("/repayment/cashfree-webhook", handleCashfreeRepaymentWebhook);
router.post("/recover-session", recoverApplicationSession);
router.get("/ifsc/:ifsc", getIfscDetails);
router.get("/uan/:id", requireApplicationSession, getApplicationUan);
router.get("/:id", requireApplicationSession, getApp);
router.put("/update", requireApplicationSession, updateApp);
router.put("/work-details", requireApplicationSession, updateWorkDetailsApp);
router.put("/bank-details", requireApplicationSession, updateBankDetailsApp);
router.put("/reference-details", requireApplicationSession, updateReferenceDetailsApp);

// Selfie verification plus one optional salary slip upload
router.post("/upload-docs", documentUpload.any(), requireApplicationSessionOrMatchingContact, (req, res, next) => {
  const parseDocumentTypes = () => {
    try {
      return JSON.parse(req.body.documentTypes || "[]");
    } catch {
      return [];
    }
  };

  if (req.files) {
    const documentTypes = parseDocumentTypes();

    req.files.forEach((file, index) => {
      const documentType = documentTypes[index] || {};
      const columnName =
        documentColumnMap[documentType.id] ||
        documentColumnMap[file.fieldname] ||
        fallbackDocumentColumns[index];

      if (columnName) {
        req.body[columnName] = `uploads/${file.filename}`;
      }
    });
  }

  delete req.body.documentTypes;
  req.body.current_step = req.body.current_step || "documents_uploaded";
  next();
}, updateApp);

router.post("/upload-video-kyc", videoUpload.single("video"), requireApplicationSessionOrMatchingContact, (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Video file is required",
    });
  }

  req.body.video_kyc = `uploads/${req.file.filename}`;
  req.body.current_step = "video_kyc_completed";
  next();
}, updateApp);

export default router;
