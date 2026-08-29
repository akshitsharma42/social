import { Post } from "../models/Post.js";
import { PostMetric } from "../models/PostMetric.js";
const getStartDate = (range) => {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
};
export const getAnalyticsOverview = async (req, res) => {
    try {
        const range = typeof req.query.range === "string" ? req.query.range : "30d";
        const startDate = getStartDate(range);
        const userId = req.user._id;
        const [posts, metrics] = await Promise.all([
            Post.find({ user: userId, status: "published", updatedAt: { $gte: startDate } })
                .sort({ updatedAt: -1 }).limit(100),
            PostMetric.find({ user: userId, collectedAt: { $gte: startDate } }).sort({ collectedAt: -1 }),
        ]);
        const latestMetrics = new Map();
        for (const metric of metrics) {
            const key = `${metric.post.toString()}:${metric.platform}`;
            if (!latestMetrics.has(key))
                latestMetrics.set(key, metric);
        }
        const platformMap = new Map();
        let impressions = 0, reach = 0, likes = 0, comments = 0, shares = 0, clicks = 0;
        const topPosts = posts.map((post) => {
            const postMetrics = post.platforms.map((platform) => latestMetrics.get(`${post._id.toString()}:${platform}`)).filter(Boolean);
            const totals = postMetrics.reduce((sum, metric) => ({
                impressions: sum.impressions + metric.impressions,
                reach: sum.reach + metric.reach,
                engagement: sum.engagement + metric.likes + metric.comments + metric.shares + metric.clicks,
            }), { impressions: 0, reach: 0, engagement: 0 });
            for (const platform of post.platforms) {
                const current = platformMap.get(platform) || { posts: 0, impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
                current.posts += 1;
                const metric = latestMetrics.get(`${post._id.toString()}:${platform}`);
                if (metric) {
                    current.impressions += metric.impressions;
                    current.reach += metric.reach;
                    current.likes += metric.likes;
                    current.comments += metric.comments;
                    current.shares += metric.shares;
                    current.clicks += metric.clicks;
                }
                platformMap.set(platform, current);
            }
            impressions += totals.impressions;
            reach += totals.reach;
            const metricEngagement = postMetrics.reduce((sum, metric) => sum + metric.likes + metric.comments + metric.shares + metric.clicks, 0);
            likes += postMetrics.reduce((sum, metric) => sum + metric.likes, 0);
            comments += postMetrics.reduce((sum, metric) => sum + metric.comments, 0);
            shares += postMetrics.reduce((sum, metric) => sum + metric.shares, 0);
            clicks += postMetrics.reduce((sum, metric) => sum + metric.clicks, 0);
            return { _id: post._id, content: post.content, platforms: post.platforms, publishedAt: post.updatedAt, ...totals, engagement: metricEngagement };
        }).sort((a, b) => b.engagement - a.engagement).slice(0, 10);
        const engagement = likes + comments + shares + clicks;
        res.json({
            range, publishedPosts: posts.length, impressions, reach, likes, comments, shares, clicks,
            engagement, engagementRate: reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0,
            hasMetrics: metrics.length > 0,
            platforms: Array.from(platformMap, ([platform, values]) => ({ platform, ...values, engagement: values.likes + values.comments + values.shares + values.clicks, engagementRate: values.reach > 0 ? Number(((values.likes + values.comments + values.shares + values.clicks) / values.reach * 100).toFixed(2)) : 0 })),
            topPosts,
        });
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Failed to load analytics" });
    }
};
export const addPostMetric = async (req, res) => {
    try {
        const { post, platform, externalPostId, impressions, reach, likes, comments, shares, clicks, collectedAt } = req.body;
        const ownedPost = await Post.findOne({ _id: post, user: req.user._id });
        if (!ownedPost) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        const metric = await PostMetric.create({ user: req.user._id, post, platform, externalPostId, impressions, reach, likes, comments, shares, clicks, collectedAt });
        res.status(201).json(metric);
    }
    catch (error) {
        res.status(400).json({ message: error?.message || "Invalid metric data" });
    }
};
