import { BarChart3Icon, CheckCircleIcon, EyeIcon, HeartIcon, MessageCircleIcon, Share2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

type AnalyticsData = {
  range: string;
  publishedPosts: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement: number;
  engagementRate: number;
  hasMetrics: boolean;
  platforms: Array<{ platform: string; posts: number; engagement: number; engagementRate: number }>;
  topPosts: Array<{ _id: string; content: string; platforms: string[]; publishedAt: string; engagement: number }>;
};

const emptyData: AnalyticsData = {
  range: "30d", publishedPosts: 0, impressions: 0, reach: 0, likes: 0, comments: 0,
  shares: 0, clicks: 0, engagement: 0, engagementRate: 0, hasMetrics: false, platforms: [], topPosts: [],
};

const formatNumber = (value: number) => new Intl.NumberFormat("en", { notation: value > 9999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);

export default function Analytics() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<AnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/analytics/overview?range=${range}`);
        setData(response.data);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [range]);

  const cards = [
    { label: "Published posts", value: data.publishedPosts, icon: CheckCircleIcon },
    { label: "Impressions", value: data.impressions, icon: EyeIcon },
    { label: "Engagement", value: data.engagement, icon: HeartIcon },
    { label: "Engagement rate", value: `${data.engagementRate}%`, icon: BarChart3Icon },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900">Performance overview</h2>
          <p className="text-slate-500 text-sm mt-1">Track published content and audience response.</p>
        </div>
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-lg">
          {["7d", "30d", "90d"].map((option) => (
            <button key={option} onClick={() => setRange(option)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${range === option ? "bg-red-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {option.replace("d", " days")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-slate-500">{card.label}</span>
              <card.icon className="size-4 text-red-500" />
            </div>
            <div className="text-3xl text-slate-900 tabular-nums">{loading ? "-" : typeof card.value === "number" ? formatNumber(card.value) : card.value}</div>
          </div>
        ))}
      </div>

      {!data.hasMetrics && !loading && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-700">
          Engagement metrics will appear here after a connected platform provides analytics data. Publishing totals below are live from your scheduled posts.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Share2Icon className="size-4 text-slate-500" />
            <h3 className="text-slate-900">Platform breakdown</h3>
          </div>
          <div className="p-6 space-y-4">
            {data.platforms.length === 0 ? <p className="text-sm text-slate-400">No published posts in this period.</p> : data.platforms.map((item) => (
              <div key={item.platform}>
                <div className="flex justify-between text-sm mb-2"><span className="capitalize text-slate-700">{item.platform}</span><span className="text-slate-400">{item.posts} posts · {formatNumber(item.engagement)} engagements</span></div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(item.posts * 12, 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <MessageCircleIcon className="size-4 text-slate-500" />
            <h3 className="text-slate-900">Metric summary</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-5">
            {[{ label: "Reach", value: data.reach }, { label: "Likes", value: data.likes }, { label: "Comments", value: data.comments }, { label: "Shares", value: data.shares }, { label: "Clicks", value: data.clicks }].map((item) => <div key={item.label}><p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p><p className="text-xl text-slate-800 mt-1">{formatNumber(item.value)}</p></div>)}
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2"><BarChart3Icon className="size-4 text-slate-500" /><h3 className="text-slate-900">Top published posts</h3></div>
        {data.topPosts.length === 0 ? <p className="p-6 text-sm text-slate-400">No published posts in this period.</p> : <div className="divide-y divide-slate-100">{data.topPosts.map((post) => <div key={post._id} className="px-6 py-4 flex items-start gap-4"><div className="flex-1 min-w-0"><p className="text-sm text-slate-700 line-clamp-2">{post.content}</p><p className="text-xs text-slate-400 mt-2 capitalize">{post.platforms.join(" · ")} · {new Date(post.publishedAt).toLocaleDateString()}</p></div><span className="text-sm font-medium text-slate-600 shrink-0">{formatNumber(post.engagement)} engagement</span></div>)}</div>}
      </section>
    </div>
  );
}
