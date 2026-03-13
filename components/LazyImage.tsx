import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { isImageCached, markImageLoaded } from '../services/imageCache';

interface LazyImageProps {
  src: string | undefined;      // URL Firebase Storage (fallback)
  thumbnail?: string;           // Base64 Firestore (prioritaire)
  alt?: string;
  className?: string;
  iconSize?: number;
}

/**
 * Composant image pour les vignettes.
 * 
 * Ordre de priorité :
 *   1. thumbnail (base64 Firestore) → instantané, zéro réseau
 *   2. src (URL Firebase Storage)  → cache mémoire JS ou chargement réseau
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  thumbnail,
  alt = '',
  className = 'w-full h-full object-cover',
  iconSize = 24,
}) => {
  // Priorité : thumbnail base64 > URL Firebase en cache > URL Firebase à charger
  const resolvedSrc = thumbnail || src;
  const isCached = !thumbnail && isImageCached(src);

  const [isLoaded, setIsLoaded] = useState(() => !!thumbnail || isCached);
  const [hasError, setHasError] = useState(false);

  if (!resolvedSrc || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <ImageOff size={iconSize} className="text-zinc-200" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {!isLoaded && (
        <div className="absolute inset-0 bg-zinc-100 animate-pulse" />
      )}
      <img
        src={resolvedSrc}
        alt={alt}
        className={`${className} transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => {
          if (src && !thumbnail) markImageLoaded(src);
          setIsLoaded(true);
        }}
        onError={() => setHasError(true)}
        decoding="async"
        loading="eager"
      />
    </div>
  );
};
