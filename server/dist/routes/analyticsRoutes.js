import express from "express";
import { protect } from "../middlewares/authMiddlewware.js";
import { addPostMetric, getAnalyticsOverview } from "../controllers/analyticsController.js";
const analyticsRouter = express.Router();
analyticsRouter.get("/overview", protect, getAnalyticsOverview);
analyticsRouter.post("/metrics", protect, addPostMetric);
export default analyticsRouter;
