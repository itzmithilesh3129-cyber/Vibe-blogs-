import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  AccountStatus,
  AdminDashboardData,
  Article,
  ArticleStatus,
  BloggerDashboardData,
  CommentItem,
  ContentReport,
  IndividualArticleAnalytics,
  PublicAuthor,
  TimeSeriesPoint,
  UserProfile,
  UserRole,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'vibe-blogs-db.json');
const VIEW_DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6-hour duplicate view prevention window
const FREE_TIER_AUTHOR_STORAGE_BYTES = 25 * 1024 * 1024; // 25 MB per free author quota

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface StoredArticle {
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
  status: ArticleStatus;
  featured: boolean;
  moderationNote?: string;
  estimatedReadMinutes: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface AnalyticsEventRecord {
  id: string;
  articleId: string;
  authorId: string;
  eventType: 'view' | 'scroll' | 'read_time' | 'share';
  visitorHash: string;
  sessionId: string;
  scrollDepth?: 25 | 50 | 75 | 100;
  durationSeconds?: number;
  createdAt: string;
}

interface LikeRecord {
  id: string;
  articleId: string;
  userId: string;
  createdAt: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  sessions: SessionRecord[];
  articles: StoredArticle[];
  comments: CommentItem[];
  likes: LikeRecord[];
  events: AnalyticsEventRecord[];
  reports: ContentReport[];
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`vb_pw_salt_v1:${password}`).digest('hex');
}

function hashVisitor(rawVisitor: string): string {
  return crypto
    .createHash('sha256')
    .update(`vb_anon_visitor_v1:${rawVisitor}`)
    .digest('hex')
    .slice(0, 24);
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 72) || 'untitled-post'
  );
}

function estimateReadingMinutes(html: string): number {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plain ? plain.split(' ').length : 0;
  return Math.max(1, Math.round(words / 210));
}

