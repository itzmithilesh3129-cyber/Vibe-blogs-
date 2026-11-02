import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  PenSquare,
  Edit3,
  Trash2,
  ExternalLink,
  Shield,
  Award,
} from 'lucide-react';
import { api } from '../lib/api';
import type {
  Article,
  ArticleStatus,
  BloggerDashboardData,
  IndividualArticleAnalytics,
  UserProfile,
} from '../types';

interface BloggerDashboardViewProps {
  currentUser: UserProfile;
  onWriteNew: () => void;
  onEditArticleById: (articleId: string) => void;
  onViewArticle: (articleId: string) => void;
  onOpenProfileModal: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function formatStatusLabel(status: ArticleStatus): {
  label: string;
  colorClass: string;
} {
  switch (status) {
    case 'published':
      return { label: 'Published', colorClass: 'text-emerald-700 font-semibold' };
    case 'pending_review':
      return { label: 'Pending Review', colorClass: 'text-amber-700 font-semibold' };
    case 'rejected':
      return { label: 'Rejected', colorClass: 'text-red-700 font-semibold' };
    default:
      return { label: 'Draft', colorClass: 'text-slate-600 font-medium' };
  }
}

export const BloggerDashboardView: React.FC<BloggerDashboardViewProps> = ({
  currentUser,
  onWriteNew,
  onEditArticleById,
  onViewArticle,
  onOpenProfileModal,
}) => {
  const [data, setData] = useState<BloggerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getBloggerDashboard();
      setData(res);
      if (res.articlesAnalytics.length > 0 && !selectedArticleId) {
        const firstPublished =
          res.articlesAnalytics.find((a) => a.status === 'published') ||
          res.articlesAnalytics[0];
        setSelectedArticleId(firstPublished.articleId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleDelete = async (articleId: string) => {
    try {
      await api.deleteArticle(articleId);
      setConfirmDeleteId(null);
      if (selectedArticleId === articleId) {
        setSelectedArticleId(null);
      }
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600 mb-4">{error || 'Dashboard unavailable.'}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const activeSeries =
    timeframe === 'daily'
      ? data.dailyChart
      : timeframe === 'weekly'
      ? data.weeklyChart
      : data.monthlyChart;

  const selectedArticle: IndividualArticleAnalytics | null =
    data.articlesAnalytics.find((a) => a.articleId === selectedArticleId) ||
    data.articlesAnalytics[0] ||
    null;

  const filteredArticles = data.articlesAnalytics.filter((a) =>
    statusFilter === 'all' ? true : a.status === statusFilter
  );

  const storageMbUsed = (data.summary.storageUsedBytes / (1024 * 1024)).toFixed(2);
  const storageMbLimit = (data.summary.storageLimitBytes / (1024 * 1024)).toFixed(0);
  const storagePct = Math.min(
    100,
    Math.round((data.summary.storageUsedBytes / data.summary.storageLimitBytes) * 100)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-blue-600 mb-1">
            Author Analytics Studio · Private to {currentUser.name}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Blogger Performance Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:border-slate-900 transition-colors whitespace-nowrap"
          >
            Edit Author Profile
          </button>
          <button
            type="button"
            onClick={onWriteNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <PenSquare className="w-3.5 h-3.5" />
            <span>Write New Article</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid (All Tabular Numerals) */}
      <section aria-label="Key author metrics">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white overflow-hidden">
          <div className="p-4">
            <div className="text-xs text-slate-500 mb-1">Total Views</div>
            <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {data.summary.totalViews.toLocaleString()}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500 mb-1">Unique Visitors</div>
            <div className="font-mono tabular-nums text-2xl font-semibold text-blue-600">
              {data.summary.uniqueVisitors.toLocaleString()}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500 mb-1">Published Posts</div>
            <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {data.summary.publishedArticles}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500 mb-1">Comments</div>
            <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {data.summary.totalComments.toLocaleString()}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500 mb-1">Total Likes</div>
            <div className="font-mono tabular-nums text-2xl font-semibold text-violet-600">
              {data.summary.totalLikes.toLocaleString()}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500 mb-1">Total Shares</div>
            <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {data.summary.totalShares.toLocaleString()}
            </div>
          </div>
          <div className="p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-500 mb-1">Avg. Read Time</div>
            <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {formatDuration(data.summary.avgReadingSeconds)}
            </div>
          </div>
        </div>
      </section>

      {/* Most Popular Article Spotlight + Free-Tier Quota Bar */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {data.mostPopularArticle ? (
            <>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 mb-1">
                  <Award className="w-4 h-4" />
                  <span>Most Popular Article</span>
                </div>
                <h2 className="font-serif text-xl font-semibold text-slate-900 mb-1">
                  {data.mostPopularArticle.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
                  <span>{data.mostPopularArticle.totalViews} views</span>
                  <span aria-hidden="true">·</span>
                  <span>{data.mostPopularArticle.uniqueVisitors} unique visitors</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {formatDuration(data.mostPopularArticle.avgReadingSeconds)} avg read
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{data.mostPopularArticle.scrollEngagement.pct100}% full completion</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedArticleId(data.mostPopularArticle!.articleId)
                }
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white rounded-lg text-slate-800 hover:border-blue-600 hover:text-blue-600 transition-colors whitespace-nowrap self-start sm:self-center"
              >
                Inspect Article Stats
              </button>
            </>
          ) : (
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                No published articles yet
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Publish your first post to begin collecting real-time anonymous reader telemetry.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 p-6 border border-slate-200 rounded-xl bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-800">
                Free-Tier Author Storage
              </span>
              <span className="font-mono tabular-nums text-slate-600">
                {storageMbUsed} MB / {storageMbLimit} MB
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${Math.max(2, storagePct)}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            Unlimited drafts & published articles included free. Client-side JPEG compression keeps cover photos ~95 KB.
          </p>
        </div>
      </section>

      {/* Daily, Weekly, and Monthly Performance Charts */}
      <section className="p-6 border border-slate-200 rounded-xl bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif text-xl font-semibold text-slate-900">
              Audience & Engagement Performance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated from real database view, unique visitor, like, comment, and share events
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(
              [
                ['daily', 'Daily (14d)'],
                ['weekly', 'Weekly (8w)'],
                ['monthly', 'Monthly (6m)'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTimeframe(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  timeframe === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-72">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Total Views vs. Unique Visitors
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={activeSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="uniqueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    borderColor: '#E2E8F0',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Total Views"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#viewsFill)"
                />
                <Area
                  type="monotone"
                  dataKey="uniqueVisitors"
                  name="Unique Visitors"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  fill="url(#uniqueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-4 h-72">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Likes, Comments & Shares
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={activeSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    borderColor: '#E2E8F0',
                  }}
                />
                <Bar dataKey="likes" name="Likes" fill="#2563EB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="comments" name="Comments" fill="#7C3AED" radius={[3, 3, 0, 0]} />
                <Bar dataKey="shares" name="Shares" fill="#0F172A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Per-Article Table + Individual Blog Analytics Deep Dive */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* All My Articles Table */}
        <div className="lg:col-span-7 border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                Your Articles ({data.articlesAnalytics.length})
              </h2>
              <p className="text-xs text-slate-500">
                Select any row to view its Individual Blog Analytics
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {(
                [
                  ['all', 'All'],
                  ['published', 'Published'],
                  ['draft', 'Drafts'],
                  ['pending_review', 'Pending'],
                  ['rejected', 'Rejected'],
                ] as const
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-600 mb-4">
                No articles in this status filter yet.
              </p>
              <button
                type="button"
                onClick={onWriteNew}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
              >
                Create New Article
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Views</th>
                    <th className="py-3 px-3 text-right">Readers</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredArticles.map((art) => {
                    const statusMeta = formatStatusLabel(art.status);
                    const isSelected = selectedArticle?.articleId === art.articleId;
                    return (
                      <tr
                        key={art.articleId}
                        onClick={() => setSelectedArticleId(art.articleId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <div className="font-semibold text-slate-900 truncate">
                            {art.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {art.category} ·{' '}
                            {art.publishedAt
                              ? new Date(art.publishedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Unpublished'}
                          </div>
                        </td>
                        <td className={`py-3.5 px-3 whitespace-nowrap ${statusMeta.colorClass}`}>
                          {statusMeta.label}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {art.totalViews.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600">
                          {art.estimatedReaders.toLocaleString()}
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onViewArticle(art.articleId)}
                              title="Read or preview article"
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditArticleById(art.articleId)}
                              title="Edit article"
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(art.articleId)}
                              title="Delete article"
                              className="p-1.5 text-slate-500 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {confirmDeleteId && (
            <div className="p-4 bg-red-50 border-t border-red-200 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-red-900">
                Confirm permanent deletion of this article?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-1 text-xs bg-white border border-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Individual Blog Analytics Deep-Dive Inspector */}
        <div className="lg:col-span-5 border border-slate-200 rounded-xl bg-white p-6 space-y-6">
          {selectedArticle ? (
            <>
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                  <span>Individual Article Analytics</span>
                  <span className={formatStatusLabel(selectedArticle.status).colorClass}>
                    {formatStatusLabel(selectedArticle.status).label}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-slate-900 leading-snug">
                  {selectedArticle.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedArticle.publishedAt
                    ? `Published ${new Date(selectedArticle.publishedAt).toLocaleDateString(
                        'en-US',
                        { month: 'long', day: 'numeric', year: 'numeric' }
                      )}`
                    : 'Not yet published — metrics begin recording once published'}
                </p>
                {selectedArticle.moderationNote && (
                  <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    Moderator Note: {selectedArticle.moderationNote}
                  </p>
                )}
              </div>

              {/* 7 Individual Article Metrics */}
              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div className="pb-3 border-b border-slate-100">
                  <dt className="text-slate-500">Total Views</dt>
                  <dd className="font-mono tabular-nums text-lg font-semibold text-slate-900 mt-0.5">
                    {selectedArticle.totalViews.toLocaleString()}
                  </dd>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <dt className="text-slate-500">Unique Visitors</dt>
                  <dd className="font-mono tabular-nums text-lg font-semibold text-blue-600 mt-0.5">
                    {selectedArticle.uniqueVisitors.toLocaleString()}
                  </dd>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <dt className="text-slate-500">Estimated Readers</dt>
                  <dd className="font-mono tabular-nums text-lg font-semibold text-violet-600 mt-0.5">
                    {selectedArticle.estimatedReaders.toLocaleString()}
                  </dd>
                </div>
                <div className="pb-3 border-b border-slate-100">
                  <dt className="text-slate-500">Avg. Reading Time</dt>
                  <dd className="font-mono tabular-nums text-lg font-semibold text-slate-900 mt-0.5">
                    {formatDuration(selectedArticle.avgReadingSeconds)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Total Likes</dt>
                  <dd className="font-mono tabular-nums text-base font-semibold text-slate-900 mt-0.5">
                    {selectedArticle.totalLikes}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Comments & Shares</dt>
                  <dd className="font-mono tabular-nums text-base font-semibold text-slate-900 mt-0.5">
                    {selectedArticle.totalComments} comments · {selectedArticle.totalShares} shares
                  </dd>
                </div>
              </dl>

              {/* Scroll Depth Engagement Funnel (25%, 50%, 75%, 100%) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-900">
                    Reading Engagement (Scroll Progress)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    % of unique visitors
                  </span>
                </div>
                <div className="space-y-3">
                  {(
                    [
                      ['25% Scroll Progress', selectedArticle.scrollEngagement.pct25, selectedArticle.scrollEngagement.reached25],
                      ['50% Scroll Progress', selectedArticle.scrollEngagement.pct50, selectedArticle.scrollEngagement.reached50],
                      ['75% Scroll Progress', selectedArticle.scrollEngagement.pct75, selectedArticle.scrollEngagement.reached75],
                      ['100% Completed Article', selectedArticle.scrollEngagement.pct100, selectedArticle.scrollEngagement.reached100],
                    ] as const
                  ).map(([label, pctVal, rawCount]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700">{label}</span>
                        <span className="font-mono tabular-nums text-slate-600">
                          {pctVal}% ({rawCount})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full transition-all duration-300"
                          style={{ width: `${pctVal}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy & Deduplication Notice */}
              <div className="pt-4 border-t border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-700">Reader Privacy Protected:</strong>{' '}
                  All metrics are aggregated from one-way SHA-256 visitor hashes with a 6-hour duplicate view lock. Personal reader identities, emails, and IP addresses are never exposed.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Select an article on the left to inspect its detailed scroll funnel and reading statistics.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
