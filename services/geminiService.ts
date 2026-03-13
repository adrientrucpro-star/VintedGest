
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysis } from "../types";
import { COLORS, CATEGORY_TREE, SIZE_MAP, POPULAR_BRANDS, DESCRIPTION_TEMPLATE, VINTED_MATERIALS } from "../constants";
import { auth } from "./firebase";
import { getUserSettings } from "./userService";

const cleanDescription = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const analyzeProductImages = async (imagesBase64: string[], nextSku: string): Promise<GeminiAnalysis> => {
  let firestoreApiKey = null;
  const user = auth.currentUser;
  
  if (user) {
    const settings = await getUserSettings(user.uid);
    if (settings?.geminiApiKey) {
      firestoreApiKey = settings.geminiApiKey;
    }
  }

  const apiKey = [
    firestoreApiKey,
    localStorage.getItem('VINTED_EXPERT_API_KEY'),
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.GEMINI_API_KEY,
    import.meta.env.VITE_API_KEY,
    import.meta.env.API_KEY,
    window.process?.env?.API_KEY,
    window.process?.env?.GEMINI_API_KEY,
    window.process?.env?.GEMINI_API
  ].find(key => key && key !== "undefined" && key !== "");
  
  if (!apiKey) {
    throw new Error("Clé API Gemini manquante ou invalide.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanSku = String(nextSku).replace(/\D/g, "").padStart(4, '0');

  try {
    const brandRef    = POPULAR_BRANDS.join(", ");
    const colorRef    = COLORS.join(", ");
    const materialRef  = VINTED_MATERIALS.join(", ");
    const categoryRef  = JSON.stringify(CATEGORY_TREE, null, 2);

    const systemInstruction = `Tu es "Vinted Expert Pro", spécialiste en revente de vêtements sur Vinted France.
Ta mission : analyser TOUTES les photos fournies (recto, verso, étiquettes, détails, logos) et remplir une fiche d'annonce 100% compatible avec les champs réels de Vinted France.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. MARQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Liste exacte autorisée : [${brandRef}]

Règles :
• Lis EN PRIORITÉ les étiquettes, labels et logos visibles sur les photos.
• Choisis la valeur de la liste qui correspond EXACTEMENT à la marque lue.
• Si la marque existe sous un autre nom dans la liste (ex: "Polo Ralph Lauren" → "Ralph Lauren"), utilise la version de la liste.
• Si la marque n'est vraiment pas dans la liste, utilise "Sans marque".
• Ne jamais inventer ni créer une marque absente de la liste.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. CATÉGORIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Structure Vinted complète :
${categoryRef}

Règles :
• Identifie le chemin complet jusqu'au niveau le plus précis possible.
• Format obligatoire avec " - " comme séparateur : "Hommes - Vêtements - Sweats et pulls - Cardigans"
• Ne jamais inventer une catégorie absente de la structure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. TAILLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sélectionne la liste selon la catégorie détectée :

• Hommes - hauts (t-shirts, pulls, chemises, vestes...) :
  ${JSON.stringify(SIZE_MAP.HOMMES_HAUTS)}

• Hommes - bas (pantalons, jeans, shorts...) :
  ${JSON.stringify(SIZE_MAP.HOMMES_BAS)}

• Femmes :
  ${JSON.stringify(SIZE_MAP.FEMMES)}

• Enfants :
  ${JSON.stringify(SIZE_MAP.ENFANTS)}

• Chaussures (hommes, femmes, enfants) :
  ${JSON.stringify(SIZE_MAP.CHAUSSURES)}

Règles :
• Lis l'étiquette de taille si visible sur les photos.
• Choisis la valeur la PLUS PROCHE dans la liste correspondante.
• Pour les jeans hommes, donne le format "W30 | FR 40" etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. COULEUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Liste exacte autorisée : [${colorRef}]

Règles :
• Identifie la couleur DOMINANTE du vêtement (pas le fond, pas les accessoires).
• Choisis la valeur la plus proche dans la liste.
• Exemples : "Bleu marine" → "Marine", "Gris chiné" → "Gris", "Bordeaux" → "Bordeaux".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. MATIÈRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Liste autorisée : [${materialRef}]

Règles :
• Lis la composition sur l'étiquette si visible.
• Si plusieurs matières, indique la principale (la plus élevée en %).
• Si non visible, déduis-la de l'aspect visuel du tissu.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. PRIX DE REVENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estime le prix de revente RÉALISTE sur Vinted France (€), en tenant compte :
• De la marque et son positionnement marché
• De l'état de l'article
• De la catégorie et sa demande sur Vinted

Fourchettes de référence (état "Très bon état", ajuste selon l'état réel) :
• Luxe (LV, Gucci, Hermès, Dior, Balenciaga...) : 80–600€
• Premium (Ralph Lauren, Tommy Hilfiger, Stone Island, Moncler, Canada Goose...) : 25–120€
• Sport premium (Nike, adidas, New Balance, The North Face, Salomon...) : 15–60€
• Mid-range (Zara, H&M, Uniqlo, Mango, COS...) : 6–25€
• Bas de gamme / Sans marque : 3–10€
Coefficient état : ×1.3 pour neuf avec étiquette, ×1.0 pour très bon état, ×0.7 pour bon état, ×0.5 pour satisfaisant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. TITRE DE L'ANNONCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Format OBLIGATOIRE : "[TYPE] [DÉTAILS] [MARQUE] [COULEUR] Taille [TAILLE] #${cleanSku}"

Exemple : "Pull Col Camionneur Ralph Lauren Bleu Marine Taille L #${cleanSku}"

Règles :
• Commence par le type d'article (Pull, Veste, Jean, T-shirt, Robe, Manteau...)
• Ajoute des détails distinctifs et accrocheurs (Vintage, Oversize, Zippé, Col V, Brodé, Fleuri...)
• Inclure le mot "Taille" avant la valeur de taille
• Doit OBLIGATOIREMENT se terminer par #${cleanSku}
• Maximum 80 caractères hors SKU

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. DESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Utilise EXACTEMENT ce modèle. Remplace [BRAND] par la marque, [SIZE] par la taille, [COLOR] par la couleur, et génère 15 hashtags SEO Vinted pertinents pour [HASHTAGS] :

${DESCRIPTION_TEMPLATE.replace('[HASHTAGS]', '#[15 hashtags pertinents séparés par des espaces, ex: #pull #vintage #ralphlauren #menswear #streetwear ...]' )}

Les hashtags doivent inclure : le type d'article, la marque, la couleur, la catégorie, et des termes populaires sur Vinted (#vintage #occasion #modeenfant etc.).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro-preview-05-06',
      contents: { parts: [
        ...imagesBase64.map(data => ({ inlineData: { mimeType: 'image/jpeg', data: data.replace(/^data:image\/\w+;base64,/, '') } })),
        { text: `Analyse ces ${imagesBase64.length} photo(s) pour l'article SKU #${cleanSku}. Examine attentivement les étiquettes pour la marque, la taille et la matière. Génère une fiche Vinted complète et précise.` }
      ]},
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline:      { type: Type.STRING, description: "Titre de l'annonce Vinted, format: [TYPE] [DÉTAILS] [MARQUE] [COULEUR] Taille [TAILLE] #SKU" },
            description:   { type: Type.STRING, description: "Description complète au format template avec hashtags" },
            brand:         { type: Type.STRING, description: "Marque exacte depuis la liste autorisée" },
            size:          { type: Type.STRING, description: "Taille exacte au format Vinted selon la catégorie" },
            color:         { type: Type.STRING, description: "Couleur dominante depuis la liste autorisée" },
            category:      { type: Type.STRING, description: "Chemin catégorie Vinted complet, ex: Hommes - Vêtements - Jeans - Jeans coupe droite" },
            material:      { type: Type.STRING, description: "Matière principale du vêtement depuis la liste autorisée" },
            estimatedPrice:{ type: Type.NUMBER, description: "Prix de revente réaliste en euros sur Vinted France" },
          },
          required: ["headline", "description", "brand", "size", "color", "category", "material", "estimatedPrice"],
        }
      }
    });

    const result = JSON.parse(response.text);

    // Nettoyages post-IA
    result.description = cleanDescription(result.description);

    if (!result.headline.includes(`#${cleanSku}`)) {
      result.headline = `${result.headline.trim()} #${cleanSku}`;
    }
    // Condition fixée par défaut, non analysée par l'IA
    result.condition = "Très bon état";
    if (!VINTED_MATERIALS.includes(result.material)) {
      result.material = "Autre";
    }

    return result;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(`L'IA n'a pas pu traiter les images. Détail: ${error.message || 'Erreur inconnue'}`);
  }
};
