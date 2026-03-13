/**
 * Génère une vignette 200×200 JPEG depuis un base64 ou une URL.
 * Recadrage centré (cover) pour que l'image remplisse bien le carré.
 * Taille typique : ~15-25 KB — compatible avec la limite Firestore de 1MB par document.
 */
export const generateThumbnail = (src: string): Promise<string> => {
  return new Promise(resolve => {
    const img = new Image();

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

      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };

    img.onerror = () => resolve(''); // en cas d'erreur on retourne vide
    img.src = src;
  });
};
