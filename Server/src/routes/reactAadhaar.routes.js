import express from "express";
import {
  completeReactAadhaarVerification,
  handleReactAadhaarCallback,
  skipReactAadhaarVerification,
  startReactAadhaarVerification,
} from "../controllers/reactAadhaar.controller.js";
import { requireApplicationSession } from "../middleware/applicationSession.middleware.js";

const router = express.Router();

router.post("/start", requireApplicationSession, startReactAadhaarVerification);
router.post("/complete", requireApplicationSession, completeReactAadhaarVerification);
router.post("/skip", requireApplicationSession, skipReactAadhaarVerification);
router.get("/callback", handleReactAadhaarCallback);
router.post("/callback", handleReactAadhaarCallback);

export default router;
