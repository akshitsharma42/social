import mongoose from "mongoose";

const postMetricSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    platform: { type: String, required: true },
    externalPostId: { type: String },
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    collectedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

export const PostMetric = mongoose.model("PostMetric", postMetricSchema);