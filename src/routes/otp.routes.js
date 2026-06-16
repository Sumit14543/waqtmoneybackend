import express from "express";
import { sendOTP, verifyOTP } from "../controllers/otp.controller.js";

const router = express.Router();

router.get("/send-otp", (req, res) => {
  res.status(405).json({
    success: false,
    message: "Use POST /api/otp/send-otp with JSON body: { \"email\": \"user@example.com\" }",
  });
});

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

export default router;
