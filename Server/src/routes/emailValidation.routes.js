import express from "express";
import { validateOfficialEmailController } from "../controllers/emailValidation.controller.js";

const router = express.Router();

router.post("/validate-official", validateOfficialEmailController);

export default router;
