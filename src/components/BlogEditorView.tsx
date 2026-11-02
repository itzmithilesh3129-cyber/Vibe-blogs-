import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Code,
  ImagePlus,
  Eye,
  Edit3,
  Upload,
  Trash2,
  Send,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { api, compressImageFile } from '../lib/api';
import { EDITORIAL_PRESETS } from '../assets/editorialImages';
import { EditorialImage, AuthorAvatar } from './EditorialImage';
import type { Article, ArticleStatus, UserProfile } from '../types';

interface BlogEditorViewProps {
  editingArticle: Article | null;
  currentUser: UserProfile;
  onCancel: () => void;
  onSaved: (article: Article) => void;
  onDeleted: () => void;
}

const DEFAULT_CATEGORIES = [
  'Engineering',
  'Design & Craft',
  'Typography',
  'Architecture & Cities',
  'Culture & Media',
  'Science & Tutorials',
];

const INITIAL_TEMPLATE_HTML = `<p>Start with a compelling opening paragraph that frames the core question or observation for your readers.</p>
<h2>Key Insight or Section Heading</h2>
<p>Develop your argument clearly with concrete examples, observations, or practical takeaways.</p>`;

export const BlogEditorView: React.FC<BlogEditorViewProps> = ({
  editingArticle,
  currentUser,
  onCancel,
  onSaved,
  onDeleted,
}) => {
  const [title, setTitle] = useState(editingArticle?.title || '');
  const [excerpt, setExcerpt] = useState(editingArticle?.excerpt || '');
  const [category, setCategory] = useState(
    editingArticle?.category || DEFAULT_CATEGORIES[0]
  );
  const [tagsInput, setTagsInput] = useState(
    editingArticle?.tags.join(', ') || ''
  );
  const [featuredImage, setFeaturedImage] = useState(
    editingArticle?.featuredImage || EDITORIAL_PRESETS[0].key
  );
  const [featuredImageCaption, setFeaturedImageCaption] = useState(
    editingArticle?.featuredImageCaption || EDITORIAL_PRESETS[0].defaultCaption
  );
  const [contentHtml, setContentHtml] = useState(
    editingArticle?.contentHtml || INITIAL_TEMPLATE_HTML
  );

  const [isPreview, setIsPreview] = useState(false);
  const [savingStatus, setSavingStatus] = useState<ArticleStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Inline Image + Caption inserter panel
  const [showInlineImagePanel, setShowInlineImagePanel] = useState(false);
  const [inlineImgData, setInlineImgData] = useState<string>('');
  const [inlineImgCaption, setInlineImgCaption] = useState<string>('');

  const editorRef = useRef<HTMLDivElement | null>(null);

  // Sync initial HTML into contentEditable when mounting or toggling back from preview
  useEffect(() => {
    if (!isPreview && editorRef.current) {
      if (editorRef.current.innerHTML !== contentHtml) {
        editorRef.current.innerHTML = contentHtml;
      }
    }
  }, [isPreview]);

  const syncFromDom = () => {
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const applyCommand = (cmd: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(cmd, false, value);
    syncFromDom();
  };

  const appendStructuredHtml = (snippet: string) => {
    const next = `${contentHtml}\n${snippet}`;
    setContentHtml(next);
    if (editorRef.current) {
      editorRef.current.innerHTML = next;
    }
  };

  const handleFeaturedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageFile(file, 1100);
      setFeaturedImage(compressed);
      if (!featuredImageCaption) {
        setFeaturedImageCaption(file.name.replace(/\.[^.]+$/, ''));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    }
  };

  const handleInlineFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageFile(file, 960);
      setInlineImgData(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inline image compression failed.');
    }
  };

  const handleInsertFigure = () => {
    if (!inlineImgData) return;
    const safeCaption = inlineImgCaption
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const figureMarkup = `<figure><img src="${inlineImgData}" alt="${
      safeCaption || 'Article illustration'
    }" />${
      safeCaption ? `<figcaption>${safeCaption}</figcaption>` : ''
    }</figure><p></p>`;

    appendStructuredHtml(figureMarkup);
    setInlineImgData('');
    setInlineImgCaption('');
    setShowInlineImagePanel(false);
  };

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  const handleSave = async (targetStatus: ArticleStatus) => {
    setError(null);
    const latestHtml = editorRef.current ? editorRef.current.innerHTML : contentHtml;
    if (title.trim().length < 3) {
      setError('Please enter an article title (at least 3 characters).');
      return;
    }
    if (!latestHtml.replace(/<[^>]+>/g, '').trim()) {
      setError('Please write some article content before saving.');
      return;
    }

    setSavingStatus(targetStatus);
    try {
      const payload = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        contentHtml: latestHtml,
        featuredImage,
        featuredImageCaption: featuredImageCaption.trim(),
        category,
        tags: parsedTags,
        status: targetStatus,
      };

      const res = editingArticle
        ? await api.updateArticle(editingArticle.id, payload)
        : await api.createArticle(payload);

      onSaved(res.article);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save article.');
    } finally {
      setSavingStatus(null);
    }
  };

  const handleDeleteExisting = async () => {
    if (!editingArticle) return;
    setError(null);
    try {
      await api.deleteArticle(editingArticle.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete article.');
    }
  };

  const estimatedMinutes = Math.max(
    1,
    Math.round(
      contentHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean).length / 210
    )
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      {/* Editor Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Editor</span>
          </button>
          <span className="text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-serif text-xl font-semibold text-slate-900">
            {editingArticle ? 'Edit Article' : 'New Article'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isPreview) syncFromDom();
              setIsPreview(!isPreview);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:border-slate-900 hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            {isPreview ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Back to Editor</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={savingStatus !== null}
            onClick={() => handleSave('draft')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingStatus === 'draft' ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            disabled={savingStatus !== null}
            onClick={() => handleSave('pending_review')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {savingStatus === 'pending_review'
                ? 'Submitting...'
                : 'Submit for Review'}
            </span>
          </button>

          <button
            type="button"
            disabled={savingStatus !== null}
            onClick={() => handleSave('published')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{savingStatus === 'published' ? 'Publishing...' : 'Publish Now'}</span>
          </button>

          {editingArticle && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete article"
              className="p-2 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {confirmDelete && editingArticle && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs font-medium text-red-900">
            Delete “{editingArticle.title}” permanently? This cannot be undone.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteExisting}
              className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg"
            >
              Delete Forever
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {editingArticle?.moderationNote && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <span className="font-semibold">Admin Moderation Note:</span>{' '}
          {editingArticle.moderationNote}
        </div>
      )}

      {isPreview ? (
        /* Live Editorial Preview */
        <div className="max-w-3xl mx-auto pt-4">
          <div className="mb-4 text-xs text-slate-500 flex items-center gap-2">
            <span className="font-semibold text-blue-600">{category}</span>
            <span aria-hidden="true">·</span>
            <span>Preview Mode</span>
            <span aria-hidden="true">·</span>
            <span>{estimatedMinutes} min read</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight mb-4">
            {title || 'Untitled Article'}
          </h1>
          {excerpt && (
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6">
              {excerpt}
            </p>
          )}
          <div className="py-4 border-t border-b border-slate-200 flex items-center gap-3 mb-8">
            <AuthorAvatar
              name={currentUser.name}
              avatarUrl={currentUser.avatarUrl}
              sizeClass="w-9 h-9 text-xs"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {currentUser.name}
              </div>
              <div className="text-xs text-slate-500">{currentUser.headline}</div>
            </div>
          </div>
          <figure className="mb-8">
            <div className="aspect-[16/9] rounded-xl overflow-hidden border border-slate-200">
              <EditorialImage
                src={featuredImage}
                alt={title || 'Featured preview'}
                aspectClassName="aspect-[16/9]"
              />
            </div>
            {featuredImageCaption && (
              <figcaption className="mt-2 text-xs italic text-slate-500 text-center">
                {featuredImageCaption}
              </figcaption>
            )}
          </figure>
          <article
            className="editorial-prose max-w-[68ch] mx-auto"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>
      ) : (
        /* Structured Publishing Form & Rich Text Editor */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Article Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Write a clear, memorable headline..."
                className="w-full px-4 py-3 font-serif text-xl sm:text-2xl font-semibold text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Short Description / Deck
              </label>
              <textarea
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A 1–2 sentence summary displayed on homepage article cards..."
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 resize-none"
              />
            </div>

            {/* Rich Text Editor Container */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => applyCommand('formatBlock', 'P')}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white rounded transition-colors"
                  title="Paragraph"
                >
                  Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand('formatBlock', 'H2')}
                  className="p-1.5 text-slate-700 hover:bg-white rounded transition-colors"
                  title="Heading 2"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand('formatBlock', 'H3')}
                  className="p-1.5 text-slate-700 hover:bg-white rounded transition-colors"
                  title="Heading 3"
                >
                  <Heading3 className="w-4 h-4" />
                </button>
                <span className="w-px h-4 bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={() => applyCommand('bold')}
                  className="p-1.5 text-slate-700 hover:bg-white rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand('italic')}
                  className="p-1.5 text-slate-700 hover:bg-white rounded transition-colors"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand('formatBlock', 'BLOCKQUOTE')}
                  className="p-1.5 text-slate-700 hover:bg-white rounded transition-colors"
                  title="Pull Quote"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <span className="w-px h-4 bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={() => applyCommand('insertUnorderedList')}
                  className="p-1.5 text-slate-700 hover:bg-white rounded transition-colors"
                  title="Bulleted List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand('insertOrderedList')}
                  className="p-1.5 text-slate-700 hover:bg-white rounded transition-colors"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    appendStructuredHtml(
                      `<pre><code>// Add code example here</code></pre><p></p>`
                    )
                  }
                  className="p-1.5 text-slate-700 hover:bg-white rounded transition-colors"
                  title="Insert Code Block"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInlineImagePanel(!showInlineImagePanel)}
                  className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>Insert Image + Caption</span>
                </button>
              </div>

              {/* Inline Image + Caption Drawer */}
              {showInlineImagePanel && (
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      Insert Inline Figure With Caption
                    </span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg cursor-pointer hover:border-blue-600">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Image File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleInlineFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {inlineImgData && (
                    <div className="w-40 aspect-[4/3] rounded border border-slate-200 overflow-hidden bg-white">
                      <img
                        src={inlineImgData}
                        alt="Inline preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={inlineImgCaption}
                      onChange={(e) => setInlineImgCaption(e.target.value)}
                      placeholder="Image caption (e.g., Fig. 1 — Latency comparison under load)"
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      disabled={!inlineImgData}
                      onClick={handleInsertFigure}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg disabled:opacity-40 whitespace-nowrap"
                    >
                      Insert Into Article
                    </button>
                  </div>
                </div>
              )}

              {/* Editable Rich Prose Canvas */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncFromDom}
                onBlur={syncFromDom}
                className="editorial-prose min-h-[420px] p-5 sm:p-6 focus:outline-none"
              />
            </div>
          </div>

          {/* Right Publishing Metadata Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Featured Image & Caption */}
            <div className="p-5 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Featured Cover Image
                </h2>
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFeaturedUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="aspect-[16/9] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <EditorialImage
                  src={featuredImage}
                  alt={title || 'Featured image'}
                  aspectClassName="aspect-[16/9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Or choose an editorial cover preset:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {EDITORIAL_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        setFeaturedImage(preset.key);
                        setFeaturedImageCaption(preset.defaultCaption);
                      }}
                      title={preset.label}
                      className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                        featuredImage === preset.key
                          ? 'border-blue-600 scale-95'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Featured Image Caption
                </label>
                <input
                  type="text"
                  value={featuredImageCaption}
                  onChange={(e) => setFeaturedImageCaption(e.target.value)}
                  placeholder="Describe or credit the cover photograph..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Category & Tags */}
            <div className="p-5 border border-slate-200 rounded-xl space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g., Web Performance, React, Design"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
                {parsedTags.length > 0 && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Active tags: {parsedTags.join(' · ')}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Estimated reading time</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-800">
                    {estimatedMinutes} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Publishing plan</span>
                  <span className="font-semibold text-emerald-700">
                    Free Unlimited Articles
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