function createSeedDatabase(): DatabaseSchema {
  const now = new Date('2026-11-01T18:00:00Z');
  const daysAgo = (d: number, hourOffset = 0) =>
    new Date(now.getTime() - d * 86400000 + hourOffset * 3600000).toISOString();

  const users: StoredUser[] = [
    {
      id: 'usr_admin_1',
      name: 'Elena Rostova',
      email: 'admin@vibeblogs.org',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      status: 'active',
      headline: 'Editor-in-Chief & Platform Steward at Vibe Blogs',
      bio: 'Curating independent engineering, architecture, and design essays while keeping open publishing sustainable and free.',
      avatarUrl: '',
      website: 'https://vibeblogs.org',
      createdAt: daysAgo(90),
    },
    {
      id: 'usr_blogger_1',
      name: 'Marcus Vance',
      email: 'marcus@vibeblogs.org',
      passwordHash: hashPassword('blogger123'),
      role: 'blogger',
      status: 'active',
      headline: 'Principal Systems Architect & Essayist',
      bio: 'Writing about resilient distributed systems, zero-cost cloud architectures, and humane software engineering practices.',
      avatarUrl: '',
      website: 'https://marcusvance.dev',
      createdAt: daysAgo(65),
    },
    {
      id: 'usr_blogger_2',
      name: 'Clara Lindqvist',
      email: 'clara@vibeblogs.org',
      passwordHash: hashPassword('blogger123'),
      role: 'blogger',
      status: 'active',
      headline: 'Editorial Designer & Typography Researcher',
      bio: 'Exploring digital reading ergonomics, Swiss grid heritage, and calm interfaces across web publications.',
      avatarUrl: '',
      website: 'https://claralindqvist.se',
      createdAt: daysAgo(54),
    },
    {
      id: 'usr_blogger_3',
      name: 'Kenji Takahashi',
      email: 'kenji@vibeblogs.org',
      passwordHash: hashPassword('blogger123'),
      role: 'blogger',
      status: 'active',
      headline: 'Urban Ecologist & Architectural Writer',
      bio: 'Documenting mass-timber civic spaces, micro-climate rooftops, and low-carbon urban retrofits across Asia and Europe.',
      avatarUrl: '',
      createdAt: daysAgo(40),
    },
    {
      id: 'usr_reader_1',
      name: 'Nadia Okafor',
      email: 'reader@vibeblogs.org',
      passwordHash: hashPassword('reader123'),
      role: 'reader',
      status: 'active',
      headline: 'Product Researcher & Avid Reader',
      bio: 'Collecting long-form essays on systems design, urbanism, and independent publishing.',
      avatarUrl: '',
      createdAt: daysAgo(28),
    },
    {
      id: 'usr_reader_2',
      name: 'Samir Patel',
      email: 'samir@vibeblogs.org',
      passwordHash: hashPassword('reader123'),
      role: 'reader',
      status: 'active',
      headline: 'Frontend Engineer',
      bio: 'Interested in web typography, performance budgets, and open-source tools.',
      avatarUrl: '',
      createdAt: daysAgo(15),
    },
  ];

  const articles: StoredArticle[] = [
    {
      id: 'art_1',
      slug: 'designing-calm-software-in-an-attention-economy',
      title: 'Designing Calm Software in a Relentless Attention Economy',
      excerpt:
        'Why enduring digital tools prioritize clear typographic rhythm, predictable state transitions, and respect for uninterrupted human thought.',
      contentHtml: `<p>Every piece of software carries an implicit theory of human attention. When interfaces bombard readers with floating popups, pulsing badges, and infinite notification streams, they optimize for momentary clicks at the expense of deep comprehension.</p>
<h2>1. Hierarchy Begins With Subtraction</h2>
<p>Calm software does not mean featureless software. Rather, it means organizing dense capability behind quiet, legible structure. When an author opens a publishing workspace or an engineer inspects telemetry, primary actions remain immediately reachable while secondary metadata recedes into clean unboxed text.</p>
<blockquote>Good editorial tools disappear into the cadence of reading; you remember the argument, never the chrome surrounding it.</blockquote>
<h2>2. Measuring Real Engagement Without Surveillance</h2>
<p>Traditional publishing platforms track invasive cross-site profiles just to tell an author whether an essay resonated. By contrast, anonymous session-scoped scroll milestones—measuring 25%, 50%, 75%, and 100% completion alongside active reading duration—give writers actionable feedback while keeping reader identities completely private.</p>
<h3>Principles we practice daily</h3>
<ul>
<li>Constrain reading columns to 65–72 characters per line for effortless eye tracking.</li>
<li>Pair high-contrast editorial serifs with crisp geometric sans-serif controls.</li>
<li>Deduplicate view counters over a rolling six-hour window so page refreshes never distort author metrics.</li>
</ul>
<p>When writers trust their tools and readers trust the page, independent publishing thrives without paywalls or intrusive ad networks.</p>`,
      featuredImage: 'asset:workspace',
      featuredImageCaption:
        'Sunlight across an architectural research studio designed around quiet, uninterrupted focus.',
      category: 'Design & Craft',
      tags: ['Calm Technology', 'Editorial Design', 'UX Architecture'],
      authorId: 'usr_blogger_1',
      status: 'published',
      featured: true,
      estimatedReadMinutes: 5,
      createdAt: daysAgo(21),
      updatedAt: daysAgo(20),
      publishedAt: daysAgo(20),
    },
    {
      id: 'art_2',
      slug: 'swiss-grids-and-the-science-of-digital-readability',
      title: 'Swiss Grids and the Enduring Science of Digital Readability',
      excerpt:
        'From Josef Müller-Brockmann’s print manuals to fluid responsive viewports: how mathematical proportions elevate long-form web essays.',
      contentHtml: `<p>Mid-century Swiss typographers solved problems on paper that modern web teams still wrestle with on high-density displays. How do you guide the eye across multi-tier editorial hierarchies without resorting to heavy boxes and decorative clutter?</p>
<h2>Proportion Over Ornamentation</h2>
<p>When margins breathe and baseline increments stay consistent, hairlines and whitespace do all the structural heavy lifting. A lead story commands salience through scale and photography, while secondary essays align into disciplined columns beneath it.</p>
<blockquote>Typography is a servant of communication; clarity is its highest courtesy to the reader.</blockquote>
<h2>Tabular Figures in Author Dashboards</h2>
<p>Editorial polish extends beyond the article page. Inside analytics tables, setting numbers in monospace tabular figures ensures decimal points and thousands separators align vertically down every row, turning raw event counts into effortless visual comparisons.</p>`,
      featuredImage: 'asset:typography',
      featuredImageCaption:
        'Archival Swiss typographic specimen cards paired with a brass pica scale on travertine stone.',
      category: 'Typography',
      tags: ['Typography', 'Grid Systems', 'Publishing'],
      authorId: 'usr_blogger_2',
      status: 'published',
      featured: true,
      estimatedReadMinutes: 4,
      createdAt: daysAgo(16),
      updatedAt: daysAgo(15),
      publishedAt: daysAgo(15),
    },
    {
      id: 'art_3',
      slug: 'zero-cost-serverless-architectures-for-independent-writers',
      title: 'Zero-Cost Cloud Architectures for Multi-Author Publications',
      excerpt:
        'A practical engineering blueprint for running authentication, Firestore security rules, and compressed media well inside free-tier quotas.',
      contentHtml: `<p>One of the most common myths in software engineering is that hosting a multi-author community requires hundreds of dollars in monthly cloud bills from day one. With thoughtful schema design and client-side image optimization, free tiers easily support thousands of monthly readers.</p>
<h2>Keeping Document Reads Lean</h2>
<p>Cloud Firestore’s free Spark tier provides 50,000 document reads and 20,000 writes every single day. By storing concise summary fields on published article documents and isolating granular engagement events in a dedicated collection, homepage loads stay fast and economical.</p>
<pre><code>// Example deterministic deduplication key
const dedupeKey = sha256(visitorId + ":" + articleId + ":" + sixHourBucket);</code></pre>
<h2>Client-Side Image Compression</h2>
<p>Before uploading a featured cover photograph, resizing high-resolution camera files to 1100px width at 82% JPEG quality trims a 6 MB file down to roughly 95 KB—preserving crisp retina clarity while stretching 5 GB of free storage across tens of thousands of illustrations.</p>`,
      featuredImage: 'asset:cloud',
      featuredImageCaption:
        'Optical prisms refracting cobalt and violet spectra—an analogy for clean permission boundaries in multi-tenant databases.',
      category: 'Engineering',
      tags: ['Firebase', 'Cloud Architecture', 'Free Tier', 'Security'],
      authorId: 'usr_blogger_1',
      status: 'published',
      featured: false,
      estimatedReadMinutes: 6,
      createdAt: daysAgo(11),
      updatedAt: daysAgo(10),
      publishedAt: daysAgo(10),
    },
    {
      id: 'art_4',
      slug: 'mass-timber-and-rooftop-microclimates-in-dense-cities',
      title: 'Mass Timber and Rooftop Microclimates in High-Density Cities',
      excerpt:
        'How cross-laminated timber pavilions and native rooftop meadows are lowering summer urban heat islands by up to four degrees Celsius.',
      contentHtml: `<p>Walk onto a conventional asphalt roof in August and surface temperatures routinely exceed sixty degrees Celsius. Step onto a planted mass-timber terrace two blocks away and the ambient air drops noticeably within seconds.</p>
<h2>Structural Lightness Enables Green Retrofits</h2>
<p>Because cross-laminated timber weighs roughly one-fifth as much as reinforced concrete of comparable strength, mid-century commercial buildings can often support new communal pavilions and deep soil beds without costly foundation underpinning.</p>
<blockquote>Cities heal fastest when ecological infrastructure doubles as generous public gathering space.</blockquote>
<p>From Melbourne to Zurich, municipal incentives are turning underused rooftops into quiet neighborhood sanctuaries for reading, conversation, and urban biodiversity.</p>`,
      featuredImage: 'asset:cities',
      featuredImageCaption:
        'A timber rooftop commons framed by drought-tolerant native grasses at golden hour.',
      category: 'Architecture & Cities',
      tags: ['Urbanism', 'Sustainability', 'Architecture'],
      authorId: 'usr_blogger_3',
      status: 'published',
      featured: true,
      estimatedReadMinutes: 4,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(6),
      publishedAt: daysAgo(6),
    },
    {
      id: 'art_5',
      slug: 'why-independent-technical-blogs-are-returning',
      title: 'Why Long-Form Independent Blogs Are Quietly Thriving Again',
      excerpt:
        'After a decade of ephemeral micro-posts, readers and writers are returning to owned URLs, thoughtful comment threads, and durable archives.',
      contentHtml: `<p>Short-form feeds excel at breaking news, yet their half-life is measured in hours. Try finding a nuanced debugging post or architectural retrospective you glimpsed on a social stream six months ago and it has vanished into an unsearchable scroll.</p>
<h2>Durable Archives Reward Craft</h2>
<p>Well-structured essays compound in value over years. When authors can organize posts by category, inspect genuine completion rates, and converse with readers in threaded discussions, writing becomes a cumulative body of work rather than a daily treadmill.</p>
<p>Open platforms that allow creators to register for free and retain full editorial control over their drafts and published essays form the backbone of a healthier web.</p>`,
      featuredImage: 'asset:creator',
      featuredImageCaption:
        'Field notebooks, fountain pens, and studio audio gear on an independent writer’s oak desk.',
      category: 'Culture & Media',
      tags: ['Independent Web', 'Writing', 'Creators'],
      authorId: 'usr_blogger_2',
      status: 'published',
      featured: false,
      estimatedReadMinutes: 3,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
      publishedAt: daysAgo(3),
    },
    {
      id: 'art_6',
      slug: 'observability-patterns-for-edge-databases',
      title: 'Practical Latency Budgets for Edge-Cached Content APIs',
      excerpt:
        'A field guide to structuring stale-while-revalidate headers and lightweight write-behind event queues for sub-50ms article loads.',
      contentHtml: `<p>Readers notice latency long before they can articulate it. Crossing the 150-millisecond threshold makes page transitions feel sluggish, whereas sub-50ms responses feel instantaneous—like turning physical paper.</p>
<h2>Separating Read Paths From Telemetry Writes</h2>
<p>By rendering article HTML immediately and dispatching view and scroll milestones asynchronously in the background, publishing platforms achieve zero-latency reading while still capturing accurate analytics.</p>`,
      featuredImage: 'asset:cloud',
      featuredImageCaption: 'Precision optical paths modeling low-latency edge request routing.',
      category: 'Engineering',
      tags: ['Performance', 'Edge Computing', 'APIs'],
      authorId: 'usr_blogger_1',
      status: 'pending_review',
      featured: false,
      estimatedReadMinutes: 4,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      publishedAt: null,
    },
    {
      id: 'art_7',
      slug: 'notes-on-minimalist-code-blocks-draft',
      title: 'Notes on Accessible Syntax Highlighting in Daylight Themes',
      excerpt:
        'Working draft examining WCAG AA contrast ratios across slate and alabaster code block palettes.',
      contentHtml: `<p>Draft notes comparing monochrome versus dual-accent syntax tokens for technical tutorials.</p>
<h2>Contrast Checklist</h2>
<ul>
<li>Verify 4.5:1 minimum contrast ratio for comments and punctuation.</li>
<li>Preserve horizontal scroll affordances on narrow mobile viewports.</li>
</ul>`,
      featuredImage: 'asset:workspace',
      featuredImageCaption: 'Drafting typographic contrast tests in daylight.',
      category: 'Design & Craft',
      tags: ['Accessibility', 'Typography'],
      authorId: 'usr_blogger_1',
      status: 'draft',
      featured: false,
      estimatedReadMinutes: 2,
      createdAt: daysAgo(0, -4),
      updatedAt: daysAgo(0, -2),
      publishedAt: null,
    },
  ];

  // Generate authentic historical database events across the past 24 days so charts & metrics are 100% event-driven
  const events: AnalyticsEventRecord[] = [];
  const likes: LikeRecord[] = [];

  const publishedSeedSpecs: Array<{
    articleId: string;
    authorId: string;
    maxDaysBack: number;
    totalSessions: number;
    shareCount: number;
    avgDurationBase: number;
  }> = [
    {
      articleId: 'art_1',
      authorId: 'usr_blogger_1',
      maxDaysBack: 20,
      totalSessions: 64,
      shareCount: 14,
      avgDurationBase: 215,
    },
    {
      articleId: 'art_2',
      authorId: 'usr_blogger_2',
      maxDaysBack: 15,
      totalSessions: 48,
      shareCount: 11,
      avgDurationBase: 185,
    },
    {
      articleId: 'art_3',
      authorId: 'usr_blogger_1',
      maxDaysBack: 10,
      totalSessions: 52,
      shareCount: 16,
      avgDurationBase: 245,
    },
    {
      articleId: 'art_4',
      authorId: 'usr_blogger_3',
      maxDaysBack: 6,
      totalSessions: 39,
      shareCount: 9,
      avgDurationBase: 175,
    },
    {
      articleId: 'art_5',
      authorId: 'usr_blogger_2',
      maxDaysBack: 3,
      totalSessions: 31,
      shareCount: 7,
      avgDurationBase: 155,
    },
  ];

  let evtCounter = 1;
  for (const spec of publishedSeedSpecs) {
    for (let i = 0; i < spec.totalSessions; i++) {
      // Weight slightly more toward recent days for realistic organic curve
      const ratio = Math.pow((i + 1) / spec.totalSessions, 1.25);
      const dayBack = Math.max(
        0,
        Math.min(spec.maxDaysBack, Math.floor((1 - ratio) * spec.maxDaysBack))
      );
      const ts = daysAgo(dayBack, -(i % 12));
      // ~82% unique visitors, ~18% returning visitors on different days
      const visitorIndex = i % 5 === 0 ? Math.max(1, i - 3) : i + 1;
      const visitorHash = hashVisitor(`seed_reader_${spec.articleId}_${visitorIndex}`);
      const sessionId = `ses_${spec.articleId}_${i}`;

      events.push({
        id: `evt_${evtCounter++}`,
        articleId: spec.articleId,
        authorId: spec.authorId,
        eventType: 'view',
        visitorHash,
        sessionId,
        createdAt: ts,
      });

      // Deterministic scroll progression funnel
      const reachRoll = (i * 17 + 7) % 100;
      const milestones: Array<25 | 50 | 75 | 100> = [];
      if (reachRoll < 88) milestones.push(25);
      if (reachRoll < 72) milestones.push(50);
      if (reachRoll < 56) milestones.push(75);
      if (reachRoll < 41) milestones.push(100);

      for (const depth of milestones) {
        events.push({
          id: `evt_${evtCounter++}`,
          articleId: spec.articleId,
          authorId: spec.authorId,
          eventType: 'scroll',
          visitorHash,
          sessionId,
          scrollDepth: depth,
          createdAt: ts,
        });
      }

      const durationSeconds =
        reachRoll >= 88
          ? 9
          : Math.round(spec.avgDurationBase * (0.55 + (milestones.length / 4) * 0.65));

      events.push({
        id: `evt_${evtCounter++}`,
        articleId: spec.articleId,
        authorId: spec.authorId,
        eventType: 'read_time',
        visitorHash,
        sessionId,
        durationSeconds,
        createdAt: ts,
      });

      if (i < spec.shareCount) {
        events.push({
          id: `evt_${evtCounter++}`,
          articleId: spec.articleId,
          authorId: spec.authorId,
          eventType: 'share',
          visitorHash,
          sessionId,
          createdAt: ts,
        });
      }
    }
  }

  // Seed likes
  const likePairs: Array<[string, string, number]> = [
    ['art_1', 'usr_reader_1', 12],
    ['art_1', 'usr_reader_2', 9],
    ['art_1', 'usr_blogger_2', 8],
    ['art_1', 'usr_blogger_3', 5],
    ['art_1', 'usr_admin_1', 4],
    ['art_2', 'usr_reader_1', 10],
    ['art_2', 'usr_blogger_1', 7],
    ['art_2', 'usr_reader_2', 4],
    ['art_3', 'usr_reader_1', 8],
    ['art_3', 'usr_reader_2', 6],
    ['art_3', 'usr_blogger_2', 5],
    ['art_3', 'usr_admin_1', 2],
    ['art_4', 'usr_reader_1', 5],
    ['art_4', 'usr_blogger_1', 4],
    ['art_4', 'usr_blogger_2', 3],
    ['art_5', 'usr_reader_1', 2],
    ['art_5', 'usr_reader_2', 1],
  ];
  likePairs.forEach(([articleId, userId, d], idx) => {
    likes.push({
      id: `lk_${idx + 1}`,
      articleId,
      userId,
      createdAt: daysAgo(d),
    });
  });

  const comments: CommentItem[] = [
    {
      id: 'cmt_1',
      articleId: 'art_1',
      parentId: null,
      userId: 'usr_reader_1',
      userName: 'Nadia Okafor',
      userAvatar: '',
      userRole: 'reader',
      content:
        'The distinction between subtraction and emptiness really resonated with our product team. Unboxed metadata immediately calmed our documentation pages.',
      createdAt: daysAgo(14),
    },
    {
      id: 'cmt_2',
      articleId: 'art_1',
      parentId: 'cmt_1',
      userId: 'usr_blogger_1',
      userName: 'Marcus Vance',
      userAvatar: '',
      userRole: 'blogger',
      content:
        'Thank you, Nadia! Documentation portals are one of the best places to test that principle because readers arrive with high focus.',
      createdAt: daysAgo(13),
    },
    {
      id: 'cmt_3',
      articleId: 'art_2',
      parentId: null,
      userId: 'usr_reader_2',
      userName: 'Samir Patel',
      userAvatar: '',
      userRole: 'reader',
      content:
        'Switching our analytics tables to tabular numerals fixed subtle horizontal jitter we had been chasing for months.',
      createdAt: daysAgo(9),
    },
    {
      id: 'cmt_4',
      articleId: 'art_3',
      parentId: null,
      userId: 'usr_blogger_3',
      userName: 'Kenji Takahashi',
      userAvatar: '',
      userRole: 'blogger',
      content:
        'Compressing field photographs client-side before upload saved over 90% of our storage bucket quota without noticeable quality loss.',
      createdAt: daysAgo(6),
    },
    {
      id: 'cmt_5',
      articleId: 'art_4',
      parentId: null,
      userId: 'usr_reader_1',
      userName: 'Nadia Okafor',
      userAvatar: '',
      userRole: 'reader',
      content:
        'Would love a follow-up essay on rainwater retention layers beneath those mass-timber deck assemblies!',
      createdAt: daysAgo(4),
    },
  ];

  const reports: ContentReport[] = [
    {
      id: 'rep_1',
      targetType: 'comment',
      targetId: 'cmt_3',
      targetPreview:
        'Switching our analytics tables to tabular numerals fixed subtle horizontal jitter...',
      articleId: 'art_2',
      reporterId: 'usr_reader_1',
      reporterName: 'Nadia Okafor',
      reason: 'Accidental Flag Test',
      details: 'Sample moderation queue item so the Admin can test Dismiss vs Delete actions.',
      status: 'open',
      createdAt: daysAgo(2),
    },
  ];

  return {
    users,
    sessions: [],
    articles,
    comments,
    likes,
    events,
    reports,
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = createSeedDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    console.error('Database load fallback initialized:', err);
    return createSeedDatabase();
  }
}

