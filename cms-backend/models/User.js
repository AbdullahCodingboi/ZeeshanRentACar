import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  whatsapp: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  },
  // Email verification
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    default: "",
  },
  verificationTokenExpires: {
    type: Date,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
