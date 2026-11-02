import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { resolveEditorialImageUrl } from '../assets/editorialImages';

interface EditorialImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClassName?: string;
}

export const EditorialImage: React.FC<EditorialImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  aspectClassName = 'aspect-[4/3]',
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveEditorialImageUrl(src);

  if (hasError || !resolvedSrc) {
    return (
      <div
        className={`${aspectClassName} w-full bg-gradient-to-br from-slate-100 via-blue-50/60 to-violet-50/70 border border-slate-200 flex flex-col items-center justify-center p-6 text-center`}
      >
        <BookOpen className="w-7 h-7 text-blue-600/70 mb-2" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2 max-w-[24ch]">
          {alt || 'Vibe Blogs Editorial Illustration'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

export const AuthorAvatar: React.FC<{
  name: string;
  avatarUrl?: string;
  sizeClass?: string;
}> = ({ name, avatarUrl, sizeClass = 'w-9 h-9 text-xs' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = (name || 'Author')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  // Deterministic subtle blue/purple palette based on author name
  const palettes = [
    'bg-blue-600 text-white',
    'bg-violet-600 text-white',
    'bg-indigo-600 text-white',
    'bg-slate-800 text-white',
  ];
  const colorIndex =
    name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palettes.length;

  if (avatarUrl && avatarUrl.startsWith('data:image/') && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClass} ${palettes[colorIndex]} rounded-full font-semibold flex items-center justify-center shrink-0 select-none tracking-tight`}
    >
      {initials || 'VB'}
    </div>
  );
};
