import { createServer } from '@vercel/node';
import app from '../cms-backend/api/index.js';

export default createServer(app);
