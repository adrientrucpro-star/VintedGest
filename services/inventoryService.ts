import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where
} from "firebase/firestore";
import { db } from "./firebase";
import { InventoryItem } from "../types";
import { parseDate } from "../constants";

const getCollectionRef = (uid: string) => collection(db, `users/${uid}/inventory`);

// Supprime les champs undefined non supportés par Firestore
const sanitizeData = (data: any): any => {
  const result: any = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) result[key] = value;
  });
  return result;
};

// Mapping interne → Firestore (noms Firestore = noms internes, pas de traduction)
const mapToFirestore = (item: InventoryItem) => sanitizeData({
  sku:              item.sku || "",
  userId:           item.userId || "",
  headline:         item.headline || "",
  description:      item.description || "",
  brand:            item.brand || "",
  size:             item.size || "",
  color:            item.color || "",
  category:         item.category || "",
  categoryLevels:   item.categoryLevels || [],
  condition:        item.condition || "",
  material:         item.material || "",
  PriceEstimated:   Number(item.PriceEstimated) || 0,
  PricePurchase:    Number(item.PricePurchase) || 0,
  PriceTransport:   Number(item.PriceTransport) || 0,
  PriceTaxes:       Number(item.PriceTaxes) || 0,
  PriceSold:        Number(item.PriceSold) || 0,
  vendor:           item.vendor || "",
  transport:        item.transport || "",
  articleStatus:    item.articleStatus || "En stock",
  vintedStatus:     item.vintedStatus || "Apublier",
  Images:           (item.Images || []).filter(Boolean),
  thumbnail:        item.thumbnail || '',
  date:             item.date || "",
  isSold:           !!item.isSold,
  soldDate:         item.soldDate,
  shippedDate:      item.shippedDate,
  shippingLabelUrl: item.shippingLabelUrl,
});

// Mapping Firestore → interne (direct, sans traduction)
const mapFromFirestore = (data: any, id: string): InventoryItem => ({
  id,
  userId:           data.userId || "",
  sku:              data.sku || "",
  headline:         data.headline || "",
  description:      data.description || "",
  brand:            data.brand || "",
  size:             data.size || "",
  color:            data.color || "",
  category:         data.category || (data.categoryLevels || []).join(' - '),
  categoryLevels:   data.categoryLevels || [],
  condition:        data.condition || "",
  material:         data.material || "",
  PriceEstimated:   Number(data.PriceEstimated) || 0,
  PricePurchase:    Number(data.PricePurchase)  || 0,
  PriceTransport:   Number(data.PriceTransport) || 0,
  PriceTaxes:       Number(data.PriceTaxes)     || 0,
  PriceSold:        Number(data.PriceSold)      || 0,
  vendor:           data.vendor || "",
  transport:        data.transport || "",
  articleStatus:    data.articleStatus || "En stock",
  vintedStatus:     data.vintedStatus || "Apublier",
  images:           [],
  Images:           (data.Images || []).filter(Boolean),
  thumbnail:        data.thumbnail || '',
  date:             data.date || "",
  isSold:           !!data.isSold,
  soldDate:         data.soldDate,
  shippedDate:      data.shippedDate,
  shippingLabelUrl: data.shippingLabelUrl,
});

export const getInventory = async (uid: string): Promise<InventoryItem[]> => {
  try {
    const snapshot = await getDocs(query(getCollectionRef(uid)));
    const items = snapshot.docs.map(doc => mapFromFirestore(doc.data(), doc.id));
    return items.sort((a, b) => parseDate(b.date) - parseDate(a.date));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
};

export const saveItem = async (uid: string, item: InventoryItem): Promise<string> => {
  try {
    const docRef = await addDoc(getCollectionRef(uid), mapToFirestore(item));
    return docRef.id;
  } catch (error) {
    console.error("Error saving item:", error);
    throw error;
  }
};

export const updateItem = async (uid: string, sku: string, updates: Partial<InventoryItem>): Promise<string> => {
  try {
    const q = query(getCollectionRef(uid), where("sku", "==", sku));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error(`Item with SKU ${sku} not found`);

    const existingDoc = snapshot.docs[0];
    const existing = mapFromFirestore(existingDoc.data(), existingDoc.id);
    const merged: InventoryItem = { ...existing, ...updates };

    await updateDoc(doc(db, `users/${uid}/inventory`, existingDoc.id), mapToFirestore(merged));
    return existingDoc.id;
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
};

export const deleteItem = async (uid: string, sku: string): Promise<void> => {
  try {
    const q = query(getCollectionRef(uid), where("sku", "==", sku));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error(`Item with SKU ${sku} not found`);
    await deleteDoc(doc(db, `users/${uid}/inventory`, snapshot.docs[0].id));
  } catch (error) {
    console.error("Error deleting item:", error);
    throw error;
  }
};
