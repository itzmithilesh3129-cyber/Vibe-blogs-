import React, { useState } from 'react';
import { X, Upload, ShieldCheck, PenTool, BookOpen, ArrowRight } from 'lucide-react';
import { api, compressImageFile, setAuthToken } from '../lib/api';
import { AuthorAvatar } from './EditorialImage';
import type { UserProfile, UserRole } from '../types';

interface AuthModalProps {
  initialMode: 'login' | 'register' | 'profile';
  currentUser: UserProfile | null;
  onClose: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

export const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.42l4.04-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode,
  currentUser,
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>(initialMode);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'blogger' | 'reader'>('blogger');
  const [headline, setHeadline] = useState(currentUser?.headline || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [website, setWebsite] = useState(currentUser?.website || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google ID Sign-in State
  const [showCustomGoogle, setShowCustomGoogle] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('itzmithilesh3129@gmail.com');
  const [googleNameInput, setGoogleNameInput] = useState('Mithilesh');

  const handleGoogleSignIn = async (targetEmail: string, targetName: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.googleLogin({
        email: targetEmail,
        name: targetName,
        googleId: `gid_${targetEmail.replace(/[^a-z0-9]/gi, '_')}`,
      });
      setAuthToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoRole: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.demoLogin(demoRole);
      setAuthToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await compressImageFile(file, 320);
      setAvatarUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar upload failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        setAuthToken(res.token);
        onAuthenticated(res.user);
        onClose();
      } else if (mode === 'register') {
        const res = await api.register({
          name,
          email,
          password,
          role,
          headline,
          bio,
        });
        setAuthToken(res.token);
        onAuthenticated(res.user);
        onClose();
      } else if (mode === 'profile' && currentUser) {
        const res = await api.updateProfile({
          name,
          headline,
          bio,
          website,
          avatarUrl,
        });
        onAuthenticated(res.user);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-serif text-xl font-semibold text-slate-900">
              {mode === 'profile'
                ? 'Edit Author & Account Profile'
                : mode === 'register'
                ? 'Join Vibe Blogs Platform'
                : 'Sign In to Vibe Blogs Platform'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Publish your own content, manage articles, and track reader engagement.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {mode !== 'profile' && (
            <>
              {/* PRIMARY: Sign In With Google ID */}
              <div className="mb-6 space-y-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogleSignIn('itzmithilesh3129@gmail.com', 'Mithilesh')}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-lg shadow-2xs transition-all disabled:opacity-60"
                >
                  <GoogleGIcon className="w-4 h-4 shrink-0" />
                  <span>Sign in with Google ID (itzmithilesh3129@gmail.com)</span>
                </button>

                {!showCustomGoogle ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogle(true)}
                    className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
                  >
                    Or use another Google account ID
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="font-semibold text-slate-700">
                      Sign in with another Google ID:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="email"
                        value={googleEmailInput}
                        onChange={(e) => setGoogleEmailInput(e.target.value)}
                        placeholder="Google Email (e.g. user@gmail.com)"
                        className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                      <input
                        type="text"
                        value={googleNameInput}
                        onChange={(e) => setGoogleNameInput(e.target.value)}
                        placeholder="Your Full Name"
                        className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCustomGoogle(false)}
                        className="px-2.5 py-1 text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={loading || !googleEmailInput.includes('@')}
                        onClick={() => handleGoogleSignIn(googleEmailInput, googleNameInput || 'Author')}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-400 font-medium">
                    or continue with email & password
                  </span>
                </div>
              </div>

              {/* Tab Switcher: Sign In vs Register Free */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Free
                </button>
              </div>

              {/* Instant 1-Click Demo Accounts */}
              <div className="mb-6 pb-5 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-2.5">
                  Instant Demo Roles (1-Click Switcher):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('blogger')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 hover:border-blue-600 hover:text-blue-600 transition-colors whitespace-nowrap"
                  >
                    <PenTool className="w-3.5 h-3.5 text-blue-600" />
                    <span>Blogger</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('reader')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 hover:border-violet-600 hover:text-violet-600 transition-colors whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                    <span>Reader</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('admin')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium border border-slate-200 rounded-lg text-slate-800 hover:border-slate-900 hover:text-slate-900 transition-colors whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700 space-y-2">
              <div>{error}</div>
              {mode === 'login' && (error.toLowerCase().includes('register') || error.toLowerCase().includes('no account')) && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1 text-blue-700 font-semibold underline hover:text-blue-800"
                >
                  Create a new free account with this email &rarr;
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Type (100% Free Forever)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('blogger')}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      role === 'blogger'
                        ? 'border-blue-600 bg-blue-50/50 text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">
                      Blogger (Author)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Publish articles & track analytics
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('reader')}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      role === 'reader'
                        ? 'border-violet-600 bg-violet-50/50 text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">
                      Reader & Writer
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Like, comment & publish anytime
                    </div>
                  </button>
                </div>
              </div>
            )}

            {mode === 'profile' && (
              <div className="flex items-center gap-4 pb-2">
                <AuthorAvatar name={name || 'User'} avatarUrl={avatarUrl} sizeClass="w-14 h-14 text-base" />
                <div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Profile Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="ml-2 text-xs text-slate-500 hover:text-red-600"
                    >
                      Reset
                    </button>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Automatically compressed client-side for fast loading.
                  </p>
                </div>
              </div>
            )}

            {(mode === 'register' || mode === 'profile') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Mithilesh"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            )}

            {mode !== 'profile' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                  {mode === 'login' && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                      <span>Quick autofill:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('marcus@vibeblogs.org');
                          setPassword('blogger123');
                          setError(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                      >
                        Blogger
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('admin@vibeblogs.org');
                          setPassword('admin123');
                          setError(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('reader@vibeblogs.org');
                          setPassword('reader123');
                          setError(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                      >
                        Reader
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {(mode === 'register' || mode === 'profile') && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Author Headline / Role Title
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g., Software Engineer & Technical Essayist"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell readers what topics you explore..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 resize-none"
                  />
                </div>
              </>
            )}

            {mode === 'profile' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personal Website (Optional)
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourdomain.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {loading
                  ? 'Saving...'
                  : mode === 'profile'
                  ? 'Save Profile'
                  : mode === 'register'
                  ? 'Create Free Account'
                  : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
