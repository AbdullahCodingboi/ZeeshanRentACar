import { Car } from "../models/Blogs.js";
import Rental from "../models/Rental.js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImagesToCloudinary = async (files) => {
  const uploaded = [];
  for (const file of files) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "car_listings" },
        (error, response) => {
          if (error) return reject(error);
          resolve(response);
        }
      );
      stream.end(file.buffer);
    });

    uploaded.push({
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  }
  return uploaded;
};

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

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const parseRange = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  const separators = ["-", ",", ":", "|"];
  for (const sep of separators) {
    if (normalized.includes(sep)) {
      const parts = normalized.split(sep).map((part) => parseNumber(part));
      if (parts.length === 2 && parts[0] !== null && parts[1] !== null) {
        return { min: Math.min(parts[0], parts[1]), max: Math.max(parts[0], parts[1]) };
      }
    }
  }
  return null;
};

const parseList = (value) => {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => String(item).split(",").map((v) => v.trim()).filter(Boolean));
  }
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
};

const buildCarFilters = (query) => {
  const filters = {};
  if (query.search) {
    const searchText = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [
      { brand: searchText },
      { model: searchText },
      { carType: searchText },
      { city: searchText },
      { description: searchText },
    ];
  }
 if (query.carType) filters.carType = new RegExp(`^${escapeRegex(query.carType)}$`, "i");
if (query.fuelType) filters.fuelType = new RegExp(`^${escapeRegex(query.fuelType)}$`, "i");
if (query.transmission) filters.transmission = new RegExp(`^${escapeRegex(query.transmission)}$`, "i");
if (query.condition) filters.condition = new RegExp(`^${escapeRegex(query.condition)}$`, "i");
if (query.driverOption) filters.driverOption = new RegExp(`^${escapeRegex(query.driverOption)}$`, "i");
  if (query.tags) {
    const tagArray = parseList(query.tags);
    if (tagArray.length) filters.tags = { $in: tagArray };
  }
  if (query.seatingCapacity) {
    const seats = parseNumber(query.seatingCapacity);
    if (seats !== null) filters.seatingCapacity = seats;
  }
  if (query.priceMin || query.priceMax || query.priceRange) {
    filters.rentalPricePerDay = {};

    if (query.priceRange) {
      const range = parseRange(query.priceRange);
      if (range) {
        filters.rentalPricePerDay.$gte = range.min;
        filters.rentalPricePerDay.$lte = range.max;
      }
    }

    if (parseNumber(query.priceMin) !== null) filters.rentalPricePerDay.$gte = parseNumber(query.priceMin);
    if (parseNumber(query.priceMax) !== null) filters.rentalPricePerDay.$lte = parseNumber(query.priceMax);

    if (Object.keys(filters.rentalPricePerDay).length === 0) {
      delete filters.rentalPricePerDay;
    }
  }

  // Always filter to verified cars for public-facing queries
  // Admin callers should use /api/admin/cars instead
  if (!query.showAll || query.showAll !== "true") {
    filters.availabilityStatus = filters.availabilityStatus || "available";
  }
  // Only show verified (admin-approved) posts to everyone via the public API
  filters.isVerified = true;

  return filters;
};

const sortMapping = {
  newest: "-createdAt",
  oldest: "createdAt",
  lowestPrice: "rentalPricePerDay",
  highestPrice: "-rentalPricePerDay",
  mileage: "mileage",
  year: "-year",
};

