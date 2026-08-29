import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";
const platformCharacterLimits = {
    twitter: 280,
    linkedin: 3000,
    facebook: 5000,
    instagram: 2200,
};
const mediaTransformations = {
    feed_portrait: { width: 1080, height: 1350 },
    square: { width: 1080, height: 1080 },
    landscape: { width: 1080, height: 566 },
    reel: { width: 1080, height: 1920 },
    story: { width: 1080, height: 1920 },
};
const validMediaFormats = Object.keys(mediaTransformations);
// Helper to poll Leonardo.ai
const pollLeonardoJob = async (generationId, apiKey) => {
    const maxRetries = 20;
    const delay = 5000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await axios.get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, { headers: {
                    accept: "application/json", authorization: `Bearer ${apiKey}`
                } });
            const generation = response.data.generations_by_pk;
            if (generation.status === "COMPLETE") {
                if (generation.generated_images && generation.generated_images.length > 0) {
                    return generation.generated_images[0].url;
                }
                throw new Error("Generation complete but no images found.");
            }
            if (generation.status === "FAILED") {
                throw new Error("Leonardo.ai generation failed.");
            }
        }
        catch (err) {
            console.error("Polling error:", err?.response?.data || err.message);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error("Leonardo.ai generation timed out.");
};
// Generate post
// POST /api/posts/generate
export const generatePost = async (req, res) => {
    try {
        const { prompt, tone, generateImage } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            res.status(400).json({ message: "Gemini API Key is missing. Please add it to your server/.env file." });
            return;
        }
        const ai = new GoogleGenAI({ apiKey });
        // Generate Text
        const textResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a social media post based on this prompt: "${prompt}". 
            Tone: ${tone}. 
            Include relevant hashtags.
            Format the response as JSON with "content" and "imagePrompt" fields. 
            The "imagePrompt" should be a highly descriptive prompt for an image generator that complements the post.`,
        });
        let content = "";
        let imagePrompt = prompt;
        try {
            const rawText = textResponse.text || "";
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: rawText, imagePrompt: prompt };
            content = data.content;
            imagePrompt = data.imagePrompt;
        }
        catch (e) {
            content = textResponse.text || "";
        }
        let mediaUrl = "";
        if (generateImage) {
            try {
                const leonardoKey = process.env.LEONARDO_API_KEY;
                if (leonardoKey) {
                    // Use Leonardo.ai for image generation
                    const leoResponse = await axios.post("https://cloud.leonardo.ai/api/rest/v2/generations", {
                        "public": false,
                        "model": "gpt-image-2",
                        "parameters": {
                            "quality": "LOW",
                            "prompt": imagePrompt,
                            "quantity": 1,
                            "width": 1024,
                            "height": 1024,
                            "prompt_enhance": "OFF"
                        }
                    }, {
                        headers: {
                            accept: "application/json",
                            authorization: `Bearer ${leonardoKey}`,
                            "content-type": "application/json",
                        }
                    });
                    const generationId = leoResponse.data.generate.generationId;
                    const tempUrl = await pollLeonardoJob(generationId, leonardoKey);
                    // Upload to Cloudinary for persistence
                    const uploadResult = await cloudinary.uploader.upload(tempUrl, {
                        folder: "ai-generations",
                    });
                    mediaUrl = uploadResult.secure_url;
                }
            }
            catch (err) {
                console.error("Image generation failed:", err);
            }
        }
        // Save generation to DB
        const generation = await Generation.create({
            user: req.user._id,
            prompt,
            content,
            mediaUrl,
            mediaType: mediaUrl ? "image" : undefined,
            tone
        });
        res.json(generation);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
};
// Get generations
// GET /api/posts/generations
export const getGenerations = async (req, res) => {
    try {
        const generations = await Generation.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(generations);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
};
// Get posts
// GET /api/posts
export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find({ user: req.user._id });
        res.json(posts);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
};
// Schedule post
// POST /api/posts
export const schedulePost = async (req, res) => {
    try {
        const { content, platforms, scheduledFor, status } = req.body;
        // Parse platforms if it comes as a stringified array from FormData
        let parsedPlatforms = platforms;
        if (typeof platforms === "string") {
            try {
                parsedPlatforms = JSON.parse(platforms);
            }
            catch (e) {
                parsedPlatforms = platforms.split(",");
            }
        }
        if (!Array.isArray(parsedPlatforms) || parsedPlatforms.length === 0) {
            res.status(400).json({ message: "Select at least one platform" });
            return;
        }
        const maxCharacters = Math.min(...parsedPlatforms.map((platform) => platformCharacterLimits[platform] || 5000));
        if (typeof content !== "string" || content.trim().length === 0) {
            res.status(400).json({ message: "Post content is required" });
            return;
        }
        if (content.length > maxCharacters) {
            res.status(400).json({ message: `Content exceeds the ${maxCharacters}-character limit for the selected platforms` });
            return;
        }
        const mediaFormat = req.body.mediaFormat || undefined;
        if (mediaFormat && !validMediaFormats.includes(mediaFormat)) {
            res.status(400).json({ message: "Invalid media format" });
            return;
        }
        if (parsedPlatforms.includes("instagram") && !req.file && !req.body.mediaUrl) {
            res.status(400).json({ message: "Instagram posts require an image or video" });
            return;
        }
        if (parsedPlatforms.includes("instagram") && !mediaFormat) {
            res.status(400).json({ message: "Select an Instagram media format" });
            return;
        }
        let mediaUrl = req.body.mediaUrl;
        let mediaType = req.body.mediaType;
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "social-scheduler" }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                });
                stream.end(req.file.buffer);
            });
            mediaUrl = result.secure_url;
            mediaType = result.resource_type === "video" ? "video" : "image";
            if (mediaType === "image" && mediaFormat) {
                const dimensions = mediaTransformations[mediaFormat];
                mediaUrl = cloudinary.url(result.public_id, {
                    secure: true,
                    transformation: [{
                            width: dimensions.width,
                            height: dimensions.height,
                            crop: "fill",
                            gravity: "auto",
                        }],
                });
            }
        }
        const post = await Post.create({
            user: req.user._id,
            content,
            platforms: parsedPlatforms,
            mediaUrl,
            mediaType,
            mediaFormat,
            scheduledFor,
            status,
        });
        res.status(201).json(post);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
};
