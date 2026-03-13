import React from 'react';
import { InventoryItem } from '../types';
import { getOptimizedImageUrl } from '../constants';

// Preloads all images and resolves when done (or after timeout).
// onProgress(loaded, total) is called after each image finishes.
export const preloadAllImages = (
  inventory: InventoryItem[],
  onProgress?: (loaded: number, total: number) => void
): Promise<void> => {
  const urls = inventory
    .map(item => item.images?.[0] || getOptimizedImageUrl(item.cloudImageUrls?.[0] || item.cloudImageUrl))
    .filter(Boolean) as string[];

  if (urls.length === 0) return Promise.resolve();

  let loaded = 0;
  const total = urls.length;

  return new Promise(resolve => {
    // Safety timeout: never block splash more than 8 seconds
    const timeout = setTimeout(resolve, 8000);

    const onDone = () => {
      loaded++;
      onProgress?.(loaded, total);
      if (loaded >= total) {
        clearTimeout(timeout);
        resolve();
      }
    };

    urls.forEach(url => {
      const img = new Image();
      img.onload = onDone;
      img.onerror = onDone; // count errors so we never get stuck
      img.src = url;
    });
  });
};

// Kept for compatibility — no longer renders anything
export const PhotoPreloader: React.FC<{ inventory: InventoryItem[] }> = () => null;
