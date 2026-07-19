import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  AdminGetAllCars,
  AdminGetPendingCars,
  AdminApproveCar,
  AdminRejectCar,
  AdminDeleteCar,
  AdminGetAllUsers,
  AdminDeleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require a valid JWT + isAdmin: true
router.use(protect, adminOnly);

// ── Car Management ──────────────────────────────────────────────────────────
// GET    /api/admin/cars              → list all cars (all statuses)
// GET    /api/admin/cars/pending      → list only unverified / pending cars
// PATCH  /api/admin/cars/:id/approve  → approve (isVerified = true)
// PATCH  /api/admin/cars/:id/reject   → reject / un-approve (isVerified = false)
// DELETE /api/admin/cars/:id          → hard-delete any car
router.get("/cars", AdminGetAllCars);
router.get("/cars/pending", AdminGetPendingCars);
router.patch("/cars/:id/approve", AdminApproveCar);
router.patch("/cars/:id/reject", AdminRejectCar);
router.delete("/cars/:id", AdminDeleteCar);

// ── User Management ─────────────────────────────────────────────────────────
// GET    /api/admin/users             → list all users
// DELETE /api/admin/users/:id         → delete user + all their cars
router.get("/users", AdminGetAllUsers);
router.delete("/users/:id", AdminDeleteUser);

export default router;
