import React, { useCallback, useEffect, useState } from 'react';
import { PenSquare, LogOut, User } from 'lucide-react';
import { api, setAuthToken } from './lib/api';
import { HomeView } from './components/HomeView';
import { ArticleReaderView } from './components/ArticleReaderView';
import { BlogEditorView } from './components/BlogEditorView';
import { BloggerDashboardView } from './components/BloggerDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import {
  AuthorsDirectoryView,
  ReaderActivityView,
  SetupAndArchitectureView,
} from './components/ReaderProfileAndGuideViews';
import { AuthModal } from './components/AuthModal';
import { AuthorAvatar } from './components/EditorialImage';
import type { Article, PublicAuthor, UserProfile } from './types';

type ActiveRoute =
  | 'home'
  | 'article'
  | 'authors'
  | 'editor'
  | 'blogger_dashboard'
  | 'admin_dashboard'
  | 'reader_activity'
  | 'setup_guide';

export function App() {
  const [route, setRoute] = useState<ActiveRoute>('home');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [activeAuthorId, setActiveAuthorId] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalMode, setAuthModalMode] = useState<
    'login' | 'register' | 'profile' | null
  >(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Public Feed State
  const [articles, setArticles] = useState<Article[]>([]);
  const [trending, setTrending] = useState<Article[]>([]);
  const [featured, setFeatured] = useState<Article[]>([]);
  const [popularBloggers, setPopularBloggers] = useState<PublicAuthor[]>([]);
  const [categories, setCategories] = useState<
    Array<{ name: string; count: number; views: number }>
  >([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const refreshFeed = useCallback(async () => {
    try {
      const data = await api.getHomeFeed();
      setArticles(data.articles);
      setTrending(data.trending);
      setFeatured(data.featured);
      setPopularBloggers(data.popularBloggers);
      setCategories(data.categories);
    } catch {
      // Keep existing state on transient error
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    // Support deep link ?article=art_1 from shared URLs
    const params = new URLSearchParams(window.location.search);
    const sharedArt = params.get('article');
    if (sharedArt) {
      setActiveArticleId(sharedArt);
      setRoute('article');
    }

    api
      .getMe()
      .then((res) => setCurrentUser(res.user))
      .catch(() => setCurrentUser(null));

    refreshFeed();
  }, [refreshFeed]);

  const handleOpenArticle = (articleId: string) => {
    setActiveArticleId(articleId);
    setRoute('article');
  };

  const handleOpenAuthor = (authorId: string) => {
    setActiveAuthorId(authorId);
    setRoute('authors');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartNewArticle = () => {
    if (!currentUser) {
      setAuthModalMode('register');
      return;
    }
    setEditingArticle(null);
    setRoute('editor');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleEditArticleById = async (articleId: string) => {
    try {
      const detail = await api.getArticleDetail(articleId);
      setEditingArticle(detail.article);
      setRoute('editor');
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch {
      // Ignore
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    setAuthToken(null);
    setCurrentUser(null);
    setAccountMenuOpen(false);
    setRoute('home');
    refreshFeed();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-[65px] bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#explore"
          onClick={(e) => {
            e.preventDefault();
            setRoute('home');
            refreshFeed();
          }}
          className="font-serif text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-blue-600 transition-colors"
        >
          Vibe Blogs Platform
        </a>

        {/* Zone 2: 4–5 Concise Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => {
              setRoute('home');
              refreshFeed();
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              route === 'home' || route === 'article'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            Explore
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveAuthorId(null);
              setRoute('authors');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              route === 'authors'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            Bloggers
          </button>

          <button
            type="button"
            onClick={handleStartNewArticle}
            className={`hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 flex items-center gap-1.5 ${
              route === 'editor'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-700'
            }`}
          >
            <PenSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Write</span>
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={() => {
                if (currentUser.role === 'admin') setRoute('admin_dashboard');
                else setRoute('blogger_dashboard');
              }}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                route === 'blogger_dashboard' || route === 'admin_dashboard'
                  ? 'border-blue-600 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRoute('setup_guide')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                route === 'setup_guide'
                  ? 'border-blue-600 text-slate-900 font-semibold'
                  : 'border-transparent'
              }`}
            >
              Setup Guide
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action / Account Menu */}
        <div className="relative flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleStartNewArticle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <PenSquare className="w-3.5 h-3.5" />
            <span>Write Article</span>
          </button>

          {!currentUser ? (
            <button
              type="button"
              onClick={() => setAuthModalMode('login')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-slate-200 hover:border-slate-300 rounded-lg text-slate-800 whitespace-nowrap shrink-0"
              >
                <AuthorAvatar
                  name={currentUser.name}
                  avatarUrl={currentUser.avatarUrl}
                  sizeClass="w-6 h-6 text-[10px]"
                />
                <span className="max-w-[120px] truncate">{currentUser.name}</span>
              </button>

              {accountMenuOpen && (
                <div
                  onMouseLeave={() => setAccountMenuOpen(false)}
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 text-xs"
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-semibold text-slate-900 truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize">
                      Role: {currentUser.role}
                    </div>
                  </div>

                  {(currentUser.role === 'blogger' ||
                    currentUser.role === 'admin') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleStartNewArticle();
                        }}
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                      >
                        <PenSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>Write New Article</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setRoute('blogger_dashboard');
                        }}
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
                      >
                        Blogger Dashboard
                      </button>
                    </>
                  )}

                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setRoute('admin_dashboard');
                      }}
                      className="w-full px-4 py-2 text-left text-violet-700 font-semibold hover:bg-slate-50"
                    >
                      Admin Moderation Console
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setRoute('reader_activity');
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
                  >
                    Reading & Comment Activity
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setAuthModalMode('profile');
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setAuthModalMode('login');
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
                  >
                    Switch Account / Role
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Compact Mobile Navigation Strip */}
      <div className="md:hidden border-b border-slate-200 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600 bg-slate-50/60">
        <button
          type="button"
          onClick={() => setRoute('home')}
          className={`whitespace-nowrap ${
            route === 'home' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Explore
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveAuthorId(null);
            setRoute('authors');
          }}
          className={`whitespace-nowrap ${
            route === 'authors' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Bloggers
        </button>
        <button
          type="button"
          onClick={handleStartNewArticle}
          className={`whitespace-nowrap font-semibold ${
            route === 'editor' ? 'text-blue-600' : 'text-slate-800'
          }`}
        >
          Write
        </button>
        {currentUser &&
          (currentUser.role === 'blogger' || currentUser.role === 'admin') && (
            <button
              type="button"
              onClick={() => setRoute('blogger_dashboard')}
              className={`whitespace-nowrap ${
                route === 'blogger_dashboard' ? 'text-blue-600 font-semibold' : ''
              }`}
            >
              Dashboard
            </button>
          )}
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setRoute('admin_dashboard')}
            className={`whitespace-nowrap ${
              route === 'admin_dashboard' ? 'text-violet-600 font-semibold' : ''
            }`}
          >
            Admin
          </button>
        )}
        <button
          type="button"
          onClick={() => setRoute('setup_guide')}
          className={`whitespace-nowrap ${
            route === 'setup_guide' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Setup Guide
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {route === 'home' &&
          (feedLoading ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
              <div className="h-12 w-2/3 bg-slate-100 rounded animate-pulse" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 aspect-[16/9] bg-slate-100 rounded-xl animate-pulse" />
                <div className="lg:col-span-5 space-y-6">
                  <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          ) : (
            <HomeView
              articles={articles}
              trending={trending}
              featured={featured}
              popularBloggers={popularBloggers}
              categories={categories}
              currentUser={currentUser}
              onSelectArticle={handleOpenArticle}
              onSelectAuthor={handleOpenAuthor}
              onOpenAuth={(m) => setAuthModalMode(m)}
              onStartWriting={handleStartNewArticle}
            />
          ))}

        {route === 'article' && activeArticleId && (
          <ArticleReaderView
            articleId={activeArticleId}
            currentUser={currentUser}
            onBack={() => {
              refreshFeed();
              setRoute('home');
            }}
            onSelectArticle={handleOpenArticle}
            onSelectAuthor={handleOpenAuthor}
            onEditArticle={(art) => {
              setEditingArticle(art);
              setRoute('editor');
            }}
            onArticleDeleted={() => {
              refreshFeed();
              setRoute('home');
            }}
            onOpenAuth={(m) => setAuthModalMode(m)}
          />
        )}

        {route === 'authors' && (
          <AuthorsDirectoryView
            authors={popularBloggers}
            selectedAuthorId={activeAuthorId}
            onSelectAuthor={(id) => setActiveAuthorId(id)}
            onSelectArticle={handleOpenArticle}
          />
        )}

        {route === 'editor' && currentUser && (
            <BlogEditorView
              editingArticle={editingArticle}
              currentUser={currentUser}
              onCancel={() => {
                refreshFeed();
                setRoute('home');
              }}
              onSaved={(saved) => {
                refreshFeed();
                if (saved.status === 'published') {
                  setActiveArticleId(saved.id);
                  setRoute('article');
                } else {
                  setRoute('blogger_dashboard');
                }
              }}
              onDeleted={() => {
                refreshFeed();
                setRoute('home');
              }}
            />
          )}

        {route === 'blogger_dashboard' && currentUser && (
            <BloggerDashboardView
              currentUser={currentUser}
              onWriteNew={handleStartNewArticle}
              onEditArticleById={handleEditArticleById}
              onViewArticle={handleOpenArticle}
              onOpenProfileModal={() => setAuthModalMode('profile')}
            />
          )}

        {route === 'admin_dashboard' &&
          currentUser &&
          currentUser.role === 'admin' && (
            <AdminDashboardView
              currentUser={currentUser}
              onViewArticle={handleOpenArticle}
              onEditArticleById={handleEditArticleById}
            />
          )}

        {route === 'reader_activity' && currentUser && (
          <ReaderActivityView
            currentUser={currentUser}
            onSelectArticle={handleOpenArticle}
            onOpenProfileModal={() => setAuthModalMode('profile')}
            onStartWriting={handleStartNewArticle}
          />
        )}

        {route === 'setup_guide' && <SetupAndArchitectureView />}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-200 bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="font-serif text-lg font-bold text-slate-900">
              Vibe Blogs Platform
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Free multi-author publishing platform with transparent engagement analytics. Anyone can publish for free.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <button
              type="button"
              onClick={() => setRoute('home')}
              className="hover:text-slate-900"
            >
              Articles
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAuthorId(null);
                setRoute('authors');
              }}
              className="hover:text-slate-900"
            >
              Authors
            </button>
            <button
              type="button"
              onClick={() => setRoute('setup_guide')}
              className="hover:text-slate-900"
            >
              Setup & Free-Tier Guide
            </button>
            {!currentUser && (
              <button
                type="button"
                onClick={() => setAuthModalMode('register')}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Register as Blogger
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Auth / Profile Modal */}
      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          currentUser={currentUser}
          onClose={() => setAuthModalMode(null)}
          onAuthenticated={(user) => {
            setCurrentUser(user);
            refreshFeed();
          }}
        />
      )}
    </div>
  );
}

export default App;
