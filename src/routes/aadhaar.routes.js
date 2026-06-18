import express from "express";
import {
  handleAadhaarCallback,
  saveAadhaarDetails,
} from "../controllers/aadhaar.controller.js";
import { requireApplicationSession } from "../middleware/applicationSession.middleware.js";

const router = express.Router();

router.post("/save", requireApplicationSession, saveAadhaarDetails);
router.get("/callback", handleAadhaarCallback);

export default router;
