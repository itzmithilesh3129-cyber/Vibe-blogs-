import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  Flag,
  Edit3,
  Trash2,
  Check,
  CornerDownRight,
} from 'lucide-react';
import { api, recordLocalReadHistory } from '../lib/api';
import { EditorialImage, AuthorAvatar } from './EditorialImage';
import type { Article, CommentItem, PublicAuthor, UserProfile } from '../types';

interface ArticleReaderViewProps {
  articleId: string;
  currentUser: UserProfile | null;
  onBack: () => void;
  onSelectArticle: (id: string) => void;
  onSelectAuthor: (authorId: string) => void;
  onEditArticle: (article: Article) => void;
  onArticleDeleted: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const ArticleReaderView: React.FC<ArticleReaderViewProps> = ({
  articleId,
  currentUser,
  onBack,
  onSelectArticle,
  onSelectAuthor,
  onEditArticle,
  onArticleDeleted,
  onOpenAuth,
}) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [author, setAuthor] = useState<PublicAuthor | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reading telemetry & UI state
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewDedupedNote, setViewDedupedNote] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Comments & Replies
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Inline Delete & Report Modals (no window.alert / window.confirm)
  const [confirmDeleteArticle, setConfirmDeleteArticle] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'article' | 'comment';
    id: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('Spam or misleading content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const articleBodyRef = useRef<HTMLElement | null>(null);
  const firedMilestonesRef = useRef<Set<number>>(new Set());
  const sessionIdRef = useRef<string>(
    'ses_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36)
  );
  const activeSecondsRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setScrollProgress(0);
    firedMilestonesRef.current = new Set();
    activeSecondsRef.current = 0;
    sessionIdRef.current =
      'ses_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);

    window.scrollTo({ top: 0, behavior: 'auto' });

    api
      .getArticleDetail(articleId)
      .then(async (data) => {
        if (cancelled) return;
        setArticle(data.article);
        setAuthor(data.author);
        setComments(data.comments);
        setRelated(data.related);
        setLoading(false);

        if (data.article.status === 'published') {
          recordLocalReadHistory(data.article.id);
          try {
            const evt = await api.trackArticleEvent(data.article.id, {
              eventType: 'view',
              sessionId: sessionIdRef.current,
            });
            if (!cancelled) {
              setArticle((prev) =>
                prev ? { ...prev, viewCount: evt.viewCount } : prev
              );
              setViewDedupedNote(
                evt.deduplicated
                  ? 'Repeat visit within 6h deduplicated'
                  : 'Verified unique view recorded'
              );
            }
          } catch {
            // Non-blocking analytics
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load article.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // Scroll depth progress bar + 25%, 50%, 75%, 100% milestone telemetry
  useEffect(() => {
    if (!article || article.status !== 'published') return;

    const handleScroll = () => {
      const el = articleBodyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const totalScrollable = Math.max(1, el.offsetHeight - viewportH * 0.45);
      const scrolled = Math.max(0, viewportH * 0.55 - rect.top);
      const pct = Math.max(0, Math.min(100, Math.round((scrolled / totalScrollable) * 100)));
      setScrollProgress(pct);

      const milestones: Array<25 | 50 | 75 | 100> = [25, 50, 75, 100];
      for (const m of milestones) {
        if (pct >= m && !firedMilestonesRef.current.has(m)) {
          firedMilestonesRef.current.add(m);
          api
            .trackArticleEvent(article.id, {
              eventType: 'scroll',
              scrollDepth: m,
              sessionId: sessionIdRef.current,
            })
            .catch(() => {});
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article]);

  // Active reading duration telemetry (fires every 12s when tab visible & on unmount)
  useEffect(() => {
    if (!article || article.status !== 'published') return;
    const targetArticleId = article.id;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        activeSecondsRef.current += 3;
        if (activeSecondsRef.current % 12 === 0) {
          api
            .trackArticleEvent(targetArticleId, {
              eventType: 'read_time',
              durationSeconds: activeSecondsRef.current,
              sessionId: sessionIdRef.current,
            })
            .catch(() => {});
        }
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
      if (activeSecondsRef.current >= 5) {
        api
          .trackArticleEvent(targetArticleId, {
            eventType: 'read_time',
            durationSeconds: activeSecondsRef.current,
            sessionId: sessionIdRef.current,
          })
          .catch(() => {});
      }
    };
  }, [article]);

  const handleToggleLike = async () => {
    if (!article) return;
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    try {
      const res = await api.toggleLike(article.id);
      setArticle((prev) =>
        prev ? { ...prev, likedByMe: res.liked, likeCount: res.likeCount } : prev
      );
    } catch {
      // Ignore error
    }
  };

  const handleShare = async () => {
    if (!article) return;
    const shareUrl = `${window.location.origin}/?article=${encodeURIComponent(article.id)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // User dismissed native share dialog or clipboard restricted
    }

    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);

    if (article.status === 'published') {
      try {
        const res = await api.trackArticleEvent(article.id, {
          eventType: 'share',
          sessionId: sessionIdRef.current,
        });
        setArticle((prev) =>
          prev ? { ...prev, shareCount: res.shareCount } : prev
        );
      } catch {
        // Ignore
      }
    }
  };

  const handlePostComment = async (
    e: React.FormEvent,
    parentId: string | null = null
  ) => {
    e.preventDefault();
    if (!article) return;
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    const text = (parentId ? replyText : commentText).trim();
    if (!text) return;

    setSubmittingComment(true);
    try {
      const res = await api.addComment(article.id, text, parentId);
      setComments((prev) => [...prev, res.comment]);
      setArticle((prev) =>
        prev ? { ...prev, commentCount: res.commentCount } : prev
      );
      if (parentId) {
        setReplyText('');
        setReplyToId(null);
      } else {
        setCommentText('');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentId !== commentId)
      );
      setArticle((prev) =>
        prev
          ? {
              ...prev,
              commentCount: Math.max(
                0,
                comments.filter(
                  (c) => c.id !== commentId && c.parentId !== commentId
                ).length
              ),
            }
          : prev
      );
    } catch {
      // Ignore
    }
  };

  const handleDeleteArticle = async () => {
    if (!article) return;
    try {
      await api.deleteArticle(article.id);
      onArticleDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete article.');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget || !article) return;
    try {
      await api.submitReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        articleId: article.id,
        reason: reportReason,
        details: reportDetails,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportTarget(null);
        setReportSuccess(false);
        setReportDetails('');
      }, 1400);
    } catch {
      // Ignore
    }
  };

  const rootComments = useMemo(
    () => comments.filter((c) => !c.parentId),
    [comments]
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, CommentItem[]>();
    for (const c of comments) {
      if (c.parentId) {
        const arr = map.get(c.parentId) || [];
        arr.push(c);
        map.set(c.parentId, arr);
      }
    }
    return map;
  }, [comments]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-4/5 bg-slate-100 rounded animate-pulse" />
        <div className="aspect-[16/9] w-full bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-2">
          {error || 'Article unavailable'}
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
        >
          Back to Homepage
        </button>
      </div>
    );
  }

  const canManageArticle =
    currentUser &&
    (currentUser.role === 'admin' || currentUser.id === article.authorId);

  return (
    <div className="relative pb-24">
      {/* Thin Editorial Reading Progress Rail */}
      <div className="sticky top-[65px] z-30 w-full h-1 bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-violet-600 transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${scrollProgress / 100})` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        {/* Back & Owner Controls */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Articles</span>
          </button>

          {canManageArticle && (
            <div className="flex items-center gap-2">
              {article.status !== 'published' && (
                <span className="text-xs font-semibold text-amber-700 mr-2">
                  Status: {article.status.replace('_', ' ')}
                </span>
              )}
              <button
                type="button"
                onClick={() => onEditArticle(article)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:border-blue-600 hover:text-blue-600 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Post</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteArticle(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:border-red-600 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {confirmDeleteArticle && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs font-medium text-red-900">
              Permanently delete “{article.title}” and all associated analytics events?
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDeleteArticle(false)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteArticle}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-4">
            <span className="font-semibold text-blue-600">{article.category}</span>
            <span aria-hidden="true">·</span>
            <span>
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Unpublished Draft'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{article.estimatedReadMinutes} min read</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-medium text-slate-700">
              {article.viewCount.toLocaleString()} views
            </span>
            {viewDedupedNote && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">{viewDedupedNote}</span>
              </>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold text-slate-900 leading-[1.18] tracking-tight mb-4">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6">
            {article.excerpt}
          </p>

          {/* Author Bar & Engagement Actions */}
          <div className="py-4 border-t border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => onSelectAuthor(article.authorId)}
              className="flex items-center gap-3 text-left group"
            >
              <AuthorAvatar
                name={article.authorName}
                avatarUrl={article.authorAvatar}
                sizeClass="w-10 h-10 text-xs"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {article.authorName}
                </div>
                <div className="text-xs text-slate-500">
                  {article.authorHeadline}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleLike}
                aria-label="Like article"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  article.likedByMe
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    article.likedByMe ? 'fill-blue-600 text-blue-600' : ''
                  }`}
                />
                <span className="font-mono tabular-nums">{article.likeCount}</span>
              </button>

              <a
                href="#comments-section"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:border-slate-300 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="font-mono tabular-nums">
                  {article.commentCount}
                </span>
              </a>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:border-slate-300 transition-colors"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setReportTarget({ type: 'article', id: article.id })
                }
                title="Report article"
                aria-label="Report article"
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Featured Image & Caption */}
        <figure className="mb-10">
          <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <EditorialImage
              src={article.featuredImage}
              alt={article.title}
              aspectClassName="aspect-[16/9]"
              className="w-full h-full object-cover"
            />
          </div>
          {article.featuredImageCaption && (
            <figcaption className="mt-2.5 text-xs italic text-slate-500 text-center">
              {article.featuredImageCaption}
            </figcaption>
          )}
        </figure>

        {/* Full Article Prose Body */}
        <article
          ref={articleBodyRef}
          className="editorial-prose max-w-[68ch] mx-auto"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {/* Unboxed Tags Row */}
        {article.tags.length > 0 && (
          <div className="max-w-[68ch] mx-auto mt-10 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Topics:</span>
            {article.tags.map((tag, idx) => (
              <React.Fragment key={tag}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>{tag}</span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Author Bio Card */}
        {author && (
          <section className="max-w-[68ch] mx-auto mt-10 p-6 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <AuthorAvatar
                  name={author.name}
                  avatarUrl={author.avatarUrl}
                  sizeClass="w-12 h-12 text-sm"
                />
                <div>
                  <div className="text-xs text-slate-500 mb-0.5">Written by</div>
                  <h3 className="font-serif text-lg font-semibold text-slate-900">
                    {author.name}
                  </h3>
                  <p className="text-xs font-medium text-blue-600 mb-2">
                    {author.headline}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {author.bio}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectAuthor(author.id)}
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-800 hover:border-slate-900 transition-colors whitespace-nowrap self-start"
              >
                View Profile ({author.publishedCount})
              </button>
            </div>
          </section>
        )}

        {/* Threaded Comments Section */}
        <section
          id="comments-section"
          className="max-w-[68ch] mx-auto mt-14 pt-10 border-t border-slate-200"
        >
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900">
              Discussion ({comments.length})
            </h2>
            <span className="text-xs text-slate-500">
              Constructive community responses
            </span>
          </div>

          {currentUser ? (
            <form onSubmit={(e) => handlePostComment(e, null)} className="mb-8">
              <label htmlFor="new-comment" className="sr-only">
                Write a comment
              </label>
              <textarea
                id="new-comment"
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={`Share your thoughts as ${currentUser.name}...`}
                className="w-full p-3.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 resize-none"
              />
              <div className="mt-2.5 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Post Comment
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-8 p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-sm text-slate-700">
                Sign in or create a free Reader account to join the discussion and reply to comments.
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap self-start sm:self-auto"
              >
                Sign In to Comment
              </button>
            </div>
          )}

          {rootComments.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">
              No comments yet. Start the conversation above.
            </p>
          ) : (
            <div className="space-y-6">
              {rootComments.map((cmt) => {
                const replies = repliesByParent.get(cmt.id) || [];
                const canDelete =
                  currentUser &&
                  (currentUser.role === 'admin' || currentUser.id === cmt.userId);

                return (
                  <div
                    key={cmt.id}
                    className="pb-6 border-b border-slate-200 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <AuthorAvatar
                        name={cmt.userName}
                        avatarUrl={cmt.userAvatar}
                        sizeClass="w-8 h-8 text-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                          <span className="font-semibold text-slate-900">
                            {cmt.userName}
                          </span>
                          {cmt.userId === article.authorId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-blue-600">
                                Author
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>
                            {new Date(cmt.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                          {cmt.content}
                        </p>

                        <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-500">
                          <button
                            type="button"
                            onClick={() => {
                              if (!currentUser) {
                                onOpenAuth('login');
                                return;
                              }
                              setReplyToId(replyToId === cmt.id ? null : cmt.id);
                              setReplyText('');
                            }}
                            className="font-medium hover:text-blue-600 transition-colors"
                          >
                            Reply
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(cmt.id)}
                              className="font-medium hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setReportTarget({ type: 'comment', id: cmt.id })
                            }
                            className="hover:text-red-600 transition-colors"
                          >
                            Report
                          </button>
                        </div>

                        {replyToId === cmt.id && (
                          <form
                            onSubmit={(e) => handlePostComment(e, cmt.id)}
                            className="mt-3 space-y-2"
                          >
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to ${cmt.userName}...`}
                              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 resize-none"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setReplyToId(null)}
                                className="px-3 py-1.5 text-xs text-slate-600"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={submittingComment || !replyText.trim()}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg disabled:opacity-50"
                              >
                                Post Reply
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Nested Replies */}
                        {replies.length > 0 && (
                          <div className="mt-4 pl-4 sm:pl-6 space-y-4">
                            {replies.map((rep) => {
                              const canDeleteReply =
                                currentUser &&
                                (currentUser.role === 'admin' ||
                                  currentUser.id === rep.userId);
                              return (
                                <div key={rep.id} className="flex items-start gap-2.5">
                                  <CornerDownRight className="w-3.5 h-3.5 text-slate-400 mt-1 shrink-0" />
                                  <AuthorAvatar
                                    name={rep.userName}
                                    avatarUrl={rep.userAvatar}
                                    sizeClass="w-7 h-7 text-[10px]"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                                      <span className="font-semibold text-slate-900">
                                        {rep.userName}
                                      </span>
                                      {rep.userId === article.authorId && (
                                        <>
                                          <span aria-hidden="true">·</span>
                                          <span className="font-medium text-blue-600">
                                            Author
                                          </span>
                                        </>
                                      )}
                                      <span aria-hidden="true">·</span>
                                      <span>
                                        {new Date(rep.createdAt).toLocaleDateString(
                                          'en-US',
                                          { month: 'short', day: 'numeric' }
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                      {rep.content}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                                      {canDeleteReply && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteComment(rep.id)}
                                          className="hover:text-red-600"
                                        >
                                          Delete
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setReportTarget({
                                            type: 'comment',
                                            id: rep.id,
                                          })
                                        }
                                        className="hover:text-red-600"
                                      >
                                        Report
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-slate-200">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-6">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((rel) => (
                <article
                  key={rel.id}
                  onClick={() => onSelectArticle(rel.id)}
                  className="group cursor-pointer border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <EditorialImage
                      src={rel.featuredImage}
                      alt={rel.title}
                      aspectClassName="aspect-[4/3]"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500 mb-1.5">
                      <span className="text-blue-600 font-medium">
                        {rel.category}
                      </span>{' '}
                      · {rel.estimatedReadMinutes} min read
                    </div>
                    <h3 className="font-serif text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {rel.title}
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Report Content Modal */}
      {reportTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xl">
            <h3 className="font-serif text-lg font-semibold text-slate-900 mb-1">
              Report {reportTarget.type === 'article' ? 'Article' : 'Comment'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Flagged items are sent directly to the Admin Moderation queue.
            </p>

            {reportSuccess ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                Thank you. Your report has been submitted to our moderation team.
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  >
                    <option>Spam or misleading content</option>
                    <option>Harassment or disrespectful language</option>
                    <option>Plagiarism or copyright concern</option>
                    <option>Inaccurate technical claims</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide brief context for moderators..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportTarget(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
