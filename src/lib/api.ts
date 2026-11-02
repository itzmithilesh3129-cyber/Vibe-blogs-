import type {
  AdminDashboardData,
  Article,
  ArticleStatus,
  BloggerDashboardData,
  CommentItem,
  PublicAuthor,
  ReaderActivityData,
  UserProfile,
  UserRole,
} from '../types';

const TOKEN_STORAGE_KEY = 'vb_session_token';
const VISITOR_STORAGE_KEY = 'vb_anonymous_visitor_key';
const READ_HISTORY_KEY = 'vb_recent_read_ids';

export function getVisitorKey(): string {
  try {
    let existing = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!existing) {
      existing =
        'vis_' +
        Math.random().toString(36).slice(2, 12) +
        '_' +
        Date.now().toString(36);
      localStorage.setItem(VISITOR_STORAGE_KEY, existing);
    }
    return existing;
  } catch {
    return 'vis_ephemeral_session';
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore private browsing storage issues
  }
}

export function recordLocalReadHistory(articleId: string): void {
  try {
    const raw = localStorage.getItem(READ_HISTORY_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const updated = [articleId, ...list.filter((id) => id !== articleId)].slice(0, 12);
    localStorage.setItem(READ_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage error
  }
}

export function getLocalReadHistory(): string[] {
  try {
    const raw = localStorage.getItem(READ_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Visitor-Key': getVisitorKey(),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

// Client-side image compression for free-tier friendly uploads (<= 900px wide JPEG ~60-120KB)
export async function compressImageFile(file: File, maxWidth = 1100): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid JPEG, PNG, or WebP image file.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Selected image exceeds 8 MB. Choose a smaller image.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const api = {
  // Authentication & Profiles
  getMe: () => requestJson<{ user: UserProfile | null }>('/api/auth/me'),

  login: (email: string, password: string) =>
    requestJson<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  demoLogin: (role: UserRole) =>
    requestJson<{ token: string; user: UserProfile }>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  googleLogin: (payload: {
    email: string;
    name: string;
    avatarUrl?: string;
    googleId?: string;
  }) =>
    requestJson<{ token: string; user: UserProfile }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'blogger' | 'reader';
    headline?: string;
    bio?: string;
  }) =>
    requestJson<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    requestJson<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  updateProfile: (payload: {
    name: string;
    headline: string;
    bio: string;
    website?: string;
    avatarUrl?: string;
  }) =>
    requestJson<{ user: UserProfile }>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Public Discovery & Reading
  getHomeFeed: () =>
    requestJson<{
      articles: Article[];
      trending: Article[];
      featured: Article[];
      popularBloggers: PublicAuthor[];
      categories: Array<{ name: string; count: number; views: number }>;
    }>('/api/public/feed'),

  getAuthorProfile: (authorId: string) =>
    requestJson<{ author: PublicAuthor; articles: Article[] }>(
      `/api/public/authors/${encodeURIComponent(authorId)}`
    ),

  getArticleDetail: (articleId: string) =>
    requestJson<{
      article: Article;
      author: PublicAuthor;
      comments: CommentItem[];
      related: Article[];
    }>(`/api/articles/${encodeURIComponent(articleId)}`),

  // Real Analytics Database Events (Views, Scroll Progress, Reading Duration, Shares)
  trackArticleEvent: (
    articleId: string,
    payload: {
      eventType: 'view' | 'scroll' | 'read_time' | 'share';
      scrollDepth?: 25 | 50 | 75 | 100;
      durationSeconds?: number;
      sessionId?: string;
    }
  ) =>
    requestJson<{
      recorded: boolean;
      deduplicated?: boolean;
      viewCount: number;
      shareCount: number;
    }>(`/api/articles/${encodeURIComponent(articleId)}/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleLike: (articleId: string) =>
    requestJson<{ liked: boolean; likeCount: number }>(
      `/api/articles/${encodeURIComponent(articleId)}/like`,
      { method: 'POST' }
    ),

  addComment: (articleId: string, content: string, parentId: string | null = null) =>
    requestJson<{ comment: CommentItem; commentCount: number }>(
      `/api/articles/${encodeURIComponent(articleId)}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ content, parentId }),
      }
    ),

  deleteComment: (commentId: string) =>
    requestJson<{ ok: boolean }>(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
    }),

  submitReport: (payload: {
    targetType: 'article' | 'comment';
    targetId: string;
    articleId: string;
    reason: string;
    details: string;
  }) =>
    requestJson<{ ok: boolean }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Blogger Publishing & Private Personal Analytics
  createArticle: (payload: {
    title: string;
    excerpt: string;
    contentHtml: string;
    featuredImage: string;
    featuredImageCaption: string;
    category: string;
    tags: string[];
    status: ArticleStatus;
  }) =>
    requestJson<{ article: Article }>('/api/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateArticle: (
    articleId: string,
    payload: {
      title: string;
      excerpt: string;
      contentHtml: string;
      featuredImage: string;
      featuredImageCaption: string;
      category: string;
      tags: string[];
      status: ArticleStatus;
      featured?: boolean;
      moderationNote?: string;
    }
  ) =>
    requestJson<{ article: Article }>(`/api/articles/${encodeURIComponent(articleId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteArticle: (articleId: string) =>
    requestJson<{ ok: boolean }>(`/api/articles/${encodeURIComponent(articleId)}`, {
      method: 'DELETE',
    }),

  getBloggerDashboard: () =>
    requestJson<BloggerDashboardData>('/api/blogger/dashboard'),

  getReaderActivity: (recentIds: string[]) =>
    requestJson<ReaderActivityData>(
      `/api/reader/activity?recent=${encodeURIComponent(recentIds.join(','))}`
    ),

  // Admin Moderation & Platform Analytics
  getAdminDashboard: () => requestJson<AdminDashboardData>('/api/admin/dashboard'),

  moderateArticle: (
    articleId: string,
    payload: { status?: ArticleStatus; featured?: boolean; moderationNote?: string }
  ) =>
    requestJson<{ article: Article }>(
      `/api/admin/articles/${encodeURIComponent(articleId)}/moderate`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  updateUserByAdmin: (
    userId: string,
    payload: { role?: UserRole; status?: 'active' | 'suspended' }
  ) =>
    requestJson<{ user: UserProfile }>(
      `/api/admin/users/${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  resolveReport: (
    reportId: string,
    action: 'dismiss' | 'delete_target'
  ) =>
    requestJson<{ ok: boolean }>(`/api/admin/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
};