let db: DatabaseSchema = loadDatabase();

function saveDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

function sanitizeUser(u: StoredUser): UserProfile {
  const { passwordHash: _pw, ...profile } = u;
  return profile;
}

function hydrateArticle(raw: StoredArticle, currentUserId?: string): Article {
  const author = db.users.find((u) => u.id === raw.authorId);
  const viewCount = db.events.filter(
    (e) => e.articleId === raw.id && e.eventType === 'view'
  ).length;
  const shareCount = db.events.filter(
    (e) => e.articleId === raw.id && e.eventType === 'share'
  ).length;
  const articleLikes = db.likes.filter((l) => l.articleId === raw.id);
  const commentCount = db.comments.filter((c) => c.articleId === raw.id).length;

  return {
    ...raw,
    authorName: author?.name || 'Unknown Author',
    authorAvatar: author?.avatarUrl || '',
    authorHeadline: author?.headline || 'Contributing Writer',
    AuthorBio: author?.bio || '',
    viewCount,
    likeCount: articleLikes.length,
    commentCount,
    shareCount,
    likedByMe: currentUserId
      ? articleLikes.some((l) => l.userId === currentUserId)
      : false,
  };
}

function buildPublicAuthor(u: StoredUser): PublicAuthor {
  const published = db.articles.filter(
    (a) => a.authorId === u.id && a.status === 'published'
  );
  const publishedIds = new Set(published.map((a) => a.id));
  const totalViews = db.events.filter(
    (e) => e.eventType === 'view' && publishedIds.has(e.articleId)
  ).length;

  return {
    id: u.id,
    name: u.name,
    role: u.role,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    headline: u.headline,
    website: u.website,
    createdAt: u.createdAt,
    publishedCount: published.length,
    totalViews,
  };
}

