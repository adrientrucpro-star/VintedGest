
/**
 * VERSION FINALE : Gère GESTION VINTED > TEMP_Vinted
 * Et GESTION VINTED > BORDEREAUX (pour le PDF fusionné)
 */

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Stock") || ss.getSheets()[0];
  
  SpreadsheetApp.flush();

  // Action spécifique pour le PDF Global (Bordereau groupé)
  if (data.action === "UPLOAD_BORDEREAU") {
    try {
      var fileName = data.filename || "ALL_bordereau.pdf";
      var base64Data = data.base64Data;
      
      // 1. Récupérer le dossier BORDEREAUX dans GESTION VINTED
      var folder = getBordereauxFolder();
      
      // 2. Supprimer l'ancien fichier s'il existe pour le remplacer
      var existingFiles = folder.getFilesByName(fileName);
      while (existingFiles.hasNext()) {
        existingFiles.next().setTrashed(true);
      }
      
      // 3. Créer le nouveau fichier
      var decodedData = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decodedData, "application/pdf", fileName);
      folder.createFile(blob);
      
      return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
    } catch (err) {
      return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
    }
  }

  var rows = sheet.getDataRange().getValues();
  var skuToSearch = String(data.item.sku).replace(/\D/g, "").padStart(4, '0');
  var foundRowIndex = -1;

  for (var i = 1; i < rows.length; i++) {
    var sheetSku = String(rows[i][1]).replace(/\D/g, "").padStart(4, '0');
    if (sheetSku === skuToSearch) {
      foundRowIndex = i + 1;
      break;
    }
  }

  if (data.action === "ADD_INVENTORY_ITEM" || data.action === "UPDATE_INVENTORY_ITEM") {
    var cats = data.item.categories || [];
    var rowValues = [
      data.item.dateStr,           // A
      "'" + skuToSearch,           // B
      data.item.headline,          // C
      data.item.brand,             // D
      data.item.size,              // E
      data.item.color,             // F
      data.item.purchasePrice,     // G
      data.item.shippingFees,      // H
      data.item.taxes,             // I
      data.item.estimatedPrice,    // J
      data.item.soldPrice || "",   // K
      data.item.vendor,            // L
      data.item.status,            // M
      data.item.vintedStatus,      // N
      cats[0] || "",               // O
      cats[1] || "",               // P
      cats[2] || "",               // Q
      cats[3] || "",               // R
      cats[4] || "",               // S
      data.item.description || "", // T
      data.item.transport || ""    // U
    ];

    if (foundRowIndex !== -1) {
      sheet.getRange(foundRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    if (data.photos && data.photos.length > 0) {
      var folder = getTargetFolder();
      data.photos.forEach(function(p, index) {
        try {
          var fileName = skuToSearch + " (" + (index + 1) + ").jpeg";
          var blob = Utilities.newBlob(Utilities.base64Decode(p.base64Data), p.mimeType, fileName);
          folder.createFile(blob);
        } catch (err) { console.error("Erreur Photo: " + err.toString()); }
      });
    }
  } 
  
  else if (data.action === "DELETE_ITEM") {
    if (foundRowIndex !== -1) { 
      sheet.deleteRow(foundRowIndex); 
    }
    var cleanSku = data.item.cleanSku || skuToSearch;
    try {
      var folder = getTargetFolder();
      var files = folder.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if (file.getName().indexOf(cleanSku) === 0) {
          file.setTrashed(true);
        }
      }
    } catch (err) {
      console.error("Erreur lors de la suppression Drive : " + err.toString());
    }
  }
  
  SpreadsheetApp.flush();
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  var action = e.parameter.action;
  function getDirectUrl(fileId) { return "https://lh3.googleusercontent.com/d/" + fileId; }

  if (action === "GET_DRIVE_PHOTOS") {
    var skuRequested = e.parameter.sku;
    var fileList = [];
    try {
      var folder = getTargetFolder();
      var files = folder.searchFiles("title contains '" + skuRequested + "' and trashed = false");
      while (files.hasNext()) {
        var file = files.next();
        fileList.push({ name: file.getName(), id: file.getId() });
      }
      fileList.sort(function(a, b) {
        return a.name.localeCompare(b.name, undefined, {numeric: true});
      });
    } catch (err) {}
    return responseJson({ urls: fileList.map(function(f) { return getDirectUrl(f.id); }) });
  }

  if (action === "GET_PDF_BASE64") {
    var sku = e.parameter.sku;
    var cleanSku = String(sku).replace(/\D/g, "").padStart(4, '0');
    try {
      var folder = getBordereauxFolder();
      var files = folder.searchFiles("title contains '" + cleanSku + "' and mimeType = 'application/pdf'");
      if (files.hasNext()) {
        return responseJson({ base64: Utilities.base64Encode(files.next().getBlob().getBytes()), success: true });
      }
    } catch (err) { return responseJson({ base64: null, error: err.message }); }
    return responseJson({ base64: null, success: false });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Stock") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var inventory = data.slice(1).map(row => ({
    sku: String(row[1]).replace(/\D/g, "").padStart(4, '0'),
    headline: row[2], brand: row[3], size: row[4], color: row[5],
    purchasePrice: row[6], shippingFees: row[7], taxes: row[8],
    estimatedPrice: row[9], soldPrice: row[10], vendor: row[11], 
    status: row[12], vintedStatus: row[13],
    cat1: row[14], cat2: row[15], cat3: row[16], cat4: row[17], cat5: row[18],
    description: row[19] || "", transport: row[20] || "", dateStr: row[0]
  }));
  return responseJson(inventory);
}

/**
 * Dossier TEMP_Vinted dans GESTION VINTED
 */
function getTargetFolder() {
  var rootName = "GESTION VINTED";
  var subName = "TEMP_Vinted";
  var roots = DriveApp.getFoldersByName(rootName);
  var root = roots.hasNext() ? roots.next() : DriveApp.createFolder(rootName);
  var subs = root.getFoldersByName(subName);
  return subs.hasNext() ? subs.next() : root.createFolder(subName);
}

/**
 * Dossier BORDEREAUX dans GESTION VINTED (d'après capture)
 */
function getBordereauxFolder() {
  var rootName = "GESTION VINTED";
  var subName = "BORDEREAUX";
  var roots = DriveApp.getFoldersByName(rootName);
  var root = roots.hasNext() ? roots.next() : DriveApp.createFolder(rootName);
  var subs = root.getFoldersByName(subName);
  return subs.hasNext() ? subs.next() : root.createFolder(subName);
}

function responseJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
