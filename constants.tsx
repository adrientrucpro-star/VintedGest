export const CATEGORIES = ['Hommes', 'Femmes', 'Enfants'];
export const VENDOR_OPTIONS = ['Vinted', 'Whatnot'];
export const ARTICLE_STATUS_OPTIONS = ['En stock', 'À traiter', 'À envoyer', 'Expédié'];
export const VINTED_STATUS_OPTIONS = ['Publie', 'Apublier', 'Arepublier', 'Vendu', 'Enattente'];
export const VINTED_STATUS_LABELS: Record<string, string> = {
  'Publie': 'Publié',
  'Apublier': 'À publier',
  'Arepublier': 'À republier',
  'Vendu': 'Vendu',
  'Enattente': 'En attente'
};

export const COLORS = [
  "Noir", "Marron", "Gris", "Beige", "Fuchsia", "Violet", "Rouge", "Jaune", "Bleu", "Vert", "Orange", 
  "Blanc", "Argenté", "Doré", "Kaki", "Turquoise", "Crème", "Abricot", "Corail", "Bordeaux", "Rose", 
  "Lila", "Bleu clair", "Marine", "Vert foncé", "Moutarde", "Menthe"
];

export const POPULAR_BRANDS = ["Zara", "Nike", "Sézane", "Louis Vuitton", "H&M", "adidas", "Ba&sh", "Gucci", "Mango", "New Balance", "Sandro", "Prada", "Bershka", "Jordan", "Maje", "Jacquemus", "Stradivarius", "Converse", "Claudie Pierlot", "Dior", "Pull&Bear", "Asics", "The Kooples", "Saint Laurent", "Shein", "Puma", "Zadig & Voltaire", "Burberry", "ASOS", "Reebok", "Ralph Lauren", "Balenciaga", "Uniqlo", "Vans", "Lacoste", "Stone Island", "Promod", "Salomon", "Tommy Hilfiger", "Off-White", "Carhartt", "Levi's", "Kenzo", "Pimkie", "The North Face", "Longchamp", "Celine", "Kiabi", "Patagonia", "Calvin Klein", "Loewe", "Primark", "Columbia", "Guess", "Hermès", "Etam", "Dickies", "Michael Kors", "Versace", "Golden Goose", "Fusalp", "Dockers", "AMI Paris", "Jack & Jones", "Fred Perry", "Hugo Boss", "Napapijri", "Barbour", "Moncler", "Canada Goose", "Arc'teryx", "Lululemon", "Gymshark", "Champion", "Fila", "Ellesse", "Kappa", "Le Coq Sportif", "Sergio Tacchini", "Paul Smith", "Acne Studios", "A.P.C.", "Maison Margiela", "Isabel Marant", "Rouje", "Ganni", "Aritzia", "COS", "& Other Stories", "Arket", "Massimo Dutti", "Bimba Y Lola", "Sans marque"];

export const VINTED_CONDITIONS = [
  "Neuf avec étiquette",
  "Neuf sans étiquette", 
  "Très bon état",
  "Bon état",
  "Satisfaisant"
];

export const VINTED_MATERIALS = [
  "Coton", "Polyester", "Laine", "Lin", "Soie", "Cachemire", "Velours",
  "Denim", "Cuir", "Cuir synthétique (simili)", "Nylon", "Viscose", "Acrylique",
  "Elasthanne / Spandex", "Polaire", "Tweed", "Satin", "Mousseline",
  "Jersey", "Mohair", "Alpaga", "Gore-Tex / Imperméable", "Autre"
];

