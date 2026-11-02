import React, { useMemo, useState } from 'react';
import { Search, ArrowUpRight, X } from 'lucide-react';
import { EditorialImage, AuthorAvatar } from './EditorialImage';
import type { Article, PublicAuthor, UserProfile } from '../types';

interface HomeViewProps {
  articles: Article[];
  trending: Article[];
  featured: Article[];
  popularBloggers: PublicAuthor[];
  categories: Array<{ name: string; count: number; views: number }>;
  currentUser: UserProfile | null;
  onSelectArticle: (articleId: string) => void;
  onSelectAuthor: (authorId: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onStartWriting: () => void;
}

function formatEditorialDate(iso: string | null): string {
  if (!iso) return 'Draft';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const HomeView: React.FC<HomeViewProps> = ({
  articles,
  trending,
  featured,
  popularBloggers,
  categories,
  currentUser,
  onSelectArticle,
  onSelectAuthor,
  onOpenAuth,
  onStartWriting,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'trending' | 'discussed'>('latest');

  const leadArticle = featured[0] || articles[0] || null;
  const secondaryFeatured = useMemo(
    () =>
      (featured.length > 1 ? featured.slice(1, 3) : articles.slice(1, 3)).filter(
        (a) => a.id !== leadArticle?.id
      ),
    [featured, articles, leadArticle]
  );

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = articles.filter((a) => {
      const matchesCat =
        selectedCategory === 'All' || a.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'trending') {
      return [...list].sort((a, b) => b.viewCount - a.viewCount);
    }
    if (sortBy === 'discussed') {
      return [...list].sort((a, b) => b.commentCount - a.commentCount);
    }
    return list;
  }, [articles, searchQuery, selectedCategory, sortBy]);

  const isFiltering = searchQuery.trim().length > 0 || selectedCategory !== 'All';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Editorial Header Banner & Search Bar */}
      <section className="pt-8 pb-10 border-b border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-blue-600 tracking-wide mb-2">
              Vibe Blogs Platform · Open Multi-Author Publishing · Free Forever
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-slate-900 leading-[1.15] tracking-tight">
              Publish your own content, share your voice, and track real reader engagement.
            </h1>
          </div>

          {!currentUser ? (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onStartWriting}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-xs"
              >
                Publish Your Story
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:border-slate-900 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap"
              >
                Sign In / Google ID
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onStartWriting}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5"
              >
                <span>Write & Publish New Article</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Interactive Category Filter Controls */}
        <div className="mt-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, authors, categories, or tags..."
              aria-label="Search published articles"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === 'All'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              All Topics
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tier 1: Featured Blog Posts (Shown when not actively searching) */}
      {!isFiltering && leadArticle && (
        <section aria-labelledby="featured-heading" className="py-12 border-b border-slate-200">
          <div className="flex items-baseline justify-between mb-6">
            <h2
              id="featured-heading"
              className="font-serif text-2xl font-semibold text-slate-900"
            >
              Featured Stories
            </h2>
            <span className="text-xs text-slate-500">
              Editorially selected essays
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Lead Story */}
            <article
              onClick={() => onSelectArticle(leadArticle.id)}
              className="lg:col-span-7 group cursor-pointer flex flex-col justify-between border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors bg-white"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                <EditorialImage
                  src={leadArticle.featuredImage}
                  alt={leadArticle.title}
                  aspectClassName="aspect-[16/9]"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <span className="font-medium text-blue-600">
                      {leadArticle.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatEditorialDate(leadArticle.publishedAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {leadArticle.viewCount.toLocaleString()} views
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {leadArticle.commentCount} comments
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-3">
                    {leadArticle.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed line-clamp-3">
                    {leadArticle.excerpt}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAuthor(leadArticle.authorId);
                    }}
                    className="flex items-center gap-2.5 text-left group/author"
                  >
                    <AuthorAvatar
                      name={leadArticle.authorName}
                      avatarUrl={leadArticle.authorAvatar}
                      sizeClass="w-8 h-8 text-xs"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 group-hover/author:text-blue-600 transition-colors">
                        {leadArticle.authorName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {leadArticle.estimatedReadMinutes} min read
                      </div>
                    </div>
                  </button>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                    Read essay
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </article>

            {/* Secondary Featured Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {secondaryFeatured.map((art) => (
                <article
                  key={art.id}
                  onClick={() => onSelectArticle(art.id)}
                  className="flex-1 group cursor-pointer border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors bg-white flex flex-col sm:flex-row lg:flex-col"
                >
                  <div className="sm:w-48 lg:w-full aspect-[16/9] sm:aspect-auto lg:aspect-[16/9] overflow-hidden bg-slate-100 shrink-0">
                    <EditorialImage
                      src={art.featuredImage}
                      alt={art.title}
                      aspectClassName="aspect-[16/9]"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span className="font-medium text-violet-600">
                          {art.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatEditorialDate(art.publishedAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {art.viewCount} views
                        </span>
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-2">
                        {art.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {art.excerpt}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <AuthorAvatar
                          name={art.authorName}
                          avatarUrl={art.authorAvatar}
                          sizeClass="w-6 h-6 text-[10px]"
                        />
                        <span className="font-medium text-slate-800">
                          {art.authorName}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums">
                        {art.commentCount} comments
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content Split: Latest / Filtered Articles (Left 8 cols) + Trending, Popular Bloggers & Popular Categories (Right 4 cols) */}
      <section className="pt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-8">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-slate-900">
                {isFiltering
                  ? `Articles (${filteredArticles.length})`
                  : 'Latest Articles'}
              </h2>
              {isFiltering && (
                <p className="text-xs text-slate-500 mt-1">
                  Showing matches for{' '}
                  {selectedCategory !== 'All' ? `category "${selectedCategory}"` : 'all topics'}
                  {searchQuery ? ` · query "${searchQuery}"` : ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              {(
                [
                  ['latest', 'Latest'],
                  ['trending', 'Most Viewed'],
                  ['discussed', 'Most Discussed'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    sortBy === key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="py-16 px-6 text-center border border-slate-200 rounded-xl bg-slate-50/50">
              <h3 className="font-serif text-lg font-semibold text-slate-900 mb-1">
                No matching articles found
              </h3>
              <p className="text-sm text-slate-600 mb-5">
                Try clearing your search filter or exploring another topic category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredArticles.map((article) => (
                <article
                  key={article.id}
                  onClick={() => onSelectArticle(article.id)}
                  className="group cursor-pointer pb-8 border-b border-slate-200 last:border-b-0 flex flex-col sm:flex-row gap-6 items-start"
                >
                  <div className="w-full sm:w-56 aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <EditorialImage
                      src={article.featuredImage}
                      alt={article.title}
                      aspectClassName="aspect-[4/3]"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Clean unboxed metadata per Zero-Pill Discipline */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-2">
                      <span className="font-medium text-blue-600">
                        {article.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatEditorialDate(article.publishedAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {article.viewCount.toLocaleString()} views
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {article.commentCount} comments
                      </span>
                    </div>

                    <h3 className="font-serif text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-2">
                      {article.title}
                    </h3>

                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-4">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAuthor(article.authorId);
                        }}
                        className="flex items-center gap-2.5 text-left group/author"
                      >
                        <AuthorAvatar
                          name={article.authorName}
                          avatarUrl={article.authorAvatar}
                          sizeClass="w-7 h-7 text-[11px]"
                        />
                        <span className="text-xs font-semibold text-slate-800 group-hover/author:text-blue-600 transition-colors">
                          {article.authorName}
                        </span>
                      </button>

                      <span className="text-xs text-slate-500">
                        {article.estimatedReadMinutes} min read
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right Editorial Rail: Trending Articles, Popular Bloggers, Popular Categories */}
        <aside className="lg:col-span-4 space-y-10">
          {/* Trending Articles */}
          <div className="pb-8 border-b border-slate-200">
            <h2 className="font-serif text-lg font-semibold text-slate-900 mb-5">
              Trending Articles
            </h2>
            <ol className="space-y-5">
              {trending.slice(0, 5).map((item, idx) => (
                <li
                  key={item.id}
                  onClick={() => onSelectArticle(item.id)}
                  className="group cursor-pointer flex items-start gap-3.5"
                >
                  <span className="font-mono tabular-nums text-sm font-semibold text-violet-600 pt-0.5 w-6 shrink-0">
                    0{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{item.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {item.viewCount.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Popular Bloggers */}
          <div className="pb-8 border-b border-slate-200">
            <h2 className="font-serif text-lg font-semibold text-slate-900 mb-5">
              Popular Bloggers
            </h2>
            <div className="space-y-4">
              {popularBloggers.slice(0, 5).map((blogger) => (
                <div
                  key={blogger.id}
                  onClick={() => onSelectAuthor(blogger.id)}
                  className="group cursor-pointer flex items-start justify-between gap-3 py-1"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <AuthorAvatar
                      name={blogger.name}
                      avatarUrl={blogger.avatarUrl}
                      sizeClass="w-9 h-9 text-xs"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {blogger.name}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {blogger.headline}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
                        <span>{blogger.publishedCount} articles</span>
                        <span aria-hidden="true">·</span>
                        <span>{blogger.totalViews.toLocaleString()} reads</span>
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Popular Categories */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900 mb-4">
              Popular Categories
            </h2>
            <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    window.scrollTo({ top: 280, behavior: 'smooth' });
                  }}
                  className="w-full py-3 flex items-center justify-between text-left hover:text-blue-600 transition-colors group"
                >
                  <span
                    className={`text-sm font-medium ${
                      selectedCategory === cat.name
                        ? 'text-blue-600 font-semibold'
                        : 'text-slate-800 group-hover:text-blue-600'
                    }`}
                  >
                    {cat.name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {cat.count} posts · {cat.views.toLocaleString()} views
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};
