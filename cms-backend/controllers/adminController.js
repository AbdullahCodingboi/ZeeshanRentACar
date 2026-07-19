import { Car } from "../models/Blogs.js";
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteCloudinaryImages = async (images) => {
  if (!images || !images.length) return;
  for (const image of images) {
    if (!image.publicId) continue;
    try {
      await cloudinary.uploader.destroy(image.publicId);
    } catch (error) {
      console.error("Cloudinary delete error for image", image.publicId, error.message);
    }
  }
};

// ─── Cars ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/cars
 * Returns ALL car listings (verified and unverified) for the admin dashboard.
 */
export const AdminGetAllCars = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filter = {};

    // Filter by verification status: ?verified=true | false | (omit = all)
    if (req.query.verified !== undefined) {
      filter.isVerified = req.query.verified === "true";
    }

    const total = await Car.countDocuments(filter);
    const cars = await Car.find(filter)
      .populate("owner", "name email phone city isAdmin")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit), cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/admin/cars/pending
 * Returns ONLY unverified (pending approval) car listings.
 */
export const AdminGetPendingCars = async (req, res) => {
  try {
    const cars = await Car.find({ isVerified: false })
      .populate("owner", "name email phone city")
      .sort({ createdAt: -1 });

    res.json({ success: true, total: cars.length, cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/admin/cars/:id/approve
 * Sets isVerified = true, making the listing publicly visible.
 */
export const AdminApproveCar = async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    ).populate("owner", "name email");

    if (!car) return res.status(404).json({ message: "Car not found" });

    res.json({ success: true, message: "Car approved and is now publicly visible.", car });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /api/admin/cars/:id/reject
 * Sets isVerified back to false (or can be used to un-approve a car).
 */
export const AdminRejectCar = async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { isVerified: false },
      { new: true }
    ).populate("owner", "name email");

    if (!car) return res.status(404).json({ message: "Car not found" });

    res.json({ success: true, message: "Car rejected and hidden from public.", car });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/admin/cars/:id
 * Admin can delete ANY car listing (cleans up Cloudinary images too).
 */
export const AdminDeleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ message: "Car not found" });

    await deleteCloudinaryImages(car.images);
    await car.deleteOne();

    res.json({ success: true, message: "Car listing deleted by admin." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Users ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Returns all registered users.
 */
export const AdminGetAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const total = await User.countDocuments();
    const users = await User.find()
      .select("-password -verificationToken -verificationTokenExpires")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit), users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Admin can delete any user account AND all their car listings (and images).
 */
export const AdminDeleteUser = async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete all cars owned by this user + their Cloudinary images
    const cars = await Car.find({ owner: req.params.id });
    for (const car of cars) {
      await deleteCloudinaryImages(car.images);
      await car.deleteOne();
    }

    await user.deleteOne();

    res.json({ success: true, message: `User "${user.name}" and all their listings have been deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