export const SIZE_MAP: any = {
  HOMMES_HAUTS: ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL", "7XL", "8XL"],
  HOMMES_BAS: [
    "W23 | FR 32", "W24 | FR 34", "W25 | FR 34", "W26 | FR 36", "W27 | FR 36", 
    "W28 | FR 38", "W29 | FR 38", "W30 | FR 40", "W31 | FR 40", "W32 | FR 42", 
    "W33 | FR 42", "W34 | FR 44", "W35 | FR 44", "W36 | FR 46", "W38 | FR 48", 
    "W40 | FR 50", "W42 | FR 52", "W44 | FR 54", "W46 | FR 56", "W48 | FR 58", 
    "W50 | FR 60", "W52 | FR 62", "W54 | FR 64"
  ],
  FEMMES: [
    "XXXS / 30 / 2", "XXS / 32 / 4", "XS / 34 / 6", "S / 36 / 8", "M / 38 / 10", 
    "L / 40 / 12", "XL / 42 / 14", "XXL / 44 / 16", "XXXL / 46 / 18", 
    "4XL / 48 / 20", "5XL / 50 / 22", "6XL / 52 / 24", "7XL / 54 / 26", 
    "8XL / 56 / 28", "9XL / 58 / 30"
  ],
  ENFANTS: [
    "3 ans / 98 cm", "4 ans / 104 cm", "5 ans / 110 cm", "6 ans / 116 cm", 
    "7 ans / 122 cm", "8 ans / 128 cm", "9 ans / 134 cm", "10 ans / 140 cm", 
    "11 ans / 146 cm", "12 ans / 152 cm", "13 ans / 158 cm", "14 ans / 164 cm", 
    "15 ans / 170 cm", "16 ans / 176 cm", "XS", "S", "M", "L", "XL", "XXL"
  ],
  CHAUSSURES: [
    "38", "38,5", "39", "39,5", "40", "40,5", "41", "41,5", "42", "42,5", 
    "43", "43,5", "44", "44,5", "45", "45,5", "46", "46,5", "47", "47,5", 
    "48", "48,5", "49", "50", "51", "52"
  ]
};

export const DESCRIPTION_TEMPLATE = `💬 Pour toutes demandes complémentaires, envoyez moi un message !

📋 Détails :
- Marque : [BRAND]
- Taille : [SIZE]
- Couleur : [COLOR]

📦 Envoi :
- Envoi rapide et soigné (24/48h)
- Article lavé et repassé avant l'envoi

⚠️ Réduction sur les lots

[HASHTAGS]`;

