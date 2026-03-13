/**
 * Cache mémoire d'images.
 * 
 * Principe : on précharge chaque image avec new Image() (pas de CORS)
 * et on marque l'URL comme "prête" dans un Set JS.
 * LazyImage consulte ce Set pour savoir si l'image est déjà chargée
 * → affichage instantané sans attendre onLoad, même après navigation.
 */

// Set des URLs déjà chargées en mémoire
const loadedUrls = new Set<string>();

/** Retourne true si l'image est déjà dans le cache mémoire */
export const isImageCached = (url: string | undefined): boolean => {
  if (!url) return false;
  return loadedUrls.has(url);
};

/** Marque une URL comme chargée (appelé depuis LazyImage.onLoad) */
export const markImageLoaded = (url: string): void => {
  loadedUrls.add(url);
};

/** Précharge une liste d'URLs et les marque dans le cache mémoire */
export const preloadImages = (
  urls: string[],
  onProgress?: (done: number, total: number) => void
): Promise<void> => {
  // Filtre les URLs déjà en cache
  const toLoad = urls.filter(url => url && !loadedUrls.has(url));
  const alreadyCached = urls.length - toLoad.length;
  const total = urls.length;

  if (toLoad.length === 0) {
    onProgress?.(total, total);
    return Promise.resolve();
  }

  let done = alreadyCached;

  return new Promise(resolve => {
    const timeout = setTimeout(resolve, 30_000);

    const onDone = (url: string) => {
      loadedUrls.add(url);
      done++;
      onProgress?.(done, total);
      if (done >= total) {
        clearTimeout(timeout);
        resolve();
      }
    };

    toLoad.forEach(url => {
      const img = new Image();
      img.onload = () => onDone(url);
      img.onerror = () => onDone(url); // on marque quand même pour ne pas bloquer
      img.src = url;
    });
  });
};
