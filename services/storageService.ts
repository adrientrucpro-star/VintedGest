import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export const uploadImageToStorage = async (uid: string, sku: string, base64Data: string, index: number): Promise<string> => {
  try {
    // The base64Data might include the data URL prefix (e.g., "data:image/jpeg;base64,...")
    // uploadString handles "data_url" format directly.
    const imageRef = ref(storage, `users/${uid}/inventory/${sku}/image_${index}_${Date.now()}.jpg`);
    await uploadString(imageRef, base64Data, 'data_url');
    const downloadUrl = await getDownloadURL(imageRef);
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    throw error;
  }
};

export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error("Error deleting image from Firebase Storage:", error);
    // We might not want to throw here if the image was already deleted or not found
  }
};
