import express from "express";
import {
  crmLeadStatus,
  createDashboardRepaymentSession,
  dashboard,
  downloadSanctionLetter,
  login,
  logout,
  sendLoginOtp,
  signup,
  verifyLoginOtp,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/send-login-otp", sendLoginOtp);
router.post("/verify-login-otp", verifyLoginOtp);
router.get("/dashboard", dashboard);
router.post("/repayment-session", createDashboardRepaymentSession);
router.get("/crm-status/:loanId", crmLeadStatus);
router.get("/sanction-letter/:loanId", downloadSanctionLetter);

export default router;
