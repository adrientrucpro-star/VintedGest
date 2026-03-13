/**
 * Cache des vignettes en localStorage.
 * Stocke la première photo de chaque article en base64 réduit (200x200, qualité 0.7).
 * Clé : "vthumb_{sku}" → data URL base64
 * 
 * Avantages :
 * - Zéro requête réseau pour les vignettes
 * - Persiste entre les sessions
 * - Survit aux changements d'onglet
 */

const PREFIX = 'vthumb_';

/** Retourne l'URL de vignette en cache pour un SKU, ou undefined */
export const getThumbnail = (sku: string): string | undefined => {
  try {
    return localStorage.getItem(`${PREFIX}${sku}`) ?? undefined;
  } catch {
    return undefined;
  }
};

/** Sauvegarde une vignette en cache pour un SKU */
export const saveThumbnail = (sku: string, dataUrl: string): void => {
  try {
    localStorage.setItem(`${PREFIX}${sku}`, dataUrl);
  } catch {
    // localStorage plein — on ignore silencieusement
  }
};

/** Supprime la vignette en cache pour un SKU (ex: suppression article) */
export const deleteThumbnail = (sku: string): void => {
  try {
    localStorage.removeItem(`${PREFIX}${sku}`);
  } catch {}
};

/**
 * Génère et sauvegarde une vignette 200x200 depuis une image base64 ou une URL.
 * Retourne la data URL de la vignette.
 */
export const generateAndSaveThumbnail = (sku: string, src: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const SIZE = 200;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(src); return; }

      // Recadrage centré (cover)
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (SIZE - w) / 2;
      const y = (SIZE - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      const thumb = canvas.toDataURL('image/jpeg', 0.7);
      saveThumbnail(sku, thumb);
      resolve(thumb);
    };

    img.onerror = () => resolve(src); // fallback : on garde l'URL d'origine

    img.src = src;
  });
};
