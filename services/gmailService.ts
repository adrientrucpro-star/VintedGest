import { InventoryItem } from '../types';
import { updateItem } from './inventoryService';
import { storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { formatDateToDDMMYYYY } from '../constants';

export const syncGmail = async (user: any, inventory: InventoryItem[], token: string, onProgress?: (status: string) => void): Promise<number> => {
  let updatedCount = 0;

  try {
    if (onProgress) onProgress('Recherche des emails Vinted...');
    
    // Query: from:no-reply@vinted.fr (subject:"Ton article s'est vendu" OR subject:"Bordereau" OR subject:"La transaction est finalisée" OR subject:"Ton paiement des frais de retour a été reçu") is:unread
    const query = 'from:no-reply@vinted.fr (subject:"Ton article s\'est vendu" OR subject:"Bordereau" OR subject:"La transaction est finalisée" OR subject:"Ton paiement des frais de retour a été reçu") is:unread';
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!listResponse.ok) {
      const errData = await listResponse.json();
      throw new Error(`Erreur API Gmail: ${errData.error?.message || listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      if (onProgress) onProgress('Aucun email de vente trouvé.');
      return 0;
    }

    if (onProgress) onProgress(`Analyse de ${messages.length} emails...`);

    // Helper to decode base64url
    const decodeBody = (str: string) => {
      try {
        return decodeURIComponent(escape(window.atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
      } catch (e) {
        return window.atob(str.replace(/-/g, '+').replace(/_/g, '/'));
      }
    };

    // Helper to extract text from message payload
    const getMessageBody = (payload: any): string => {
      if (payload.body && payload.body.data) {
        return decodeBody(payload.body.data);
      }
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body && part.body.data) {
            return decodeBody(part.body.data);
          }
          if (part.parts) { // Nested parts
            const nested = getMessageBody(part);
            if (nested) return nested;
          }
        }
         // Fallback to html if no text/plain
         for (const part of payload.parts) {
          if (part.mimeType === 'text/html' && part.body && part.body.data) {
            return decodeBody(part.body.data);
          }
        }
      }
      return '';
    };

    // Helper to find PDF attachment ID
    const findPdfAttachmentId = (payload: any): string | null => {
      // Direct attachment check
      if (payload.body && payload.body.attachmentId && (payload.mimeType === 'application/pdf' || payload.filename?.toLowerCase().endsWith('.pdf'))) {
        return payload.body.attachmentId;
      }

      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'application/pdf' && part.body && part.body.attachmentId) {
            return part.body.attachmentId;
          }
          if (part.filename && part.filename.toLowerCase().endsWith('.pdf') && part.body && part.body.attachmentId) {
            return part.body.attachmentId;
          }
          if (part.parts) {
            const nestedId = findPdfAttachmentId(part);
            if (nestedId) return nestedId;
          }
        }
      }
      return null;
    };

    // Process each email
    for (const msg of messages) {
      try {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const msgData = await msgResponse.json();
        
        const subjectHeader = msgData.payload.headers.find((h: any) => h.name === 'Subject');
        const subject = subjectHeader ? subjectHeader.value : '';
        
        const bodyText = getMessageBody(msgData.payload);
        const snippet = msgData.snippet;
        
        // Helper to strip HTML tags for better regex matching
        const stripHtml = (html: string) => {
          return html.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
        };

        // Combine snippet and body for search, stripping HTML if necessary
        const cleanBody = bodyText.includes('<') && bodyText.includes('>') ? stripHtml(bodyText) : bodyText;
        const content = `${subject} ${snippet} ${cleanBody}`;
        
        // Look for ALL SKU patterns: #1234 or #0059
        // We use a global regex to find all matches
        const skuMatches = [...content.matchAll(/#([a-zA-Z0-9]+)/g)];
        
        let managed = false;
        if (skuMatches.length > 0) {
          // Check each found SKU against inventory
          for (const match of skuMatches) {
            const sku = match[1]; // e.g. "0059"
            
            // Find item in inventory
            // Try matching exact SKU or with # prefix
            const item = inventory.find(i => i.sku === sku || i.sku === `#${sku}`);
            
            if (item) {
              managed = true;
              console.log(`Found matching inventory item for SKU ${sku} in email ${msg.id}`);

              // Check if it's a "Sold" email
              if (subject.includes("Ton article s'est vendu")) {
                  if (item.articleStatus !== 'À traiter' && item.articleStatus !== 'Vendu' && item.articleStatus !== 'Expédié' && item.articleStatus !== 'À envoyer' && item.articleStatus !== 'Litige') {
                    // Update item status to 'À traiter'
                    const updatedItem = { ...item, articleStatus: 'À traiter' as const };
                    await updateItem(user.uid, item.sku, updatedItem);
                    updatedCount++;
                    console.log(`Updated item ${sku} to 'À traiter'`);
                  } else {
                    console.log(`Skipped update for SKU ${sku}: item already has status '${item.articleStatus}'`);
                  }
              } 
              // Check if it's a "Transaction finalisée" email
              else if (subject.includes("La transaction est finalisée")) {
                  console.log(`Processing finalized transaction for SKU ${sku}`);
                  
                  // Extract price - try multiple patterns
                  const priceRegexes = [
                    /Montant de la commande\s*:\s*([\d,\s.]+)\s*€/i,
                    /Viré sur ton compte Vinted\s*:\s*([\d,\s.]+)\s*€/i,
                    /paiement de ([\d,\s.]+)\s*€/i,
                    /([\d,\s.]+)\s*€ a été ajouté/i
                  ];

                  let extractedPrice = null;
                  for (const regex of priceRegexes) {
                    const match = content.match(regex);
                    if (match) {
                      // Clean the price string: remove spaces, replace comma with dot
                      const priceStr = match[1].replace(/\s/g, '').replace(',', '.');
                      extractedPrice = parseFloat(priceStr);
                      if (!isNaN(extractedPrice)) break;
                    }
                  }
                  
                  // Extract date from body if possible, otherwise use email header
                  const dateRegex = /Date\s*:\s*(\d{2}\/\d{2}\/\d{4})/i;
                  const bodyDateMatch = content.match(dateRegex);
                  let soldDate = null;

                  if (bodyDateMatch) {
                    const [day, month, year] = bodyDateMatch[1].split('/');
                    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    if (!isNaN(d.getTime())) {
                      soldDate = formatDateToDDMMYYYY(d);
                    }
                  }

                  if (!soldDate) {
                    const dateHeader = msgData.payload.headers.find((h: any) => h.name === 'Date');
                    soldDate = dateHeader ? formatDateToDDMMYYYY(new Date(dateHeader.value)) : formatDateToDDMMYYYY();
                  }
                  
                  const soldPrice = extractedPrice !== null ? extractedPrice : item.PriceEstimated;
                  
                  const updatedItem = { 
                      ...item, 
                      articleStatus: 'Vendu' as const,
                      vintedStatus: 'Vendu' as const,
                      isSold: true,
                      PriceSold: soldPrice,
                      soldDate
                  };
                  await updateItem(user.uid, item.sku, updatedItem);
                  updatedCount++;
                  console.log(`Updated item ${sku} to 'Vendu' with price ${soldPrice} on ${soldDate}`);
              }
              // Check if it's a "Litige" (frais de retour) email
              else if (subject.includes("Ton paiement des frais de retour a été reçu")) {
                  console.log(`Processing dispute for SKU ${sku}`);
                  
                  const updatedItem = { 
                      ...item, 
                      articleStatus: 'Litige' as const
                  };
                  await updateItem(user.uid, item.sku, updatedItem);
                  updatedCount++;
                  console.log(`Updated item ${sku} to 'Litige'`);
              }
              // Check if it's a "Shipping Label" email
              else if (subject.toLowerCase().includes("bordereau")) {
                  console.log(`Processing shipping label for SKU ${sku}`);
                  
                  // Check if we already have the label to avoid re-uploading
                  if (!item.shippingLabelUrl) {
                      const attachmentId = findPdfAttachmentId(msgData.payload);
                      
                      if (attachmentId) {
                          if (onProgress) onProgress(`Téléchargement du bordereau pour #${sku}...`);
                          
                          // Fetch attachment data
                          const attachResponse = await fetch(
                              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/attachments/${attachmentId}`,
                              { headers: { Authorization: `Bearer ${token}` } }
                          );
                          
                          if (attachResponse.ok) {
                              const attachData = await attachResponse.json();
                              const base64Data = attachData.data.replace(/-/g, '+').replace(/_/g, '/');

                              if (onProgress) onProgress(`Sauvegarde du bordereau pour #${sku}...`);

                              // Upload vers Firebase Storage pour éviter la limite 1MB de Firestore
                              let downloadUrl: string;
                              try {
                                const pdfRef = ref(storage, `users/${user.uid}/shipping-labels/${sku}_${Date.now()}.pdf`);
                                await uploadString(pdfRef, `data:application/pdf;base64,${base64Data}`, 'data_url');
                                downloadUrl = await getDownloadURL(pdfRef);
                                console.log(`Uploaded shipping label for ${sku} to Firebase Storage`);
                              } catch (storageErr) {
                                // Fallback Data URL si Storage échoue (ex: règles de sécurité)
                                console.warn(`Storage upload failed for ${sku}, falling back to Data URL:`, storageErr);
                                downloadUrl = `data:application/pdf;base64,${base64Data}`;
                              }
                              
                              // Update item
                              const updatedItem = { 
                                  ...item, 
                                  shippingLabelUrl: downloadUrl,
                                  // articleStatus: 'À envoyer' as const // REMOVED: User wants to manually move to 'À envoyer' when package is ready
                              };
                              await updateItem(user.uid, item.sku, updatedItem);
                              updatedCount++;
                              console.log(`Saved shipping label for ${sku}`);
                          }
                      } else {
                          console.log(`No PDF attachment found for shipping label email ${msg.id}`);
                      }
                  }
              }
              
              // If we found a match and processed it, we can stop checking other SKUs in this email
              // (Assuming one email = one item, which is usually true for Vinted)
              break; 
            }
          }
        } else {
             console.log(`No SKU found in email ${msg.id}`);
        }

        // Mark email as read instead of deleting
        if (managed) {
          const modifyResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                removeLabelIds: ['UNREAD', 'INBOX']
              })
            }
          );
          if (modifyResponse.ok) {
            console.log(`Archived and marked email ${msg.id} as read`);
          } else {
            const errorData = await modifyResponse.json();
            console.error(`Failed to archive/mark email ${msg.id} as read:`, errorData);
          }
        }

      } catch (err) {
        console.error(`Error processing message ${msg.id}:`, err);
      }
    }

    if (onProgress) onProgress('Synchronisation terminée !');
    return updatedCount;

  } catch (err: any) {
    console.error("Gmail sync error:", err);
    throw err;
  }
};
