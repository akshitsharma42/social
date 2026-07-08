import "dotenv/config";
import express from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import socialAuthRouter from "./routes/socialAuthRoutes.js";
import accountRouter from "./routes/accountRoutes.js";
import postRouter from "./routes/postRoutes.js";
import activityRouter from "./routes/activityRoutes.js";
import { initScheduler } from "./services/schedulerService.js";
const app = express();
const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = new Set([
    frontendUrl,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
].filter(Boolean));
// Database connection
await connectDB();
// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
}));
app.use(express.json());
const port = process.env.PORT || 3000;
app.get('/', (_req, res) => {
    res.send('Server is Live!');
});
app.use("/api/auth", authRouter);
app.use("/api/oauth", socialAuthRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/posts", postRouter);
app.use("/api/activity", activityRouter);
// Initialize Scheduler
initScheduler();
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).send(err?.response?.data?.message || err?.message);
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