export const CATEGORY_TREE: any = {
  "Hommes": {
    "Vêtements": {
      "Hauts et t-shirts": {
        "T-shirts": ["T-shirts imprimés", "T-shirts unis", "T-shirts à rayures", "Polos", "T-shirts à manches longues"],
        "Chemises": ["Chemises unies", "Chemises à motifs", "Chemises en jean", "Chemises à carreaux", "Chemises à rayures"],
        "T-shirts sans manches": null
      },
      "Sweats et pulls": {
        "Pulls et pulls à capuche": null,
        "Pulls d'hiver": null,
        "Sweats": null,
        "Sweats à col V": null,
        "Pulls ras de cou": null,
        "Pulls à col roulé": null,
        "Sweats longs": null,
        "Pulls à capuche avec zip": null,
        "Cardigans": null
      },
      "Pantalons": ["Jogging", "Chinos", "Pantalons à jambes larges", "Pantalons de costume", "Pantalons skinny", "Pantacourts"],
      "Jeans": ["Jeans coupe droite", "Jeans slim", "Jeans troués", "Jeans skinny"],
      "Shorts": ["Shorts en jean", "Shorts chino", "Shorts cargo"],
      "Maillots de bain": null,
      "Manteaux et vestes": {
        "Manteaux": ["Parkas", "Imperméables", "Trenchs", "Pardessus et manteaux longs", "Duffle-coats", "Cabans"],
        "Vestes": ["Doudounes", "Vestes matelassées", "Vestes de ski et snowboard", "Vestes coupe-vent", "Perfectos et blousons de moto", "Vestes Harrington", "Blousons aviateur", "Vestes chemises", "Blousons teddy", "Vestes polaires", "Vestes en jean", "Vestes militaires et utilitaires"],
        "Vestes sans manches": null,
        "Ponchos": null
      },
      "Costumes et smokings": null,
      "Vêtements de sport": {
        "Hauts & t-shirts": null,
        "Pantalons & leggings": null,
        "Survêtements": null,
        "Shorts": null,
        "Vêtements d'extérieur": null
      }
    },
    "Chaussures": ["Baskets", "Mocassins et chaussures bateau", "Sandales", "Chaussures de sport", "Claquettes et tongs", "Espadrilles", "Bottes", "Chaussures habillées", "Chaussons et pantoufles", "Mules et sabots"],
    "Accessoires": {
      "Sacs": ["Sacs à dos", "Sacs bandoulière", "Sacs à main", "Pochettes", "Sacs de sport", "Sacs de voyage"],
      "Ceintures": null,
      "Chapeaux et bonnets": null,
      "Bijoux": ["Colliers", "Bracelets", "Bagues", "Boucles d'oreilles", "Montres"],
      "Lunettes": null,
      "Gants et moufles": null,
      "Écharpes et foulards": null,
      "Portefeuilles et porte-monnaie": null
    }
  },
  "Femmes": {
    "Vêtements": {
      "Hauts et t-shirts": {
        "T-shirts": null, "Blouses": null, "Tops courts": null, "Chemises": null,
        "Blouses manches longues": null, "Débardeurs": null, "Blouses manches courtes": null,
        "Tops épaules dénudées": null, "Bodies": null, "Tuniques": null,
        "Cols roulés": null, "Tops dos nu": null, "Tops peplum": null
      },
      "Manteaux et vestes": {
        "Vestes": ["Doudounes", "Vestes en jean", "Perfectos et blousons de moto", "Vestes matelassées", "Blousons aviateur", "Vestes chemises", "Vestes polaires", "Vestes coupe-vent", "Vestes de ski et snowboard", "Vestes militaires et utilitaires", "Blousons teddy"],
        "Manteaux": ["Pardessus et manteaux longs", "Manteaux en fausse fourrure", "Parkas", "Trenchs", "Cabans", "Duffle-coats", "Imperméables"],
        "Capes et ponchos": null,
        "Vestes sans manches": null
      },
      "Sweats et sweats à capuche": {
        "Sweats": null, "Pulls d'hiver": null, "Pulls col V": null, "Pulls col roulé": null,
        "Sweats longs": null, "Cardigans": null, "Boléros": null, "Kimonos": null
      },
      "Robes": ["Robes longues", "Robes d'été", "Mini", "Midi", "Robes d'hiver", "Robes casual", "Petites robes noires", "Robes chics", "Robes sans bretelles", "Robes en jean"],
      "Jeans": ["Jeans skinny", "Jeans droits", "Jeans taille haute", "Jeans évasés", "Jeans troués", "Jeans boyfriend", "Jeans courts"],
      "Pantalons et leggings": ["Pantalons à jambes larges", "Pantalons droits", "Leggings", "Pantalons skinny", "Pantalons courts & chinos", "Pantalons en cuir", "Sarouels"],
      "Jupes": ["Minijupes", "Jupes longueur genou", "Jupes longues", "Jupes midi", "Jupes-shorts"],
      "Vêtements de sport": {
        "Pantalons & leggings": null, "Survêtements": null, "Hauts & t-shirts": null,
        "Shorts": null, "Brassières": null, "Vêtements d'extérieur": null,
        "Sweats et sweats à capuche": null, "Robes": null
      },
      "Lingerie et sous-vêtements": {
        "Soutiens-gorge": null, "Culottes": null, "Bodies": null,
        "Nuisettes et chemises de nuit": null, "Corsets et bustiers": null
      },
      "Maillots de bain": ["Bikinis", "Maillots de bain une pièce", "Tankinis", "Maillots de bain couvrants"]
    },
    "Chaussures": ["Baskets", "Talons hauts", "Ballerines", "Sandales", "Bottes", "Bottines", "Mocassins", "Claquettes et tongs", "Escarpins", "Mules et sabots"],
    "Accessoires": {
      "Sacs": ["Sacs à main", "Sacs bandoulière", "Sacs à dos", "Pochettes", "Cabas et tote bags", "Sacs de sport"],
      "Ceintures": null,
      "Chapeaux et bonnets": null,
      "Bijoux": ["Colliers", "Bracelets", "Bagues", "Boucles d'oreilles", "Montres"],
      "Lunettes": null,
      "Gants et moufles": null,
      "Écharpes et foulards": null,
      "Portefeuilles et porte-monnaie": null
    }
  },
  "Enfants": {
    "Vêtements pour garçons": {
      "Chemises et t-shirts": ["T-shirts", "Chemises manches longues", "Chemises", "Polos", "Chemises manches courtes"],
      "Pulls & sweats": ["Pulls", "Pulls à capuche et sweatshirts", "Gilets zippés", "Gilets", "Pulls à col roulé"],
      "Pantalons et shorts": ["Jeans", "Shorts et pantacourts", "Salopettes", "Leggings", "Sarouels"],
      "Manteaux et vestes": ["Doudounes", "Manteaux", "Parkas", "Vestes en jean", "Vestes polaires"],
      "Costumes": null
    },
    "Vêtements pour filles": {
      "Chemises et t-shirts": ["T-shirts", "Chemises manches longues", "Chemises", "Chemises sans manches", "Tuniques", "Polos"],
      "Pulls & sweats": ["Pulls", "Pulls à capuche & sweatshirts", "Gilets", "Gilets zippés", "Pulls à col roulé", "Boléros"],
      "Pantalons et shorts": ["Leggings", "Jeans", "Shorts et pantacourts", "Salopettes", "Sarouels"],
      "Robes et jupes": ["Robes", "Jupes"],
      "Manteaux et vestes": ["Doudounes", "Manteaux", "Parkas", "Vestes en jean"]
    },
    "Chaussures pour garçons": ["Baskets", "Sandales", "Bottes", "Chaussures de sport", "Chaussons"],
    "Chaussures pour filles": ["Baskets", "Sandales", "Bottes", "Ballerines", "Chaussons"]
  }
}
export const getArticleType = (categoryStr: string) => {
  const parts = (categoryStr || "").split(' - ').map(p => p.trim());
  return parts.length > 0 ? parts[parts.length - 1] : "Inconnu";
};

