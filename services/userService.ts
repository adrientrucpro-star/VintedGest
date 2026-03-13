import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export const getUserSettings = async (uid: string) => {
  try {
    const docRef = doc(db, `users/${uid}/settings`, 'preferences');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return null;
  }
};

export const saveUserSettings = async (uid: string, settings: any) => {
  try {
    const docRef = doc(db, `users/${uid}/settings`, 'preferences');
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    console.error("Error saving user settings:", error);
    throw error;
  }
};
