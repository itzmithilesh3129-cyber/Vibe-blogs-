import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard,
  FileText,
  Users,
  Flag,
  CheckCircle2,
  XCircle,
  Star,
  Edit3,
  Trash2,
  ExternalLink,
  Search,
} from 'lucide-react';
import { api } from '../lib/api';
import { AuthorAvatar } from './EditorialImage';
import type {
  AdminDashboardData,
  ArticleStatus,
  UserProfile,
  UserRole,
} from '../types';

interface AdminDashboardViewProps {
  currentUser: UserProfile;
  onViewArticle: (articleId: string) => void;
  onEditArticleById: (articleId: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onViewArticle,
  onEditArticleById,
}) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'posts' | 'moderation' | 'users'
  >('overview');

  const [postFilter, setPostFilter] = useState<'all' | ArticleStatus>('all');
  const [userSearch, setUserSearch] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(
    null
  );

  const loadAdmin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminDashboard();
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load Admin Dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  const handleModeratePost = async (
    articleId: string,
    payload: { status?: ArticleStatus; featured?: boolean; moderationNote?: string }
  ) => {
    try {
      await api.moderateArticle(articleId, payload);
      setRejectingId(null);
      setRejectNote('');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation failed.');
    }
  };

  const handleDeletePost = async (articleId: string) => {
    try {
      await api.deleteArticle(articleId);
      setConfirmDeletePostId(null);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleUserChange = async (
    userId: string,
    payload: { role?: UserRole; status?: 'active' | 'suspended' }
  ) => {
    try {
      await api.updateUserByAdmin(userId, payload);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User update failed.');
    }
  };

  const handleReportResolution = async (
    reportId: string,
    action: 'dismiss' | 'delete_target'
  ) => {
    try {
      await api.resolveReport(reportId, action);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report action failed.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment deletion failed.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600 mb-4">{error || 'Admin console unavailable.'}</p>
        <button
          type="button"
          onClick={loadAdmin}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
        >
          Reload Console
        </button>
      </div>
    );
  }

  const filteredPosts = data.allArticles.filter((a) =>
    postFilter === 'all' ? true : a.status === postFilter
  );

  const filteredUsers = data.users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Workspace Header */}
      <div className="pb-6 border-b border-slate-200 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-violet-600 mb-1">
            Platform Owner Administration · Signed in as {currentUser.name}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Admin Control & Moderation Console
          </h1>
        </div>
      </div>

      {/* SaaS Workspace Layout: Left Sidebar + Main Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 border border-slate-200 rounded-xl p-2 bg-slate-50/60 space-y-1">
          {(
            [
              ['overview', 'Platform Analytics', LayoutDashboard, 0],
              ['posts', 'Post Moderation', FileText, data.summary.pendingPosts],
              ['moderation', 'Comments & Reports', Flag, data.summary.openReports],
              ['users', 'User Management', Users, 0],
            ] as const
          ).map(([key, label, Icon, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === key
                  ? 'bg-white text-blue-600 border border-slate-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </span>
              {count > 0 && (
                <span className="font-mono tabular-nums text-[11px] text-amber-700 font-bold">
                  {count}
                </span>
              )}
            </button>
          ))}
        </aside>

        <div className="lg:col-span-9 space-y-8">
          {/* TAB 1: OVERVIEW & TOTAL WEBSITE ANALYTICS */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white overflow-hidden">
                <div className="p-4">
                  <div className="text-xs text-slate-500 mb-1">Bloggers</div>
                  <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
                    {data.summary.totalBloggers}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-slate-500 mb-1">Readers</div>
                  <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
                    {data.summary.totalReaders}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-slate-500 mb-1">Published</div>
                  <div className="font-mono tabular-nums text-2xl font-semibold text-blue-600">
                    {data.summary.publishedPosts}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-slate-500 mb-1">Pending Posts</div>
                  <div className="font-mono tabular-nums text-2xl font-semibold text-amber-700">
                    {data.summary.pendingPosts}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-slate-500 mb-1">Website Views</div>
                  <div className="font-mono tabular-nums text-2xl font-semibold text-violet-600">
                    {data.summary.totalWebsiteViews.toLocaleString()}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-slate-500 mb-1">Comments</div>
                  <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
                    {data.summary.totalComments.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Website Traffic Chart */}
              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <h2 className="font-serif text-lg font-semibold text-slate-900 mb-1">
                  Total Website Traffic (Last 14 Days)
                </h2>
                <p className="text-xs text-slate-500 mb-5">
                  Sitewide deduplicated article views and unique readers
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.dailyTraffic}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="adminViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
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
                        name="Website Views"
                        stroke="#2563EB"
                        strokeWidth={2}
                        fill="url(#adminViews)"
                      />
                      <Area
                        type="monotone"
                        dataKey="uniqueVisitors"
                        name="Unique Visitors"
                        stroke="#7C3AED"
                        strokeWidth={2}
                        fill="none"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Most Popular Articles & Most Active Bloggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-serif text-base font-semibold text-slate-900">
                      Most Popular Articles
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {data.mostPopularArticles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => onViewArticle(art.id)}
                        className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {art.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {art.authorName} · {art.category}
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums text-xs shrink-0">
                          <div className="font-semibold text-slate-900">
                            {art.views.toLocaleString()} views
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {art.likes} likes · {art.comments} cmt
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-serif text-base font-semibold text-slate-900">
                      Most Active Bloggers
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {data.mostActiveBloggers.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AuthorAvatar
                            name={b.name}
                            avatarUrl={b.avatarUrl}
                            sizeClass="w-8 h-8 text-xs"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {b.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {b.email}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums text-xs shrink-0">
                          <div className="font-semibold text-blue-600">
                            {b.publishedPosts} posts
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {b.totalViews.toLocaleString()} views
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: POST MODERATION */}
          {activeTab === 'posts' && (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-slate-900">
                    All Platform Articles ({data.allArticles.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Approve pending submissions, reject with notes, feature on homepage, edit, or delete
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                  {(
                    [
                      ['all', 'All'],
                      ['pending_review', 'Pending Review'],
                      ['published', 'Published'],
                      ['draft', 'Drafts'],
                      ['rejected', 'Rejected'],
                    ] as const
                  ).map(([st, lbl]) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPostFilter(st)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                        postFilter === st
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-slate-800">
                            {post.authorName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{post.category}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              post.status === 'published'
                                ? 'text-emerald-700 font-semibold'
                                : post.status === 'pending_review'
                                ? 'text-amber-700 font-semibold'
                                : post.status === 'rejected'
                                ? 'text-red-700 font-semibold'
                                : 'text-slate-600'
                            }
                          >
                            {post.status.replace('_', ' ')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {post.viewCount} views
                          </span>
                        </div>

                        <h3 className="font-serif text-lg font-semibold text-slate-900">
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {post.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleModeratePost(post.id, {
                                status: 'published',
                                moderationNote: '',
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                        {post.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(
                                rejectingId === post.id ? null : post.id
                              );
                              setRejectNote(post.moderationNote || '');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                        {post.status === 'published' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleModeratePost(post.id, {
                                featured: !post.featured,
                              })
                            }
                            title="Toggle Featured Story on Homepage"
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition-colors ${
                              post.featured
                                ? 'border-violet-600 bg-violet-50 text-violet-700'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                post.featured ? 'fill-violet-600 text-violet-600' : ''
                              }`}
                            />
                            <span>{post.featured ? 'Featured' : 'Feature'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onViewArticle(post.id)}
                          title="Read article"
                          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditArticleById(post.id)}
                          title="Edit article"
                          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePostId(post.id)}
                          title="Delete article"
                          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {rejectingId === post.id && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="Reason / feedback for author (e.g., Please add source citations)..."
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleModeratePost(post.id, {
                              status: 'rejected',
                              moderationNote:
                                rejectNote || 'Revision requested by site editor.',
                            })
                          }
                          className="px-3 py-1.5 text-xs font-semibold bg-amber-700 text-white rounded-lg whitespace-nowrap"
                        >
                          Confirm Reject
                        </button>
                      </div>
                    )}

                    {confirmDeletePostId === post.id && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                        <span className="text-xs font-medium text-red-900">
                          Delete this post and all its comments/analytics permanently?
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePostId(null)}
                            className="px-3 py-1 text-xs bg-white border border-slate-200 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REPORTED CONTENT & COMMENT MODERATION */}
          {activeTab === 'moderation' && (
            <div className="space-y-8">
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="font-serif text-lg font-semibold text-slate-900">
                    Reported Content Queue ({data.reports.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Review community flags and dismiss benign items or remove abusive content
                  </p>
                </div>

                {data.reports.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">
                    No content reports submitted.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {data.reports.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span className="font-semibold text-slate-800 capitalize">
                              {rep.targetType} Report
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Reason: {rep.reason}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                rep.status === 'open'
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-emerald-700 font-semibold'
                              }
                            >
                              {rep.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-900 font-medium">
                            “{rep.targetPreview}”
                          </p>
                          {rep.details && (
                            <p className="text-xs text-slate-500 mt-1">
                              Note from {rep.reporterName}: {rep.details}
                            </p>
                          )}
                        </div>

                        {rep.status === 'open' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                handleReportResolution(rep.id, 'dismiss')
                              }
                              className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                            >
                              Dismiss Flag
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleReportResolution(rep.id, 'delete_target')
                              }
                              className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Delete Content
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Comments Stream */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="font-serif text-lg font-semibold text-slate-900">
                    All Comments ({data.recentComments.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-200">
                  {data.recentComments.map((cmt) => (
                    <div
                      key={cmt.id}
                      className="p-4 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-slate-900">
                            {cmt.userName}
                          </span>{' '}
                          on{' '}
                          <button
                            type="button"
                            onClick={() => onViewArticle(cmt.articleId)}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {cmt.articleTitle}
                          </button>
                        </div>
                        <p className="text-sm text-slate-800">{cmt.content}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(cmt.id)}
                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: USER & ACCOUNT STATUS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-slate-900">
                    User Accounts & Role Permissions ({data.users.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage bloggers, readers, roles, and active/suspended account status
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Filter users..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Account Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <AuthorAvatar
                              name={u.name}
                              avatarUrl={u.avatarUrl}
                              sizeClass="w-8 h-8 text-xs"
                            />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {u.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <select
                            value={u.role}
                            disabled={u.id === currentUser.id}
                            onChange={(e) =>
                              handleUserChange(u.id, {
                                role: e.target.value as UserRole,
                              })
                            }
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white disabled:opacity-60"
                          >
                            <option value="reader">Reader</option>
                            <option value="blogger">Blogger</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={
                              u.status === 'active'
                                ? 'text-emerald-700 font-semibold'
                                : 'text-red-700 font-semibold'
                            }
                          >
                            {u.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {u.id !== currentUser.id ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserChange(u.id, {
                                  status:
                                    u.status === 'active' ? 'suspended' : 'active',
                                })
                              }
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                                u.status === 'active'
                                  ? 'border-red-200 text-red-700 hover:bg-red-50'
                                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.status === 'active'
                                ? 'Suspend Account'
                                : 'Reactivate'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Current Admin
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
