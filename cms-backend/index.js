import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import blogRoutes from './routes/blog.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import cors from "cors";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/cars", blogRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
