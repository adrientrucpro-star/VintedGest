/**
 * Script de migration : génère les thumbnails manquants pour tous les articles Firestore.
 *
 * Usage :
 *   1. npm install @google-cloud/firestore node-fetch sharp dotenv
 *   2. Créer un fichier .env dans le dossier VintedGest avec les variables Firebase
 *   3. node scripts/generate-thumbnails.mjs
 *
 * Ce script :
 *   - Récupère tous les articles Firestore sans thumbnail
 *   - Télécharge la première image Firebase Storage de chaque article
 *   - Génère un thumbnail 200×200 JPEG en base64
 *   - Sauvegarde le thumbnail dans le document Firestore
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Charge les variables d'environnement depuis .env
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: join(__dirname, '..', '.env') });
} catch {
  console.error('❌ dotenv non installé. Lance : npm install dotenv');
  process.exit(1);
}

// Vérifie les dépendances
let Firestore, fetch, sharp;
try {
  const firestoreModule = require('@google-cloud/firestore');
  Firestore = firestoreModule.Firestore;
} catch {
  console.error('❌ @google-cloud/firestore non installé. Lance : npm install @google-cloud/firestore');
  process.exit(1);
}
try {
  fetch = (await import('node-fetch')).default;
} catch {
  // Node 18+ a fetch natif
  fetch = globalThis.fetch;
  if (!fetch) {
    console.error('❌ node-fetch non installé. Lance : npm install node-fetch');
    process.exit(1);
  }
}
try {
  sharp = require('sharp');
} catch {
  console.error('❌ sharp non installé. Lance : npm install sharp');
  process.exit(1);
}

// Config Firebase depuis .env
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const USER_ID    = process.env.MIGRATION_USER_ID; // à renseigner dans .env

if (!PROJECT_ID) {
  console.error('❌ VITE_FIREBASE_PROJECT_ID manquant dans .env');
  process.exit(1);
}
if (!USER_ID) {
  console.error('❌ MIGRATION_USER_ID manquant dans .env');
  console.error('   Ajoute cette ligne dans ton .env :');
  console.error('   MIGRATION_USER_ID=l82pSjhHMNV1usNjt8BBECoAnkx1');
  process.exit(1);
}

// Initialise Firestore avec les credentials de service
// (utilise Application Default Credentials ou GOOGLE_APPLICATION_CREDENTIALS)
const db = new Firestore({ projectId: PROJECT_ID });

/**
 * Génère un thumbnail 200×200 JPEG en base64 depuis un buffer image
 */
async function generateThumbnail(imageBuffer) {
  const resized = await sharp(imageBuffer)
    .resize(200, 200, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 75 })
    .toBuffer();
  return 'data:image/jpeg;base64,' + resized.toString('base64');
}

/**
 * Télécharge une image depuis une URL Firebase Storage
 */
async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} pour ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  console.log(`\n🚀 Migration thumbnails — projet : ${PROJECT_ID}`);
  console.log(`👤 Utilisateur : ${USER_ID}\n`);

  const collectionRef = db.collection(`users/${USER_ID}/inventory`);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log('ℹ️  Aucun article trouvé.');
    return;
  }

  const total = snapshot.docs.length;
  const toProcess = snapshot.docs.filter(doc => {
    const data = doc.data();
    return !data.thumbnail && data.Images && data.Images.length > 0;
  });

  console.log(`📦 ${total} articles au total`);
  console.log(`🖼️  ${toProcess.length} articles sans thumbnail à traiter`);
  console.log(`✅ ${total - toProcess.length} articles déjà à jour\n`);

  if (toProcess.length === 0) {
    console.log('🎉 Tous les articles ont déjà un thumbnail !');
    return;
  }

  let success = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const docSnap = toProcess[i];
    const data = docSnap.data();
    const sku = data.sku || docSnap.id;
    const imageUrl = data.Images[0];

    process.stdout.write(`[${i + 1}/${toProcess.length}] #${sku} — `);

    try {
      // Télécharge l'image
      const buffer = await downloadImage(imageUrl);

      // Génère le thumbnail
      const thumbnail = await generateThumbnail(buffer);

      // Sauvegarde dans Firestore
      await docSnap.ref.update({ thumbnail });

      console.log(`✅ OK (~${Math.round(thumbnail.length / 1024)}KB)`);
      success++;
    } catch (err) {
      console.log(`❌ Erreur : ${err.message}`);
      errors++;
    }

    // Petite pause pour ne pas saturer Firebase
    if (i < toProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n📊 Résultat :`);
  console.log(`   ✅ ${success} thumbnails générés`);
  if (errors > 0) console.log(`   ❌ ${errors} erreurs`);
  console.log('\n🎉 Migration terminée !');
}

main().catch(err => {
  console.error('\n❌ Erreur fatale :', err.message);
  process.exit(1);
});
