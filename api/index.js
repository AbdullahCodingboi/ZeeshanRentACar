import { createServer } from '@vercel/node';
import app from "../cms-backend/index.js";

export default createServer(app);