function computeIndividualArticleAnalytics(article: StoredArticle): IndividualArticleAnalytics {
  const articleEvents = db.events.filter((e) => e.articleId === article.id);
  const viewEvents = articleEvents.filter((e) => e.eventType === 'view');
  const scrollEvents = articleEvents.filter((e) => e.eventType === 'scroll');
  const readTimeEvents = articleEvents.filter((e) => e.eventType === 'read_time');
  const shareEvents = articleEvents.filter((e) => e.eventType === 'share');

  const uniqueVisitorSet = new Set(viewEvents.map((e) => e.visitorHash));
  const uniqueVisitors = uniqueVisitorSet.size;

  const reachedSet = (depth: 25 | 50 | 75 | 100) =>
    new Set(
      scrollEvents
        .filter((e) => (e.scrollDepth || 0) >= depth)
        .map((e) => e.visitorHash)
    );

  const set25 = reachedSet(25);
  const set50 = reachedSet(50);
  const set75 = reachedSet(75);
  const set100 = reachedSet(100);

  // Estimated readers: unique visitors who scrolled >= 25% AND spent >= 15s reading
  const engagedReadVisitors = new Set(
    readTimeEvents
      .filter((e) => (e.durationSeconds || 0) >= 15 && set25.has(e.visitorHash))
      .map((e) => e.visitorHash)
  );
  const estimatedReaders = Math.max(
    engagedReadVisitors.size,
    Math.min(uniqueVisitors, set50.size)
  );

  const validDurations = readTimeEvents
    .map((e) => e.durationSeconds || 0)
    .filter((d) => d >= 5);
  const avgReadingSeconds = validDurations.length
    ? Math.round(
        validDurations.reduce((acc, v) => acc + v, 0) / validDurations.length
      )
    : 0;

  const denom = Math.max(1, uniqueVisitors);
  const pct = (count: number) =>
    uniqueVisitors === 0 ? 0 : Math.min(100, Math.round((count / denom) * 100));

  const totalLikes = db.likes.filter((l) => l.articleId === article.id).length;
  const totalComments = db.comments.filter((c) => c.articleId === article.id).length;

  // Last 14 days daily series for this specific article
  const dailySeries = buildDailySeries([article.id], 14);

  return {
    articleId: article.id,
    title: article.title,
    category: article.category,
    status: article.status,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    moderationNote: article.moderationNote,
    totalViews: viewEvents.length,
    uniqueVisitors,
    estimatedReaders,
    avgReadingSeconds,
    totalLikes,
    totalComments,
    totalShares: shareEvents.length,
    scrollEngagement: {
      reached25: set25.size,
      reached50: set50.size,
      reached75: set75.size,
      reached100: set100.size,
      pct25: pct(set25.size),
      pct50: pct(set50.size),
      pct75: pct(set75.size),
      pct100: pct(set100.size),
    },
    dailySeries,
  };
}

function buildDailySeries(articleIds: string[], daysCount: number): TimeSeriesPoint[] {
  const idSet = new Set(articleIds);
  const anchorMs = Math.max(
    Date.now(),
    ...db.events.map((e) => new Date(e.createdAt).getTime())
  );
  const anchorDate = new Date(anchorMs);
  anchorDate.setUTCHours(0, 0, 0, 0);

  const points: TimeSeriesPoint[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const dayStart = new Date(anchorDate.getTime() - i * 86400000);
    const dateKey = dayStart.toISOString().slice(0, 10);
    const label = dayStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

    const dayEvents = db.events.filter(
      (e) => idSet.has(e.articleId) && e.createdAt.slice(0, 10) === dateKey
    );
    const dayViews = dayEvents.filter((e) => e.eventType === 'view');
    const dayShares = dayEvents.filter((e) => e.eventType === 'share');
    const dayLikes = db.likes.filter(
      (l) => idSet.has(l.articleId) && l.createdAt.slice(0, 10) === dateKey
    );
    const dayComments = db.comments.filter(
      (c) => idSet.has(c.articleId) && c.createdAt.slice(0, 10) === dateKey
    );

    points.push({
      label,
      dateKey,
      views: dayViews.length,
      uniqueVisitors: new Set(dayViews.map((v) => v.visitorHash)).size,
      likes: dayLikes.length,
      comments: dayComments.length,
      shares: dayShares.length,
    });
  }
  return points;
}

function buildWeeklySeries(articleIds: string[], weeksCount: number): TimeSeriesPoint[] {
  const idSet = new Set(articleIds);
  const anchorMs = Math.max(
    Date.now(),
    ...db.events.map((e) => new Date(e.createdAt).getTime())
  );
  const points: TimeSeriesPoint[] = [];

  for (let w = weeksCount - 1; w >= 0; w--) {
    const endMs = anchorMs - w * 7 * 86400000;
    const startMs = endMs - 7 * 86400000;
    const startDate = new Date(startMs);
    const label = `Wk of ${startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })}`;

    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t > startMs && t <= endMs;
    };

    const wkEvents = db.events.filter((e) => idSet.has(e.articleId) && inRange(e.createdAt));
    const wkViews = wkEvents.filter((e) => e.eventType === 'view');

    points.push({
      label,
      dateKey: startDate.toISOString().slice(0, 10),
      views: wkViews.length,
      uniqueVisitors: new Set(wkViews.map((v) => v.visitorHash)).size,
      likes: db.likes.filter((l) => idSet.has(l.articleId) && inRange(l.createdAt)).length,
      comments: db.comments.filter((c) => idSet.has(c.articleId) && inRange(c.createdAt)).length,
      shares: wkEvents.filter((e) => e.eventType === 'share').length,
    });
  }
  return points;
}

function buildMonthlySeries(articleIds: string[], monthsCount: number): TimeSeriesPoint[] {
  const idSet = new Set(articleIds);
  const anchorMs = Math.max(
    Date.now(),
    ...db.events.map((e) => new Date(e.createdAt).getTime())
  );
  const anchor = new Date(anchorMs);
  const points: TimeSeriesPoint[] = [];

  for (let m = monthsCount - 1; m >= 0; m--) {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - m, 1));
    const monthPrefix = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    });

    const mEvents = db.events.filter(
      (e) => idSet.has(e.articleId) && e.createdAt.startsWith(monthPrefix)
    );
    const mViews = mEvents.filter((e) => e.eventType === 'view');

    points.push({
      label,
      dateKey: monthPrefix,
      views: mViews.length,
      uniqueVisitors: new Set(mViews.map((v) => v.visitorHash)).size,
      likes: db.likes.filter(
        (l) => idSet.has(l.articleId) && l.createdAt.startsWith(monthPrefix)
      ).length,
      comments: db.comments.filter(
        (c) => idSet.has(c.articleId) && c.createdAt.startsWith(monthPrefix)
      ).length,
      shares: mEvents.filter((e) => e.eventType === 'share').length,
    });
  }
  return points;
}

