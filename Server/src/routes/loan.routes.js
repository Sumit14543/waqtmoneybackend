import express from "express";
import { addLoan } from "../controllers/loan.controller.js";
import { requireApplicationSession } from "../middleware/applicationSession.middleware.js";

const router = express.Router();

router.post("/", requireApplicationSession, addLoan);
router.post("/apply", requireApplicationSession, addLoan);

export default router;
