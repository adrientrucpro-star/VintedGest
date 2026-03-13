/**
 * Migration des thumbnails — s'exécute une seule fois au démarrage de l'app.
 * 
 * Pour chaque article sans thumbnail :
 *   1. Télécharge la première image Firebase Storage
 *   2. Génère un thumbnail 200×200 JPEG base64
 *   3. Sauvegarde le thumbnail dans Firestore
 * 
 * Tourne en arrière-plan après l'ouverture de l'app (ne bloque pas le démarrage).
 */

import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const MIGRATION_KEY = 'vinted_thumbnail_migration_done';

/**
 * Génère un thumbnail 200×200 depuis une URL Firebase Storage.
 * Utilise une balise Image + Canvas — pas de CORS car c'est une requête image standard.
 */
const generateThumbnailFromUrl = (url: string): Promise<string> => {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const SIZE = 200;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(''); return; }

      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (SIZE - w) / 2;
      const y = (SIZE - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };

    img.onerror = () => {
      // CORS bloqué avec crossOrigin=anonymous → on essaie sans
      const img2 = new Image();
      img2.onload = () => {
        try {
          const SIZE = 200;
          const canvas = document.createElement('canvas');
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(''); return; }
          const scale = Math.max(SIZE / img2.width, SIZE / img2.height);
          const w = img2.width * scale;
          const h = img2.height * scale;
          const x = (SIZE - w) / 2;
          const y = (SIZE - h) / 2;
          ctx.drawImage(img2, x, y, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } catch {
          resolve(''); // tainted canvas — on abandonne
        }
      };
      img2.onerror = () => resolve('');
      img2.src = url;
    };

    img.src = url;
  });
};

/**
 * Lance la migration en arrière-plan.
 * Ne bloque PAS le démarrage de l'app — s'exécute après l'affichage initial.
 * 
 * @param uid        UID Firebase de l'utilisateur
 * @param inventory  Liste des articles en mémoire (pour filtrer ceux sans thumbnail)
 * @param onProgress Callback appelé après chaque thumbnail généré (optionnel)
 */
export const migrateThumbnails = async (
  uid: string,
  inventory: Array<{ id?: string; sku: string; thumbnail?: string; Images: string[] }>,
  onProgress?: (done: number, total: number) => void
): Promise<void> => {

  // Articles sans thumbnail ayant au moins une image Firebase
  const toMigrate = inventory.filter(
    item => !item.thumbnail && item.Images?.length > 0 && item.id
  );

  if (toMigrate.length === 0) {
    console.log('[Migration] Tous les articles ont déjà un thumbnail.');
    return;
  }

  console.log(`[Migration] ${toMigrate.length} thumbnails à générer...`);

  let done = 0;

  // Traite par lots de 3 pour ne pas saturer le réseau
  const BATCH = 3;
  for (let i = 0; i < toMigrate.length; i += BATCH) {
    const batch = toMigrate.slice(i, i + BATCH);

    await Promise.all(batch.map(async item => {
      try {
        const thumbnail = await generateThumbnailFromUrl(item.Images[0]);
        if (thumbnail) {
          // Sauvegarde dans Firestore directement via le docId
          const docRef = doc(db, `users/${uid}/inventory`, item.id!);
          await updateDoc(docRef, { thumbnail });
          console.log(`[Migration] ✅ #${item.sku}`);
        } else {
          console.log(`[Migration] ⚠️ #${item.sku} — thumbnail vide (CORS?)`);
        }
      } catch (err) {
        console.error(`[Migration] ❌ #${item.sku} :`, err);
      } finally {
        done++;
        onProgress?.(done, toMigrate.length);
      }
    }));

    // Petite pause entre les lots
    if (i + BATCH < toMigrate.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`[Migration] Terminé — ${done}/${toMigrate.length} thumbnails traités.`);
};
