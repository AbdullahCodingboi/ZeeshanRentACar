import express from "express";
import { Signup, Login, GetProfile, UpdateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", Signup);

// POST /api/auth/login
router.post("/login", Login);

// GET /api/auth/profile
router.get("/profile", protect, GetProfile);

// PUT /api/auth/profile
router.put("/profile", protect, UpdateProfile);

export default router;
