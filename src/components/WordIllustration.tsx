import React, { useEffect, useState } from 'react';

interface WordIllustrationProps {
  src: string;
  alt: string;
  fallbackEmoji: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<WordIllustrationProps['size']>, string> = {
  xs: 'w-11 h-11 rounded-xl',
  sm: 'w-16 h-14 rounded-xl',
  md: 'w-full h-24 sm:h-28 rounded-2xl',
  lg: 'w-52 h-40 sm:w-64 sm:h-48 rounded-3xl',
};

const EMOJI_SIZE_CLASSES: Record<NonNullable<WordIllustrationProps['size']>, string> = {
  xs: 'text-xl',
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
};

export const WordIllustration: React.FC<WordIllustrationProps> = ({
  src,
  alt,
  fallbackEmoji,
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const isVectorOrPng = /\.png(\?|$)|\.svg(\?|$)/i.test(src);

  return (
    <div
      className={`bg-white border-2 border-washi-border shadow-inner overflow-hidden flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      {!failed && src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`w-full h-full ${
            isVectorOrPng ? 'object-contain p-1.5' : 'object-cover'
          }`}
        />
      ) : (
        <span className={EMOJI_SIZE_CLASSES[size]}>{fallbackEmoji}</span>
      )}
    </div>
  );
};
