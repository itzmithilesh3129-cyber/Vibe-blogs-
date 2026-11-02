import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Globe,
  Trash2,
  ShieldCheck,
  Database,
  Server,
  Layers,
} from 'lucide-react';
import { api, getLocalReadHistory } from '../lib/api';
import { isFirebaseClientConfigured } from '../lib/firebase';
import { EditorialImage, AuthorAvatar } from './EditorialImage';
import type {
  Article,
  PublicAuthor,
  ReaderActivityData,
  UserProfile,
} from '../types';

/* 1. PUBLIC AUTHOR PROFILE & AUTHORS DIRECTORY */
export const AuthorsDirectoryView: React.FC<{
  authors: PublicAuthor[];
  selectedAuthorId: string | null;
  onSelectAuthor: (authorId: string | null) => void;
  onSelectArticle: (articleId: string) => void;
}> = ({ authors, selectedAuthorId, onSelectAuthor, onSelectArticle }) => {
  const [authorDetail, setAuthorDetail] = useState<{
    author: PublicAuthor;
    articles: Article[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedAuthorId) {
      setAuthorDetail(null);
      return;
    }
    setLoading(true);
    api
      .getAuthorProfile(selectedAuthorId)
      .then((res) => setAuthorDetail(res))
      .catch(() => setAuthorDetail(null))
      .finally(() => setLoading(false));
  }, [selectedAuthorId]);

  if (selectedAuthorId) {
    if (loading) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      );
    }

    if (!authorDetail) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-sm text-slate-600 mb-4">Author profile not found.</p>
          <button
            type="button"
            onClick={() => onSelectAuthor(null)}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg"
          >
            View All Authors
          </button>
        </div>
      );
    }

    const { author, articles } = authorDetail;

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <button
          type="button"
          onClick={() => onSelectAuthor(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Vibe Blogs Authors</span>
        </button>

        <div className="p-6 sm:p-8 border border-slate-200 rounded-xl bg-slate-50/50 mb-10 flex flex-col sm:flex-row items-start gap-6">
          <AuthorAvatar
            name={author.name}
            avatarUrl={author.avatarUrl}
            sizeClass="w-16 h-16 text-lg"
          />
          <div className="flex-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
              {author.name}
            </h1>
            <p className="text-sm font-medium text-blue-600 mt-1">
              {author.headline}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-2xl">
              {author.bio}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
              <span>{author.publishedCount} published articles</span>
              <span aria-hidden="true">·</span>
              <span>{author.totalViews.toLocaleString()} total reads</span>
              {author.website && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={author.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-sans text-blue-600 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <h2 className="font-serif text-xl font-semibold text-slate-900 mb-6">
          Published Articles by {author.name}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((art) => (
            <article
              key={art.id}
              onClick={() => onSelectArticle(art.id)}
              className="group cursor-pointer border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors bg-white"
            >
              <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                <EditorialImage
                  src={art.featuredImage}
                  alt={art.title}
                  aspectClassName="aspect-[16/9]"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-5">
                <div className="text-xs text-slate-500 mb-2">
                  <span className="font-medium text-blue-600">{art.category}</span>
                  {' · '}
                  <span className="font-mono tabular-nums">
                    {art.viewCount.toLocaleString()} views
                  </span>
                  {' · '}
                  <span className="font-mono tabular-nums">
                    {art.commentCount} comments
                  </span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                  {art.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2">{art.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
      <div className="pb-6 border-b border-slate-200 mb-8">
        <p className="text-xs font-medium text-blue-600 mb-1">
          Multi-Author Community
        </p>
        <h1 className="font-serif text-3xl font-semibold text-slate-900">
          Contributing Bloggers & Writers
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {authors.map((a) => (
          <div
            key={a.id}
            onClick={() => onSelectAuthor(a.id)}
            className="group cursor-pointer p-6 border border-slate-200 rounded-xl hover:border-blue-600 transition-colors bg-white flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <AuthorAvatar
                  name={a.name}
                  avatarUrl={a.avatarUrl}
                  sizeClass="w-12 h-12 text-sm"
                />
                <div>
                  <h2 className="font-serif text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {a.name}
                  </h2>
                  <p className="text-xs text-blue-600 font-medium">{a.headline}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {a.bio}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
              <span>{a.publishedCount} articles</span>
              <span>{a.totalViews.toLocaleString()} total views</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 2. READER ACTIVITY & COMMENT MANAGEMENT HUB */
export const ReaderActivityView: React.FC<{
  currentUser: UserProfile;
  onSelectArticle: (articleId: string) => void;
  onOpenProfileModal: () => void;
  onStartWriting?: () => void;
}> = ({ currentUser, onSelectArticle, onOpenProfileModal, onStartWriting }) => {
  const [activity, setActivity] = useState<ReaderActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadActivity = () => {
    setLoading(true);
    const recentIds = getLocalReadHistory();
    api
      .getReaderActivity(recentIds)
      .then((res) => setActivity(res))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const handleDeleteComment = async (commentId: string) => {
    await api.deleteComment(commentId);
    loadActivity();
  };

  if (loading || !activity) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <div className="h-10 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-10">
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-violet-600 mb-1">
            Vibe Blogs Platform · {currentUser.email}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Your Activity, Comments & Articles
          </h1>
        </div>
        <div className="flex items-center gap-2 self-start">
          {onStartWriting && (
            <button
              type="button"
              onClick={onStartWriting}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Write & Publish Article
            </button>
          )}
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-800 hover:border-slate-900 transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Liked & Recently Read */}
        <div className="lg:col-span-7 space-y-8">
          <section>
            <h2 className="font-serif text-lg font-semibold text-slate-900 mb-4">
              Liked Articles ({activity.likedArticles.length})
            </h2>
            {activity.likedArticles.length === 0 ? (
              <p className="text-xs text-slate-500 p-5 border border-slate-200 rounded-xl">
                Articles you heart while reading appear here for quick reference.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {activity.likedArticles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => onSelectArticle(art.id)}
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="text-xs text-blue-600 font-medium mb-0.5">
                      {art.category} · {art.authorName}
                    </div>
                    <div className="font-serif text-base font-semibold text-slate-900">
                      {art.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold text-slate-900 mb-4">
              Recently Read in This Browser ({activity.recentlyReadArticles.length})
            </h2>
            {activity.recentlyReadArticles.length === 0 ? (
              <p className="text-xs text-slate-500 p-5 border border-slate-200 rounded-xl">
                Open any published article to populate your private reading history.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {activity.recentlyReadArticles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => onSelectArticle(art.id)}
                    className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-serif text-sm font-semibold text-slate-900">
                        {art.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {art.authorName} · {art.estimatedReadMinutes} min read
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* My Comments Management */}
        <div className="lg:col-span-5">
          <h2 className="font-serif text-lg font-semibold text-slate-900 mb-4">
            Your Comments ({activity.myComments.length})
          </h2>
          {activity.myComments.length === 0 ? (
            <p className="text-xs text-slate-500 p-5 border border-slate-200 rounded-xl">
              You have not posted any comments yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {activity.myComments.map((c) => (
                <div key={c.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => onSelectArticle(c.articleId)}
                      className="font-semibold text-blue-600 hover:underline truncate"
                    >
                      {c.articleTitle}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      title="Delete comment"
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* 3. BEGINNER SETUP, SECURITY RULES, ANALYTICS & FREE-TIER ARCHITECTURE GUIDE */
export const SetupAndArchitectureView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 space-y-12">
      <header className="pb-6 border-b border-slate-200">
        <p className="text-xs font-medium text-blue-600 mb-1">
          Documentation · Setup, Analytics & Security
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900">
          Beginner Setup, Free-Tier Limits & Architecture Guide
        </h1>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          Vibe Blogs runs out-of-the-box with a persistent full-stack event database and includes complete Firebase Authentication, Cloud Firestore, and Firebase Storage security configurations (`firestore.rules` and `storage.rules`) for zero-cost cloud deployment.
        </p>
        <div className="mt-4 text-xs text-slate-500">
          Current runtime storage adapter:{' '}
          <span className="font-semibold text-slate-900">
            {isFirebaseClientConfigured
              ? 'Firebase Client SDK + Express API'
              : 'Built-in Persistent Event Database (/api/*) — Ready for Firebase .env keys'}
          </span>
        </div>
      </header>

      {/* Section 1: How Views & Scroll Engagement Are Measured */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="font-serif text-xl font-semibold text-slate-900">
            1. How Views & Engagement Are Measured (Duplicate Prevention)
          </h2>
        </div>
        <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>Zero Hardcoded Counters:</strong> Every view, unique visitor count, reading time average, and scroll completion percentage across Vibe Blogs is computed live from real database event records.
          </p>
          <p>
            <strong>6-Hour Duplicate View Lock:</strong> Each browser generates a random anonymous token (`vb_anonymous_visitor_key`). When an article opens, the server hashes that token with SHA-256 (`visitorHash`) and checks whether that visitor has already viewed the same article within the past <strong>6 hours</strong>. Refreshes or repeat visits inside the 6-hour window return `deduplicated: true` without inflating view counts.
          </p>
          <p>
            <strong>Scroll Progress & Privacy:</strong> As a reader scrolls through an article, milestones at `25%`, `50%`, `75%`, and `100%` and active visible-tab reading seconds are logged against the anonymous hash. Bloggers see aggregated retention funnels for their own articles only—never reader names, emails, or IP addresses.
          </p>
        </div>
      </section>

      {/* Section 2: Free-Tier Limits Explained */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-600" />
          <h2 className="font-serif text-xl font-semibold text-slate-900">
            2. Firebase Free Plan (Spark Tier) Limits & Optimization
          </h2>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Free Spark Limit</th>
                <th className="py-3 px-4">How Vibe Blogs Stays Free</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-semibold">Firebase Authentication</td>
                <td className="py-3 px-4 font-mono tabular-nums">50,000 MAUs free</td>
                <td className="py-3 px-4">
                  Email/Password registration is 100% free for Readers, Bloggers, and Admins.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Cloud Firestore</td>
                <td className="py-3 px-4 font-mono tabular-nums">
                  1 GiB storage · 50k reads/day · 20k writes/day
                </td>
                <td className="py-3 px-4">
                  6-hour view deduplication & 12s batched read-time updates prevent excessive write spikes.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Firebase Storage</td>
                <td className="py-3 px-4 font-mono tabular-nums">5 GB stored · 1 GB/day download</td>
                <td className="py-3 px-4">
                  Client-side canvas compression shrinks uploaded cover photos to ~95 KB JPEG before upload.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Beginner Step-by-Step Setup & Deployment */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <h2 className="font-serif text-xl font-semibold text-slate-900">
            3. Beginner Step-by-Step Firebase Setup & Deployment
          </h2>
        </div>
        <ol className="space-y-4 text-sm text-slate-700 list-decimal pl-5 leading-relaxed">
          <li>
            <strong>Create a Free Firebase Project:</strong> Visit{' '}
            <code>console.firebase.google.com</code>, click <em>Add project</em>, name it{' '}
            <code>vibe-blogs</code>, and keep it on the default $0 <strong>Spark Plan</strong>.
          </li>
          <li>
            <strong>Enable Authentication:</strong> Go to <em>Build → Authentication → Sign-in method</em> and enable <strong>Email/Password</strong>.
          </li>
          <li>
            <strong>Create Cloud Firestore & Deploy Security Rules:</strong> Go to{' '}
            <em>Build → Firestore Database → Create database</em>. Open the <em>Rules</em> tab and paste the project’s <code>firestore.rules</code> file, then click <strong>Publish</strong>. If using Firebase Storage, paste <code>storage.rules</code> under <em>Storage → Rules</em>.
          </li>
          <li>
            <strong>Connect Environment Variables Safely:</strong> Under{' '}
            <em>Project Settings → Your apps → Web</em>, copy your config values into a local{' '}
            <code>.env</code> file matching <code>.env.example</code> (<code>VITE_FIREBASE_API_KEY</code>,{' '}
            <code>VITE_FIREBASE_PROJECT_ID</code>, etc.). Never commit private service-account keys to Git.
          </li>
          <li>
            <strong>Test All Three Roles Locally:</strong> Run <code>npm install</code> and{' '}
            <code>npm run dev</code> (opens on <code>http://localhost:3000</code>). Click{' '}
            <strong>Sign In / Register</strong> in the top bar to register a new Blogger or Reader, or use the one-click <em>Blogger</em>, <em>Reader</em>, and <em>Admin</em> demo role buttons to verify publishing, scroll analytics, comments, and moderation.
          </li>
          <li>
            <strong>Build & Deploy to Production:</strong> Run <code>npm run build</code> to produce the optimized bundle in <code>dist/</code>, then deploy via Firebase Hosting (<code>firebase deploy</code>) or Google Cloud Run (<code>npm start</code>).
          </li>
        </ol>
      </section>

      {/* Section 4: Security Rules Summary */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="font-serif text-xl font-semibold text-slate-900">
            4. Role-Based Security Enforcement
          </h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Both the Express API middleware (<code>server.ts</code>) and Cloud Firestore security rules (<code>firestore.rules</code>) enforce strict ownership: bloggers can edit, delete, and view analytics <strong>only for articles where <code>authorId == auth.uid</code></strong>, readers cannot self-assign admin privileges, and only administrators can approve/reject posts, resolve reports, or suspend accounts.
        </p>
      </section>
    </div>
  );
};
