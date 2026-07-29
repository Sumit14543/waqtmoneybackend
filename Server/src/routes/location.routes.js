import express from "express";
import { saveLocation } from "../controllers/location.controller.js";

const router = express.Router();

router.post("/save", saveLocation);

export default router;
