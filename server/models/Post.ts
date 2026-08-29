import mongoose from "mongoose";

const platformResultSchema = new mongoose.Schema({
    platform: { type: String, required: true },
    accountId: { type: String },
    externalPostId: { type: String },
    status: { type: String, enum: ["pending", "published", "failed"], required: true },
    publishedAt: { type: Date },
    errorMessage: { type: String },
}, { _id: false });

const postSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    content: { type: String, required: true },
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ["image", "video"] },
    mediaFormat: { type: String, enum: ["feed_portrait", "square", "landscape", "reel", "story"] },
    platforms: [{ type: String, enum: ["twitter", "linkedin", "facebook", "instagram", "facebook_page", "linkedin_page", "instagram_business"] }],
    platformResults: { type: [platformResultSchema], default: [] },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ["draft", "scheduled", "published", "failed"], default: "scheduled" },
}, {timestamps: true})

export const Post = mongoose.model("Post", postSchema)