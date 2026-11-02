export type UserRole = 'admin' | 'blogger' | 'reader';
export type AccountStatus = 'active' | 'suspended';
export type ArticleStatus = 'draft' | 'pending_review' | 'published' | 'rejected';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  bio: string;
  avatarUrl: string;
  headline: string;
  website?: string;
  createdAt: string;
}

export interface PublicAuthor {
  id: string;
  name: string;
  role: UserRole;
  bio: string;
  avatarUrl: string;
  headline: string;
  website?: string;
  createdAt: string;
  publishedCount: number;
  totalViews: number;
}

export interface ArticleBlockImage {
  url: string;
  caption: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  featuredImage: string;
  featuredImageCaption: string;
  category: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorHeadline: string;
  AuthorBio?: string;
  status: ArticleStatus;
  featured: boolean;
  moderationNote?: string;
  estimatedReadMinutes: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  // Computed live from database events & relations:
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe?: boolean;
}

export interface CommentItem {
  id: string;
  articleId: string;
  articleTitle?: string;
  parentId: string | null;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
}

export interface ContentReport {
  id: string;
  targetType: 'article' | 'comment';
  targetId: string;
  targetPreview: string;
  articleId: string;
  reporterId: string | null;
  reporterName: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface TimeSeriesPoint {
  label: string;
  dateKey: string;
  views: number;
  uniqueVisitors: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface ScrollEngagementStats {
  reached25: number;
  reached50: number;
  reached75: number;
  reached100: number;
  pct25: number;
  pct50: number;
  pct75: number;
  pct100: number;
}

export interface IndividualArticleAnalytics {
  articleId: string;
  title: string;
  category: string;
  status: ArticleStatus;
  publishedAt: string | null;
  updatedAt: string;
  moderationNote?: string;
  totalViews: number;
  uniqueVisitors: number;
  estimatedReaders: number;
  avgReadingSeconds: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  scrollEngagement: ScrollEngagementStats;
  dailySeries: TimeSeriesPoint[];
}

export interface BloggerDashboardData {
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    publishedArticles: number;
    draftArticles: number;
    pendingArticles: number;
    totalComments: number;
    totalLikes: number;
    totalShares: number;
    avgReadingSeconds: number;
    storageUsedBytes: number;
    storageLimitBytes: number;
  };
  mostPopularArticle: IndividualArticleAnalytics | null;
  dailyChart: TimeSeriesPoint[];
  weeklyChart: TimeSeriesPoint[];
  monthlyChart: TimeSeriesPoint[];
  articlesAnalytics: IndividualArticleAnalytics[];
}

export interface AdminDashboardData {
  summary: {
    totalBloggers: number;
    totalReaders: number;
    totalAdmins: number;
    publishedPosts: number;
    pendingPosts: number;
    draftPosts: number;
    rejectedPosts: number;
    totalWebsiteViews: number;
    totalUniqueVisitors: number;
    totalComments: number;
    openReports: number;
  };
  dailyTraffic: TimeSeriesPoint[];
  mostPopularArticles: Array<{
    id: string;
    title: string;
    authorName: string;
    category: string;
    status: ArticleStatus;
    views: number;
    likes: number;
    comments: number;
    publishedAt: string | null;
  }>;
  mostActiveBloggers: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    status: AccountStatus;
    publishedPosts: number;
    totalViews: number;
    totalComments: number;
  }>;
  users: UserProfile[];
  allArticles: Article[];
  recentComments: CommentItem[];
  reports: ContentReport[];
}

export interface ReaderActivityData {
  myComments: CommentItem[];
  likedArticles: Article[];
  recentlyReadArticles: Article[];
}
