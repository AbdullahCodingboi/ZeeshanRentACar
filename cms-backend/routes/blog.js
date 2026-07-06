import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import {
  CreateBlog,
  GetAllBlog,
  GetBlog,
  UpdateBlog,
  DeleteBlog,
  GetMyCars,
  RequestRental,
  GetMyRentals,
  GetOwnerRequests,
  RespondRentalRequest,
  AddImage,
  DeleteImage,
} from "../controllers/blogController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", protect, upload.array("images", 3), CreateBlog);
router.get("/", GetAllBlog);
router.get("/my", protect, GetMyCars);
router.get("/requests", protect, GetOwnerRequests);
router.get("/rentals", protect, GetMyRentals);
router.post("/:id/rent", protect, RequestRental);
router.patch("/rentals/:id/respond", protect, RespondRentalRequest);
router.post("/:id/images", protect, upload.array("images", 3), AddImage);
router.delete("/:id/images/:imageId", protect, DeleteImage);
router.get("/:id", GetBlog);
router.put("/:id", protect, upload.array("images", 3), UpdateBlog);
router.delete("/:id", protect, DeleteBlog);

export default router;
