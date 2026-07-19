import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const carSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  condition: {
    type: String,
    required: true,
  },
  carType: {
    type: String,
    required: true,
  },
  transmission: {
    type: String,
    required: true,
  },
  fuelType: {
    type: String,
    required: true,
  },
  seatingCapacity: {
    type: Number,
    required: true,
  },
  mileage: {
    type: Number,
    required: true,
  },
  rentalPricePerDay: {
    type: Number,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  maxTravelDistance: {
    type: String,
    default: "",
  },
  availabilityStatus: {
    type: String,
    enum: ["available", "booked", "unavailable"],
    default: "available",
  },
  description: {
    type: String,
    required: true,
  },
  tags: [String],
  details: {
    type: String,
    default: "",
  },
  driverOption: {
    type: String,
    enum: ["with-driver", "without-driver"],
    default: "without-driver",
  },
  whatsappContact: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  images: [imageSchema],
  isVerified: {
    type: Boolean,
    default: false,
  },
  datePosted: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const Car = mongoose.model("Car", carSchema);
const Image = mongoose.model("Image", imageSchema);

export { Car, Image };