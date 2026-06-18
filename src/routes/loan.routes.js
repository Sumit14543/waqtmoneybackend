import express from "express";
import { addLoan } from "../controllers/loan.controller.js";

const router = express.Router();

router.post("/", addLoan);
router.post("/apply", addLoan);

export default router;