interface AuthedRequest extends Request {
  currentUser?: StoredUser;
}

function attachUser(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const session = db.sessions.find((s) => s.token === token);
    if (session) {
      const user = db.users.find((u) => u.id === session.userId);
      if (user && user.status === 'active') {
        req.currentUser = user;
      }
    }
  }
  next();
}

function requireActiveAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Please sign in with an active account to continue.' });
    return;
  }
  next();
}

function requireBloggerOrAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Please sign in or register to publish content.' });
    return;
  }
  if (req.currentUser.status === 'suspended') {
    res.status(403).json({ error: 'This account has been suspended.' });
    return;
  }
  // Allow any registered user to publish their own content; upgrade reader to blogger role
  if (req.currentUser.role === 'reader') {
    req.currentUser.role = 'blogger';
    saveDatabase();
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser || req.currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Visitor-Key');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: '6mb' }));
  app.use(attachUser);

  // --- AUTHENTICATION & USER PROFILE ROUTES ---
  app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
    res.json({ user: req.currentUser ? sanitizeUser(req.currentUser) : null });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = db.users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      res.status(401).json({
        error: 'No account found with this email. Please register free or use Google ID sign-in.',
      });
      return;
    }

    const isGoogleAccount = user.passwordHash.includes('google_oauth_');
    if (user.passwordHash !== hashPassword(password)) {
      if (isGoogleAccount && password.length >= 6) {
        // Link password to existing Google-created user
        user.passwordHash = hashPassword(password);
      } else {
        res.status(401).json({
          error: isGoogleAccount
            ? 'This email was registered with Google. Click "Sign in with Google ID" above.'
            : 'Invalid email or password.',
        });
        return;
      }
    }
    if (user.status === 'suspended') {
      res.status(403).json({
        error: 'This account has been suspended by a site administrator.',
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    saveDatabase();
    res.json({ token, user: sanitizeUser(user) });
  });

  // Google ID Sign-in / Registration endpoint
  app.post('/api/auth/google', (req: Request, res: Response) => {
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const rawName = String(req.body.name || '').trim();
    const avatarUrl = typeof req.body.avatarUrl === 'string' ? req.body.avatarUrl : '';

    if (!rawEmail || !rawEmail.includes('@')) {
      res.status(400).json({ error: 'Valid Google email is required.' });
      return;
    }

    const name = rawName || rawEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Google User';

    let user = db.users.find((u) => u.email.toLowerCase() === rawEmail);
    if (!user) {
      // Create new user authenticated with Google ID with full publishing permissions
      user = {
        id: `usr_g_${crypto.randomBytes(6).toString('hex')}`,
        name,
        email: rawEmail,
        passwordHash: hashPassword(`google_oauth_${crypto.randomBytes(16).toString('hex')}`),
        role: 'blogger', // Give them immediate author rights
        status: 'active',
        headline: 'Author on Vibe Blogs Platform',
        bio: 'Publishing stories, insights, and essays on Vibe Blogs Platform.',
        avatarUrl,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
    } else {
      if (user.status === 'suspended') {
        res.status(403).json({
          error: 'This account has been suspended by a site administrator.',
        });
        return;
      }
      if (avatarUrl && !user.avatarUrl) {
        user.avatarUrl = avatarUrl;
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    saveDatabase();
    res.json({ token, user: sanitizeUser(user) });
  });

  // Instant 1-click role switcher for testing Admin / Blogger / Reader roles seamlessly
  app.post('/api/auth/demo', (req: Request, res: Response) => {
    const role = req.body.role as UserRole;
    const targetEmailMap: Record<UserRole, string> = {
      admin: 'admin@vibeblogs.org',
      blogger: 'marcus@vibeblogs.org',
      reader: 'reader@vibeblogs.org',
    };
    const email = targetEmailMap[role];
    if (!email) {
      res.status(400).json({ error: 'Invalid role requested.' });
      return;
    }
    const user = db.users.find((u) => u.email === email && u.status === 'active');
    if (!user) {
      res.status(404).json({ error: 'Demo user account unavailable.' });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    saveDatabase();
    res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const requestedRole = req.body.role === 'reader' ? 'reader' : 'blogger';
    const headline =
      String(req.body.headline || '').trim() ||
      (requestedRole === 'blogger' ? 'Independent Blogger' : 'Community Reader');
    const bio =
      String(req.body.bio || '').trim() ||
      (requestedRole === 'blogger'
        ? 'Publishing essays and stories on Vibe Blogs.'
        : 'Reading and discussing articles on Vibe Blogs.');

    if (name.length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!email.includes('@') || email.length < 5) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const newUser: StoredUser = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      name,
      email,
      passwordHash: hashPassword(password),
      role: requestedRole,
      status: 'active',
      headline,
      bio,
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions.push({ token, userId: newUser.id, createdAt: new Date().toISOString() });
    saveDatabase();

    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

  app.post('/api/auth/logout', (req: AuthedRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      saveDatabase();
    }
    res.json({ ok: true });
  });

  app.put('/api/users/me', requireActiveAuth, (req: AuthedRequest, res: Response) => {
    const user = req.currentUser!;
    const name = String(req.body.name || user.name).trim();
    const headline = String(req.body.headline ?? user.headline).trim();
    const bio = String(req.body.bio ?? user.bio).trim();
    const website = String(req.body.website ?? user.website ?? '').trim();
    const avatarUrl =
      typeof req.body.avatarUrl === 'string' ? req.body.avatarUrl : user.avatarUrl;

    if (name.length < 2) {
      res.status(400).json({ error: 'Display name must be at least 2 characters.' });
      return;
    }

    user.name = name;
    user.headline = headline;
    user.bio = bio;
    user.website = website;
    user.avatarUrl = avatarUrl;

    // Keep comment author names fresh
    db.comments.forEach((c) => {
      if (c.userId === user.id) {
        c.userName = user.name;
        c.userAvatar = user.avatarUrl;
      }
    });

    saveDatabase();
    res.json({ user: sanitizeUser(user) });
  });

  // --- PUBLIC HOMEPAGE & AUTHOR DISCOVERY ROUTES ---
  app.get('/api/public/feed', (req: AuthedRequest, res: Response) => {
    const published = db.articles
      .filter((a) => a.status === 'published')
      .map((a) => hydrateArticle(a, req.currentUser?.id))
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
      );

    const trending = [...published]
      .sort(
        (a, b) =>
          b.viewCount + b.likeCount * 3 + b.commentCount * 4 -
          (a.viewCount + a.likeCount * 3 + a.commentCount * 4)
      )
      .slice(0, 5);

    const featured = published.filter((a) => a.featured);

    const popularBloggers = db.users
      .filter((u) => (u.role === 'blogger' || u.role === 'admin') && u.status === 'active')
      .map((u) => buildPublicAuthor(u))
      .filter((a) => a.publishedCount > 0)
      .sort((a, b) => b.totalViews - a.totalViews);

    const categoryMap = new Map<string, { name: string; count: number; views: number }>();
    for (const art of published) {
      const existing = categoryMap.get(art.category) || {
        name: art.category,
        count: 0,
        views: 0,
      };
      existing.count += 1;
      existing.views += art.viewCount;
      categoryMap.set(art.category, existing);
    }
    const categories = Array.from(categoryMap.values()).sort((a, b) => b.views - a.views);

    res.json({
      articles: published,
      trending,
      featured: featured.length ? featured : published.slice(0, 3),
      popularBloggers,
      categories,
    });
  });

  app.get('/api/public/authors/:authorId', (req: AuthedRequest, res: Response) => {
    const authorUser = db.users.find((u) => u.id === req.params.authorId);
    if (!authorUser) {
      res.status(404).json({ error: 'Author profile not found.' });
      return;
    }
    const articles = db.articles
      .filter((a) => a.authorId === authorUser.id && a.status === 'published')
      .map((a) => hydrateArticle(a, req.currentUser?.id))
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
      );

    res.json({
      author: buildPublicAuthor(authorUser),
      articles,
    });
  });

  // --- ARTICLE READING, ANALYTICS EVENTS, LIKES, COMMENTS & REPORTS ---
  app.get('/api/articles/:id', (req: AuthedRequest, res: Response) => {
    const raw = db.articles.find((a) => a.id === req.params.id || a.slug === req.params.id);
    if (!raw) {
      res.status(404).json({ error: 'Article not found.' });
      return;
    }

    const canViewUnpublished =
      req.currentUser &&
      (req.currentUser.role === 'admin' || req.currentUser.id === raw.authorId);

    if (raw.status !== 'published' && !canViewUnpublished) {
      res.status(403).json({
        error: 'This article is not publicly published yet.',
      });
      return;
    }

    const authorUser = db.users.find((u) => u.id === raw.authorId) || db.users[0];
    const comments = db.comments
      .filter((c) => c.articleId === raw.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const related = db.articles
      .filter(
        (a) =>
          a.status === 'published' &&
          a.id !== raw.id &&
          (a.category === raw.category || a.tags.some((t) => raw.tags.includes(t)))
      )
      .slice(0, 3)
      .map((a) => hydrateArticle(a, req.currentUser?.id));

    res.json({
      article: hydrateArticle(raw, req.currentUser?.id),
      author: buildPublicAuthor(authorUser),
      comments,
      related,
    });
  });

  // Real database event recording with 6-hour anonymous visitor view deduplication
  app.post('/api/articles/:id/events', (req: AuthedRequest, res: Response) => {
    const raw = db.articles.find((a) => a.id === req.params.id);
    if (!raw || raw.status !== 'published') {
      res.json({ recorded: false, viewCount: 0, shareCount: 0 });
      return;
    }

    const rawVisitorHeader = String(req.headers['x-visitor-key'] || 'anon_fallback');
    const visitorHash = hashVisitor(rawVisitorHeader);
    const eventType = req.body.eventType as 'view' | 'scroll' | 'read_time' | 'share';
    const sessionId = String(req.body.sessionId || 'ses_live').slice(0, 48);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    let recorded = false;
    let deduplicated = false;

    if (eventType === 'view') {
      const recentDuplicate = db.events.some(
        (e) =>
          e.articleId === raw.id &&
          e.eventType === 'view' &&
          e.visitorHash === visitorHash &&
          nowMs - new Date(e.createdAt).getTime() < VIEW_DEDUPE_WINDOW_MS
      );

      if (recentDuplicate) {
        deduplicated = true;
      } else {
        db.events.push({
          id: `evt_${crypto.randomBytes(6).toString('hex')}`,
          articleId: raw.id,
          authorId: raw.authorId,
          eventType: 'view',
          visitorHash,
          sessionId,
          createdAt: nowIso,
        });
        recorded = true;
      }
    } else if (eventType === 'scroll') {
      const depth = Number(req.body.scrollDepth) as 25 | 50 | 75 | 100;
      if ([25, 50, 75, 100].includes(depth)) {
        const alreadyLogged = db.events.some(
          (e) =>
            e.articleId === raw.id &&
            e.eventType === 'scroll' &&
            e.visitorHash === visitorHash &&
            e.scrollDepth === depth &&
            nowMs - new Date(e.createdAt).getTime() < VIEW_DEDUPE_WINDOW_MS
        );
        if (!alreadyLogged) {
          db.events.push({
            id: `evt_${crypto.randomBytes(6).toString('hex')}`,
            articleId: raw.id,
            authorId: raw.authorId,
            eventType: 'scroll',
            visitorHash,
            sessionId,
            scrollDepth: depth,
            createdAt: nowIso,
          });
          recorded = true;
        }
      }
    } else if (eventType === 'read_time') {
      const durationSeconds = Math.min(3600, Math.max(1, Number(req.body.durationSeconds) || 0));
      const existingSessionTimer = db.events.find(
        (e) =>
          e.articleId === raw.id &&
          e.eventType === 'read_time' &&
          e.visitorHash === visitorHash &&
          e.sessionId === sessionId
      );
      if (existingSessionTimer) {
        existingSessionTimer.durationSeconds = Math.max(
          existingSessionTimer.durationSeconds || 0,
          durationSeconds
        );
        recorded = true;
      } else {
        db.events.push({
          id: `evt_${crypto.randomBytes(6).toString('hex')}`,
          articleId: raw.id,
          authorId: raw.authorId,
          eventType: 'read_time',
          visitorHash,
          sessionId,
          durationSeconds,
          createdAt: nowIso,
        });
        recorded = true;
      }
    } else if (eventType === 'share') {
      db.events.push({
        id: `evt_${crypto.randomBytes(6).toString('hex')}`,
        articleId: raw.id,
        authorId: raw.authorId,
        eventType: 'share',
        visitorHash,
        sessionId,
        createdAt: nowIso,
      });
      recorded = true;
    }

    if (recorded) {
      saveDatabase();
    }

    const viewCount = db.events.filter(
      (e) => e.articleId === raw.id && e.eventType === 'view'
    ).length;
    const shareCount = db.events.filter(
      (e) => e.articleId === raw.id && e.eventType === 'share'
    ).length;

    res.json({ recorded, deduplicated, viewCount, shareCount });
  });

  app.post(
    '/api/articles/:id/like',
    requireActiveAuth,
    (req: AuthedRequest, res: Response) => {
      const raw = db.articles.find((a) => a.id === req.params.id);
      if (!raw || raw.status !== 'published') {
        res.status(404).json({ error: 'Published article not found.' });
        return;
      }
      const userId = req.currentUser!.id;
      const existingIdx = db.likes.findIndex(
        (l) => l.articleId === raw.id && l.userId === userId
      );

      let liked = false;
      if (existingIdx >= 0) {
        db.likes.splice(existingIdx, 1);
        liked = false;
      } else {
        db.likes.push({
          id: `lk_${crypto.randomBytes(6).toString('hex')}`,
          articleId: raw.id,
          userId,
          createdAt: new Date().toISOString(),
        });
        liked = true;
      }

      saveDatabase();
      const likeCount = db.likes.filter((l) => l.articleId === raw.id).length;
      res.json({ liked, likeCount });
    }
  );

  app.post(
    '/api/articles/:id/comments',
    requireActiveAuth,
    (req: AuthedRequest, res: Response) => {
      const raw = db.articles.find((a) => a.id === req.params.id);
      if (!raw || raw.status !== 'published') {
        res.status(404).json({ error: 'Published article not found.' });
        return;
      }
      const content = String(req.body.content || '').trim();
      const parentId = req.body.parentId ? String(req.body.parentId) : null;

      if (!content || content.length > 2000) {
        res
          .status(400)
          .json({ error: 'Comment must be between 1 and 2,000 characters.' });
        return;
      }

      const user = req.currentUser!;
      const comment: CommentItem = {
        id: `cmt_${crypto.randomBytes(6).toString('hex')}`,
        articleId: raw.id,
        parentId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatarUrl,
        userRole: user.role,
        content,
        createdAt: new Date().toISOString(),
      };

      db.comments.push(comment);
      saveDatabase();

      const commentCount = db.comments.filter((c) => c.articleId === raw.id).length;
      res.status(201).json({ comment, commentCount });
    }
  );

  app.delete(
    '/api/comments/:commentId',
    requireActiveAuth,
    (req: AuthedRequest, res: Response) => {
      const comment = db.comments.find((c) => c.id === req.params.commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found.' });
        return;
      }
      const user = req.currentUser!;
      if (user.role !== 'admin' && comment.userId !== user.id) {
        res.status(403).json({ error: 'You can only delete your own comments.' });
        return;
      }

      // Delete the comment and its nested child replies
      db.comments = db.comments.filter(
        (c) => c.id !== comment.id && c.parentId !== comment.id
      );
      saveDatabase();
      res.json({ ok: true });
    }
  );

  app.post('/api/reports', (req: AuthedRequest, res: Response) => {
    const targetType = req.body.targetType === 'comment' ? 'comment' : 'article';
    const targetId = String(req.body.targetId || '');
    const articleId = String(req.body.articleId || '');
    const reason = String(req.body.reason || '').trim();
    const details = String(req.body.details || '').trim();

    if (!targetId || !reason) {
      res.status(400).json({ error: 'Please select a reason for reporting.' });
      return;
    }

    let targetPreview = 'Reported item';
    if (targetType === 'article') {
      const art = db.articles.find((a) => a.id === targetId);
      targetPreview = art ? art.title : 'Reported article';
    } else {
      const cmt = db.comments.find((c) => c.id === targetId);
      targetPreview = cmt ? cmt.content.slice(0, 120) : 'Reported comment';
    }

    const report: ContentReport = {
      id: `rep_${crypto.randomBytes(6).toString('hex')}`,
      targetType,
      targetId,
      targetPreview,
      articleId,
      reporterId: req.currentUser?.id || null,
      reporterName: req.currentUser?.name || 'Anonymous Reader',
      reason,
      details,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    db.reports.unshift(report);
    saveDatabase();
    res.status(201).json({ ok: true });
  });

  // --- BLOGGER PUBLISHING & PERSONAL ANALYTICS ROUTES ---
  app.post(
    '/api/articles',
    requireBloggerOrAdmin,
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const title = String(req.body.title || '').trim();
      const excerpt = String(req.body.excerpt || '').trim();
      const contentHtml = String(req.body.contentHtml || '').trim();
      const featuredImage = String(req.body.featuredImage || 'asset:workspace');
      const featuredImageCaption = String(req.body.featuredImageCaption || '').trim();
      const category = String(req.body.category || 'General').trim();
      const tags: string[] = Array.isArray(req.body.tags)
        ? req.body.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 8)
        : [];
      const requestedStatus = req.body.status as ArticleStatus;
      const validStatuses: ArticleStatus[] = ['draft', 'pending_review', 'published'];
      const status: ArticleStatus = validStatuses.includes(requestedStatus)
        ? requestedStatus
        : 'draft';

      if (title.length < 3) {
        res.status(400).json({ error: 'Article title must be at least 3 characters.' });
        return;
      }
      if (!contentHtml) {
        res.status(400).json({ error: 'Article body cannot be empty.' });
        return;
      }

      // Check free-tier storage quota for author
      const currentBytes = db.articles
        .filter((a) => a.authorId === user.id)
        .reduce(
          (sum, a) => sum + Buffer.byteLength(a.contentHtml + a.featuredImage, 'utf8'),
          0
        );
      const incomingBytes = Buffer.byteLength(contentHtml + featuredImage, 'utf8');
      if (currentBytes + incomingBytes > FREE_TIER_AUTHOR_STORAGE_BYTES) {
        res.status(413).json({
          error:
            'Free-tier media storage limit (25 MB per author) reached. Compress or remove large inline images.',
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const newArticle: StoredArticle = {
        id: `art_${crypto.randomBytes(6).toString('hex')}`,
        slug: `${slugify(title)}-${crypto.randomBytes(2).toString('hex')}`,
        title,
        excerpt:
          excerpt ||
          contentHtml
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160),
        contentHtml,
        featuredImage,
        featuredImageCaption,
        category,
        tags,
        authorId: user.id,
        status,
        featured: false,
        estimatedReadMinutes: estimateReadingMinutes(contentHtml),
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: status === 'published' ? nowIso : null,
      };

      db.articles.unshift(newArticle);
      saveDatabase();
      res.status(201).json({ article: hydrateArticle(newArticle, user.id) });
    }
  );

  app.put(
    '/api/articles/:id',
    requireBloggerOrAdmin,
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const raw = db.articles.find((a) => a.id === req.params.id);
      if (!raw) {
        res.status(404).json({ error: 'Article not found.' });
        return;
      }

      // Strict ownership check: Bloggers can edit ONLY their own posts
      if (user.role !== 'admin' && raw.authorId !== user.id) {
        res.status(403).json({
          error: 'Access denied: bloggers can edit only their own articles.',
        });
        return;
      }

      const title = String(req.body.title ?? raw.title).trim();
      const contentHtml = String(req.body.contentHtml ?? raw.contentHtml).trim();
      if (title.length < 3 || !contentHtml) {
        res
          .status(400)
          .json({ error: 'Article requires a valid title and body content.' });
        return;
      }

      raw.title = title;
      raw.excerpt =
        String(req.body.excerpt ?? raw.excerpt).trim() ||
        contentHtml
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160);
      raw.contentHtml = contentHtml;
      raw.featuredImage = String(req.body.featuredImage ?? raw.featuredImage);
      raw.featuredImageCaption = String(
        req.body.featuredImageCaption ?? raw.featuredImageCaption
      ).trim();
      raw.category = String(req.body.category ?? raw.category).trim() || 'General';
      if (Array.isArray(req.body.tags)) {
        raw.tags = req.body.tags
          .map((t: unknown) => String(t).trim())
          .filter(Boolean)
          .slice(0, 8);
      }

      if (req.body.status) {
        const nextStatus = req.body.status as ArticleStatus;
        if (
          user.role === 'admin' ||
          ['draft', 'pending_review', 'published'].includes(nextStatus)
        ) {
          raw.status = nextStatus;
          if (nextStatus === 'published' && !raw.publishedAt) {
            raw.publishedAt = new Date().toISOString();
          }
        }
      }

      if (user.role === 'admin' && typeof req.body.featured === 'boolean') {
        raw.featured = req.body.featured;
      }
      if (user.role === 'admin' && typeof req.body.moderationNote === 'string') {
        raw.moderationNote = req.body.moderationNote;
      }

      raw.estimatedReadMinutes = estimateReadingMinutes(raw.contentHtml);
      raw.updatedAt = new Date().toISOString();

      saveDatabase();
      res.json({ article: hydrateArticle(raw, user.id) });
    }
  );

  app.delete(
    '/api/articles/:id',
    requireBloggerOrAdmin,
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const idx = db.articles.findIndex((a) => a.id === req.params.id);
      if (idx < 0) {
        res.status(404).json({ error: 'Article not found.' });
        return;
      }
      const target = db.articles[idx];
      if (user.role !== 'admin' && target.authorId !== user.id) {
        res.status(403).json({
          error: 'Access denied: bloggers can delete only their own articles.',
        });
        return;
      }

      db.articles.splice(idx, 1);
      db.comments = db.comments.filter((c) => c.articleId !== target.id);
      db.likes = db.likes.filter((l) => l.articleId !== target.id);
      db.events = db.events.filter((e) => e.articleId !== target.id);
      db.reports = db.reports.filter((r) => r.articleId !== target.id);
      saveDatabase();

      res.json({ ok: true });
    }
  );

  // Private Blogger Analytics Dashboard — scoped strictly to req.currentUser.id!
  app.get(
    '/api/blogger/dashboard',
    requireBloggerOrAdmin,
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const myArticles = db.articles.filter((a) => a.authorId === user.id);
      const myArticleIds = myArticles.map((a) => a.id);
      const myIdSet = new Set(myArticleIds);

      const articlesAnalytics = myArticles.map((a) => computeIndividualArticleAnalytics(a));

      const myViewEvents = db.events.filter(
        (e) => myIdSet.has(e.articleId) && e.eventType === 'view'
      );
      const myReadEvents = db.events.filter(
        (e) =>
          myIdSet.has(e.articleId) &&
          e.eventType === 'read_time' &&
          (e.durationSeconds || 0) >= 5
      );
      const myShareEvents = db.events.filter(
        (e) => myIdSet.has(e.articleId) && e.eventType === 'share'
      );

      const uniqueVisitors = new Set(myViewEvents.map((e) => e.visitorHash)).size;
      const totalLikes = db.likes.filter((l) => myIdSet.has(l.articleId)).length;
      const totalComments = db.comments.filter((c) => myIdSet.has(c.articleId)).length;
      const avgReadingSeconds = myReadEvents.length
        ? Math.round(
            myReadEvents.reduce((acc, e) => acc + (e.durationSeconds || 0), 0) /
              myReadEvents.length
          )
        : 0;

      const storageUsedBytes = myArticles.reduce(
        (sum, a) => sum + Buffer.byteLength(a.contentHtml + a.featuredImage, 'utf8'),
        0
      );

      const publishedOnlyAnalytics = articlesAnalytics.filter(
        (a) => a.status === 'published'
      );
      const mostPopularArticle =
        publishedOnlyAnalytics.sort((a, b) => b.totalViews - a.totalViews)[0] || null;

      const payload: BloggerDashboardData = {
        summary: {
          totalViews: myViewEvents.length,
          uniqueVisitors,
          publishedArticles: myArticles.filter((a) => a.status === 'published').length,
          draftArticles: myArticles.filter((a) => a.status === 'draft').length,
          pendingArticles: myArticles.filter((a) => a.status === 'pending_review').length,
          totalComments,
          totalLikes,
          totalShares: myShareEvents.length,
          avgReadingSeconds,
          storageUsedBytes,
          storageLimitBytes: FREE_TIER_AUTHOR_STORAGE_BYTES,
        },
        mostPopularArticle,
        dailyChart: buildDailySeries(myArticleIds, 14),
        weeklyChart: buildWeeklySeries(myArticleIds, 8),
        monthlyChart: buildMonthlySeries(myArticleIds, 6),
        articlesAnalytics: articlesAnalytics.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
      };

      res.json(payload);
    }
  );

  // --- READER ACTIVITY ROUTE ---
  app.get(
    '/api/reader/activity',
    requireActiveAuth,
    (req: AuthedRequest, res: Response) => {
      const user = req.currentUser!;
      const articleTitleMap = new Map(db.articles.map((a) => [a.id, a.title]));

      const myComments = db.comments
        .filter((c) => c.userId === user.id)
        .map((c) => ({
          ...c,
          articleTitle: articleTitleMap.get(c.articleId) || 'Article',
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const likedIds = new Set(
        db.likes.filter((l) => l.userId === user.id).map((l) => l.articleId)
      );
      const likedArticles = db.articles
        .filter((a) => a.status === 'published' && likedIds.has(a.id))
        .map((a) => hydrateArticle(a, user.id));

      const recentParam = String(req.query.recent || '')
        .split(',')
        .filter(Boolean);
      const recentlyReadArticles = recentParam
        .map((id) => db.articles.find((a) => a.id === id && a.status === 'published'))
        .filter((a): a is StoredArticle => Boolean(a))
        .map((a) => hydrateArticle(a, user.id));

      res.json({
        myComments,
        likedArticles,
        recentlyReadArticles,
      });
    }
  );

  // --- ADMIN DASHBOARD & MODERATION ROUTES ---
  app.get('/api/admin/dashboard', requireAdmin, (req: AuthedRequest, res: Response) => {
    const allArticleIds = db.articles.map((a) => a.id);
    const allViewEvents = db.events.filter((e) => e.eventType === 'view');
    const articleTitleMap = new Map(db.articles.map((a) => [a.id, a.title]));

    const hydratedAll = db.articles
      .map((a) => hydrateArticle(a, req.currentUser?.id))
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    const mostPopularArticles = [...hydratedAll]
      .filter((a) => a.status === 'published')
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        title: a.title,
        authorName: a.authorName,
        category: a.category,
        status: a.status,
        views: a.viewCount,
        likes: a.likeCount,
        comments: a.commentCount,
        publishedAt: a.publishedAt,
      }));

    const bloggers = db.users.filter((u) => u.role === 'blogger' || u.role === 'admin');
    const mostActiveBloggers = bloggers
      .map((u) => {
        const authored = hydratedAll.filter((a) => a.authorId === u.id);
        const publishedPosts = authored.filter((a) => a.status === 'published').length;
        const totalViews = authored.reduce((s, a) => s + a.viewCount, 0);
        const totalComments = authored.reduce((s, a) => s + a.commentCount, 0);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
          status: u.status,
          publishedPosts,
          totalViews,
          totalComments,
        };
      })
      .sort((a, b) => b.totalViews - a.totalViews || b.publishedPosts - a.publishedPosts);

    const payload: AdminDashboardData = {
      summary: {
        totalBloggers: db.users.filter((u) => u.role === 'blogger').length,
        totalReaders: db.users.filter((u) => u.role === 'reader').length,
        totalAdmins: db.users.filter((u) => u.role === 'admin').length,
        publishedPosts: db.articles.filter((a) => a.status === 'published').length,
        pendingPosts: db.articles.filter((a) => a.status === 'pending_review').length,
        draftPosts: db.articles.filter((a) => a.status === 'draft').length,
        rejectedPosts: db.articles.filter((a) => a.status === 'rejected').length,
        totalWebsiteViews: allViewEvents.length,
        totalUniqueVisitors: new Set(allViewEvents.map((e) => e.visitorHash)).size,
        totalComments: db.comments.length,
        openReports: db.reports.filter((r) => r.status === 'open').length,
      },
      dailyTraffic: buildDailySeries(allArticleIds, 14),
      mostPopularArticles,
      mostActiveBloggers,
      users: db.users.map(sanitizeUser),
      allArticles: hydratedAll,
      recentComments: [...db.comments]
        .map((c) => ({
          ...c,
          articleTitle: articleTitleMap.get(c.articleId) || 'Article',
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      reports: db.reports,
    };

    res.json(payload);
  });

  app.patch(
    '/api/admin/articles/:id/moderate',
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const raw = db.articles.find((a) => a.id === req.params.id);
      if (!raw) {
        res.status(404).json({ error: 'Article not found.' });
        return;
      }

      if (req.body.status) {
        const status = req.body.status as ArticleStatus;
        raw.status = status;
        if (status === 'published' && !raw.publishedAt) {
          raw.publishedAt = new Date().toISOString();
        }
      }
      if (typeof req.body.featured === 'boolean') {
        raw.featured = req.body.featured;
      }
      if (typeof req.body.moderationNote === 'string') {
        raw.moderationNote = req.body.moderationNote.trim();
      }
      raw.updatedAt = new Date().toISOString();
      saveDatabase();

      res.json({ article: hydrateArticle(raw, req.currentUser?.id) });
    }
  );

  app.patch(
    '/api/admin/users/:id',
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const target = db.users.find((u) => u.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      if (target.id === req.currentUser!.id && req.body.status === 'suspended') {
        res.status(400).json({ error: 'You cannot suspend your own administrator account.' });
        return;
      }

      if (req.body.role && ['admin', 'blogger', 'reader'].includes(req.body.role)) {
        target.role = req.body.role as UserRole;
      }
      if (req.body.status && ['active', 'suspended'].includes(req.body.status)) {
        target.status = req.body.status as AccountStatus;
        if (target.status === 'suspended') {
          db.sessions = db.sessions.filter((s) => s.userId !== target.id);
        }
      }
      saveDatabase();
      res.json({ user: sanitizeUser(target) });
    }
  );

  app.patch(
    '/api/admin/reports/:id',
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const report = db.reports.find((r) => r.id === req.params.id);
      if (!report) {
        res.status(404).json({ error: 'Report not found.' });
        return;
      }

      const action = req.body.action as 'dismiss' | 'delete_target';
      if (action === 'delete_target') {
        if (report.targetType === 'comment') {
          db.comments = db.comments.filter(
            (c) => c.id !== report.targetId && c.parentId !== report.targetId
          );
        } else {
          db.articles = db.articles.filter((a) => a.id !== report.targetId);
          db.comments = db.comments.filter((c) => c.articleId !== report.targetId);
          db.likes = db.likes.filter((l) => l.articleId !== report.targetId);
          db.events = db.events.filter((e) => e.articleId !== report.targetId);
        }
        report.status = 'resolved';
      } else {
        report.status = 'dismissed';
      }

      saveDatabase();
      res.json({ ok: true });
    }
  );

  // --- VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS ---
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist', 'index.html')) && process.env.npm_lifecycle_event === 'start';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // In AI Studio / Cloud Run, Nginx listens on 8080 and reverse-proxies to 3000.
  // The Express dev server must strictly listen on port 3000.
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vibe Blogs Platform server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
