import { InventoryItem } from '../types';
import { getOptimizedImageUrl } from '../constants';

// Cache en mémoire : URL Firebase → Blob URL local
// Persiste pendant toute la session, survit aux changements d'onglet
const imageCache = new Map<string, string>();

/**
 * Retourne l'URL mise en cache pour une image donnée.
 * Si l'image n'est pas encore en cache, retourne l'URL d'origine.
 */
export const getCachedImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  return imageCache.get(url) ?? url;
};

/**
 * Précharge toutes les images de l'inventaire en les téléchargeant
 * et en les stockant comme Blob URLs en mémoire.
 * Une fois en cache, les vignettes s'affichent instantanément sans requête réseau.
 */
export const preloadAllImages = (
  inventory: InventoryItem[],
  onProgress?: (loaded: number, total: number) => void
): Promise<void> => {
  // Collecte toutes les URLs à précharger (en ignorant celles déjà en cache)
  const urlsToLoad = inventory
    .map(item => item.images?.[0] || getOptimizedImageUrl(item.cloudImageUrls?.[0] || item.cloudImageUrl))
    .filter((url): url is string => !!url && !imageCache.has(url));

  const total = urlsToLoad.length;

  if (total === 0) {
    onProgress?.(inventory.length, inventory.length);
    return Promise.resolve();
  }

  let loaded = 0;

  const loadOne = (url: string): Promise<void> => {
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        imageCache.set(url, blobUrl);
      })
      .catch(() => {
        // En cas d'erreur, on garde l'URL d'origine dans le cache
        // pour éviter de retenter à chaque rendu
        imageCache.set(url, url);
      })
      .finally(() => {
        loaded++;
        onProgress?.(loaded, total);
      });
  };

  // Charge par lots de 6 en parallèle pour ne pas saturer le réseau
  const BATCH_SIZE = 6;
  const batches: string[][] = [];
  for (let i = 0; i < urlsToLoad.length; i += BATCH_SIZE) {
    batches.push(urlsToLoad.slice(i, i + BATCH_SIZE));
  }

  const runBatches = async () => {
    for (const batch of batches) {
      await Promise.all(batch.map(loadOne));
    }
  };

  // Timeout de sécurité : 15 secondes max pour ne pas bloquer indéfiniment
  return Promise.race([
    runBatches(),
    new Promise<void>(resolve => setTimeout(resolve, 15_000))
  ]);
};
