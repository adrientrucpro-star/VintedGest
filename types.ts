export enum View {
  ADD_ITEM = 'ADD_ITEM',
  EDIT_ITEM = 'EDIT_ITEM',
  ITEM_DETAILS = 'ITEM_DETAILS',
  STOCK_VIEW = 'STOCK_VIEW',
  SOLD_VIEW = 'SOLD_VIEW',
  DASHBOARD = 'DASHBOARD',
  COMMAND_VIEW = 'COMMAND_VIEW'
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface InventoryItem {
  id?: string;
  userId?: string;
  sku: string;
  headline: string;
  description?: string;
  brand: string;
  size: string;
  color: string;
  category: string;
  categoryLevels?: string[];
  condition?: string;
  material?: string;
  PriceEstimated: number;
  PricePurchase: number;
  vendor: string;
  PriceTransport: number;
  PriceTaxes: number;
  articleStatus: 'En stock' | 'À traiter' | 'À envoyer' | 'Expédié' | 'Vendu' | 'Litige';
  vintedStatus: 'Publie' | 'Apublier' | 'Arepublier' | 'Vendu' | 'Enattente';
  transport?: string;
  images: string[];       // Base64 local temporaire (jamais persisté)
  Images: string[];       // URLs Firebase Storage
  thumbnail?: string;     // Base64 JPEG 200×200 stocké dans Firestore pour les vignettes
  date: string;           // Date de création (DD/MM/YYYY)
  isSold?: boolean;
  PriceSold?: number;
  soldDate?: string;
  shippedDate?: string;
  shippingLabelUrl?: string;
}

export interface GeminiAnalysis {
  headline: string;
  description: string;
  brand: string;
  size: string;
  color: string;
  category: string;
  condition: string;
  material: string;
  estimatedPrice: number;
}
