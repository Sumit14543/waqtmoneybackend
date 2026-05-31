import express from "express";
import {
  completeReactAadhaarVerification,
  handleReactAadhaarCallback,
  skipReactAadhaarVerification,
  startReactAadhaarVerification,
} from "../controllers/reactAadhaar.controller.js";

const router = express.Router();

router.post("/start", startReactAadhaarVerification);
router.post("/complete", completeReactAadhaarVerification);
router.post("/skip", skipReactAadhaarVerification);
router.get("/callback", handleReactAadhaarCallback);
router.post("/callback", handleReactAadhaarCallback);

export default router;
