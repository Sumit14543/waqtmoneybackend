import express from "express";
import { verifyPan, skipPanVerification, getCityByPincode } from "../controllers/pan.controller.js";
import { requireApplicationSession } from "../middleware/applicationSession.middleware.js";

const router = express.Router();

router.post("/verify", requireApplicationSession, verifyPan);
router.post("/skip", requireApplicationSession, skipPanVerification);
router.post("/pincode", getCityByPincode);

export default router;