export const CreateBlog = async (req, res) => {
  try {
    const {
      brand,
      model,
      year,
      condition,
      carType,
      transmission,
      fuelType,
      seatingCapacity,
      mileage,
      rentalPricePerDay,
      city,
      maxTravelDistance,
      availabilityStatus,
      description,
      whatsappContact,
      tags,
      details,
      driverOption,
    } = req.body;

    const images = req.files || [];
    if (images.length < 2 || images.length > 3) {
      return res.status(400).json({ message: "Upload between 2 and 3 car images." });
    }

    const numericYear = parseNumber(year);
    const numericSeats = parseNumber(seatingCapacity);
    const numericMileage = parseNumber(mileage);
    const numericPrice = parseNumber(rentalPricePerDay);

    const missing = [];
    if (!brand) missing.push("brand");
    if (!model) missing.push("model");
    if (numericYear === null) missing.push("year");
    if (!condition) missing.push("condition");
    if (!carType) missing.push("carType");
    if (!transmission) missing.push("transmission");
    if (!fuelType) missing.push("fuelType");
    if (numericSeats === null) missing.push("seatingCapacity");
    if (numericMileage === null) missing.push("mileage");
    if (numericPrice === null) missing.push("rentalPricePerDay");
    if (!city) missing.push("city");
    if (!description) missing.push("description");
    if (!whatsappContact) missing.push("whatsappContact");

    if (missing.length) {
      return res.status(400).json({ message: "Missing required fields", missing });
    }

    const uploadedImages = await uploadImagesToCloudinary(images);
    const parsedTags = parseList(tags);
    const validatedDriverOption = ["with-driver", "without-driver"].includes(driverOption)
      ? driverOption
      : "without-driver";

    const car = await Car.create({
      brand,
      model,
      year: numericYear,
      condition,
      carType,
      transmission,
      fuelType,
      seatingCapacity: numericSeats,
      mileage: numericMileage,
      rentalPricePerDay: numericPrice,
      city,
      maxTravelDistance: maxTravelDistance || "",
      availabilityStatus: availabilityStatus || "available",
      description,
      tags: parsedTags,
      details: details || "",
      driverOption: validatedDriverOption,
      whatsappContact,
      owner: req.user.id,
      images: uploadedImages,
      isVerified: false, // requires admin approval before going public
      datePosted: new Date(),
    });

    res.status(201).json({ success: true, message: "Car listing created and pending admin approval.", car });
  } catch (err) {
    console.error("CreateCar error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const GetBlog = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id).populate("owner", "name email phone whatsapp city");
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }
    // Unverified cars are only visible to admins
    if (!car.isVerified && !(req.user && req.user.isAdmin)) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.json({ success: true, car });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const GetAllBlog = async (req, res) => {
  try {
    const page = parseNumber(req.query.page) || 1;
    const limit = Math.min(parseNumber(req.query.limit) || 12, 50);
    const filters = buildCarFilters(req.query);
    const sort = sortMapping[req.query.sort] || "-createdAt";

    const total = await Car.countDocuments(filters);
    const cars = await Car.find(filters)
      .populate("owner", "name email phone whatsapp city")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      cars,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const UpdateBlog = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: "Car listing not found" });
    }
    // Admins can update any car; regular users only their own
    if (!req.user.isAdmin && car.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this listing" });
    }

    const updates = {};
    const fields = [
      "brand",
      "model",
      "condition",
      "carType",
      "transmission",
      "fuelType",
      "city",
      "maxTravelDistance",
      "availabilityStatus",
      "description",
      "whatsappContact",
      "details",
      "driverOption",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const year = parseNumber(req.body.year);
    const seatingCapacity = parseNumber(req.body.seatingCapacity);
    const mileage = parseNumber(req.body.mileage);
    const rentalPricePerDay = parseNumber(req.body.rentalPricePerDay);
    const parsedTags = parseList(req.body.tags);

    if (year !== null) updates.year = year;
    if (seatingCapacity !== null) updates.seatingCapacity = seatingCapacity;
    if (mileage !== null) updates.mileage = mileage;
    if (rentalPricePerDay !== null) updates.rentalPricePerDay = rentalPricePerDay;
    if (parsedTags.length) updates.tags = parsedTags;

    if (req.body.driverOption && ["with-driver", "without-driver"].includes(req.body.driverOption)) {
      updates.driverOption = req.body.driverOption;
    }

    if (req.files && req.files.length) {
      if (req.files.length < 2 || req.files.length > 3) {
        return res.status(400).json({ message: "Upload between 2 and 3 car images." });
      }
      await deleteCloudinaryImages(car.images);
      updates.images = await uploadImagesToCloudinary(req.files);
    }

    Object.assign(car, updates);
    await car.save();

    res.json({ success: true, car });
  } catch (err) {
    console.error("UpdateCar error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const DeleteBlog = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: "Car listing not found" });
    }
    // Admins can delete any car; regular users only their own
    if (!req.user.isAdmin && car.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this listing" });
    }

    await deleteCloudinaryImages(car.images);
    await car.deleteOne();

    res.json({ success: true, message: "Car listing deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const GetMyCars = async (req, res) => {
  try {
    const cars = await Car.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const AddImage = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: "Car listing not found" });
    }
    if (car.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update images for this listing" });
    }

    const images = req.files || [];
    if (images.length < 2 || images.length > 3) {
      return res.status(400).json({ message: "Upload between 2 and 3 car images." });
    }
    if (car.images.length + images.length > 3) {
      return res.status(400).json({ message: "A listing may contain a maximum of 3 images." });
    }

    const uploadedImages = await uploadImagesToCloudinary(images);
    car.images = car.images.concat(uploadedImages);
    await car.save();

    res.status(201).json({ success: true, images: car.images });
  } catch (err) {
    console.error("AddImage error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const DeleteImage = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: "Car listing not found" });
    }
    if (car.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to manage images for this listing" });
    }

    const imageId = req.params.imageId;
    const image = car.images.id(imageId);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    await cloudinary.uploader.destroy(image.publicId);
    image.remove();
    await car.save();

    res.json({ success: true, images: car.images });
  } catch (err) {
    console.error("DeleteImage error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const RequestRental = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: "Car listing not found" });
    }
    if (car.owner.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot rent your own car" });
    }
    if (car.availabilityStatus !== "available") {
      return res.status(400).json({ message: "Car is not currently available for rent" });
    }

    const { startDate, endDate, message } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: "Invalid rental dates" });
    }

    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const totalPrice = days * car.rentalPricePerDay;

    const rental = await Rental.create({
      car: car._id,
      renter: req.user.id,
      owner: car.owner,
      startDate: start,
      endDate: end,
      totalPrice,
      message: message || "",
    });

    res.status(201).json({ success: true, rental });
  } catch (err) {
    console.error("RequestRental error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const GetMyRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ renter: req.user.id })
      .populate("car", "brand model year city rentalPricePerDay availabilityStatus")
      .populate("owner", "name email phone whatsapp city")
      .sort({ createdAt: -1 });

    res.json({ success: true, rentals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const GetOwnerRequests = async (req, res) => {
  try {
    const filters = { owner: req.user.id };
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const requests = await Rental.find(filters)
      .populate("car", "brand model year city rentalPricePerDay availabilityStatus")
      .populate("renter", "name email phone whatsapp city")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const RespondRentalRequest = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental request not found" });
    }
    if (rental.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to respond to this request" });
    }
    if (rental.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be updated" });
    }

    const { action } = req.body;
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'accept' or 'reject'" });
    }

    rental.status = action === "accept" ? "accepted" : "rejected";
    await rental.save();

    if (action === "accept") {
      await Car.findByIdAndUpdate(rental.car, { availabilityStatus: "booked" });
    }

    res.json({ success: true, rental });
  } catch (err) {
    console.error("RespondRentalRequest error:", err);
    res.status(500).json({ error: err.message });
  }
};