export const getOptimizedImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.includes('googleusercontent.com')) {
    return url.match(/=s\d+/) ? url.replace(/=s\d+/, '=s1024') : `${url}=s1024`;
  }
  return url;
};

export const formatPrice = (price: number | undefined | null) => {
  if (price === undefined || price === null) return "0,00";
  return price.toFixed(2).replace('.', ',');
};

export const formatDateToDDMMYYYY = (date: Date = new Date()) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const parseDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return 0;
  
  // Try native Date.parse first (handles ISO strings)
  const t = Date.parse(dateStr);
  if (!isNaN(t)) return t;

  // Handle DD/MM/YYYY or DD/MM/YY format
  const parts = dateStr.split(/[\/\s-]/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let yearStr = parts[2];
    let year = parseInt(yearStr, 10);
    
    if (yearStr.length === 2) {
      year += 2000;
    }
    
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  
  return 0;
};

export const getAvailableSizes = (categoryLevels: string[]) => {
  const fullCat = categoryLevels.join(' ').toLowerCase();
  if (fullCat.includes('chaussures')) return SIZE_MAP.CHAUSSURES;
  if (fullCat.includes('enfant')) return SIZE_MAP.ENFANTS;
  if (fullCat.includes('femmes')) return SIZE_MAP.FEMMES;
  if (fullCat.includes('hommes')) {
    if (fullCat.includes('pantalons') || fullCat.includes('jeans') || fullCat.includes('shorts')) return SIZE_MAP.HOMMES_BAS;
    return SIZE_MAP.HOMMES_HAUTS;
  }
  return SIZE_MAP.HOMMES_HAUTS;
};