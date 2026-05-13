import express from "express";
import {
  dashboard,
  downloadSanctionLetter,
  login,
  signup,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/dashboard", dashboard);
router.get("/sanction-letter/:loanId", downloadSanctionLetter);

export default router;
