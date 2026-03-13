import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { AddItem } from './components/AddItem';
import { EditItem } from './components/EditItem';
import { ItemDetails } from './components/ItemDetails';
import { StockView } from './components/StockView';
import { CommandView } from './components/CommandView';
import { SalesView } from './components/SalesView';
import { Dashboard } from './components/Dashboard';
import { SplashScreen } from './components/SplashScreen';
import { preloadImages } from './services/imageCache';
import { migrateThumbnails } from './services/migrateThumbnails';
import { View, InventoryItem } from './types';
import { getInventory, deleteItem as deleteItemFromFirestore, saveItem, updateItem } from './services/inventoryService';
import { deleteImageFromStorage } from './services/storageService';
import { syncGmail } from './services/gmailService';

const COMMAND_STATUSES = ['À traiter', 'À envoyer', 'Expédié', 'Litige'];
const CACHE_KEY = 'vinted_inventory';
const VIEW_KEY = 'vinted_current_view';
const LOAD_TIME_KEY = 'vinted_last_load_time';
const REFRESH_INTERVAL = 120_000; // 2 min

const readCache = (): InventoryItem[] => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch { return []; }
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(
    () => (localStorage.getItem(VIEW_KEY) as View) || View.DASHBOARD
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(readCache);
  const [isLoading, setIsLoading] = useState(false);
  // Le splash reste visible jusqu'à la fin du chargement complet (auth + données + photos)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState(() => parseInt(localStorage.getItem(LOAD_TIME_KEY) || '0'));
  const [splashMessage, setSplashMessage] = useState('Initialisation...');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  // Indique si l'auth est résolue ET les données chargées → on peut afficher le Layout
  const [isAppReady, setIsAppReady] = useState(false);

  const scrollPositions = useRef<Record<string, number>>({});

  // Persist current view
  useEffect(() => { localStorage.setItem(VIEW_KEY, currentView); }, [currentView]);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
      if (u) {
        localStorage.setItem('vinted_is_logged_in', 'true');
        setSplashMessage("Récupération de l'inventaire...");
      } else {
        localStorage.removeItem('vinted_is_logged_in');
        // Pas connecté → on cache le splash pour afficher Login
        
        setIsAppReady(true);
      }
    });
  }, []);

  // Scroll position management
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root || currentView === View.EDIT_ITEM) return;
    if (currentView === View.ITEM_DETAILS) {
      root.scrollTop = 0;
      return;
    }
    const saved = scrollPositions.current[currentView];
    root.scrollTop = saved ?? 0;
  }, [currentView]);

  const saveCache = useCallback((data: InventoryItem[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(
        data.map(item => ({ ...item, images: [] }))
      ));
    } catch {}
  }, []);

  const navigateTo = useCallback((view: View, item: InventoryItem | null = null) => {
    const root = document.getElementById('root');
    if (root) scrollPositions.current[currentView] = root.scrollTop;
    setSelectedItem(item);
    setCurrentView(view);
  }, [currentView]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const now = Date.now();
    if (!isInitialLoad && now - lastLoadTime < REFRESH_INTERVAL) return;

    setSplashMessage("Récupération de l'inventaire...");
    
    setCloudError(null);

    try {
      const firestoreData = await getInventory(user.uid);

      // Déduplique par SKU
      const seen = new Set<string>();
      const merged = firestoreData.filter(item => {
        const dup = seen.has(item.sku);
        seen.add(item.sku);
        return !dup;
      });

      setInventory(merged);
      setIsInitialLoad(false);
      setLastLoadTime(now);
      localStorage.setItem(LOAD_TIME_KEY, String(now));
      saveCache(merged);

      // Précharge uniquement les images des articles sans thumbnail
      // (ceux avec thumbnail s'affichent instantanément depuis Firestore)
      const urls = merged
        .filter(item => !item.thumbnail)
        .map(item => item.Images?.[0])
        .filter((url): url is string => !!url);

      if (urls.length > 0) {
        setSplashMessage(`Chargement des photos (0/${urls.length})...`);
        await preloadImages(urls, (done, total) => {
          setSplashMessage(`Chargement des photos (${done}/${total})...`);
        });
      }
    } catch (err: any) {
      console.error('Load error:', err);
      setCloudError(
        err.code === 'permission-denied' || err.message?.includes('permission')
          ? 'Erreur de permissions Firestore.'
          : 'Erreur de connexion au serveur'
      );
      const cached = readCache();
      setInventory(prev => prev.length === 0 && cached.length ? cached : prev);
      setIsInitialLoad(false);
    } finally {
      
      setIsAppReady(true);
      setIsLoading(false);
    }
  }, [user, isInitialLoad, lastLoadTime, saveCache]);

  useEffect(() => { if (user) loadData(); }, [user]); // eslint-disable-line

  // Lance la migration des thumbnails en arrière-plan après le premier chargement
  // Ne bloque pas l'affichage — s'exécute silencieusement
  useEffect(() => {
    if (!isAppReady || !user || inventory.length === 0) return;
    const toMigrate = inventory.filter(i => !i.thumbnail && i.Images?.length > 0);
    if (toMigrate.length === 0) return;

    console.log(`[Migration] ${toMigrate.length} thumbnails manquants — génération en arrière-plan...`);
    migrateThumbnails(user.uid, inventory).then(() => {
      // Recharge silencieusement pour récupérer les nouveaux thumbnails
      setIsInitialLoad(true);
    });
  }, [isAppReady]); // eslint-disable-line

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const token = localStorage.getItem('google_access_token');

    const performSync = async (accessToken: string) => {
      try {
        await syncGmail(user, inventory, accessToken);
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('authentication')) {
          localStorage.removeItem('google_access_token');
        }
      }
    };

    if (!token) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const newToken = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
        if (newToken) {
          localStorage.setItem('google_access_token', newToken);
          await performSync(newToken);
        }
      } catch {}
    } else {
      await performSync(token);
    }

    await loadData();
  }, [user, inventory, loadData]);

  const handleImageFetch = useCallback((sku: string, urls: string[]) => {
    setInventory(prev => {
      const next = prev.map(item => item.sku === sku ? { ...item, Images: urls } : item);
      saveCache(next);
      return next;
    });
  }, [saveCache]);

  const handleUpdateItem = useCallback(async (updatedItem: InventoryItem) => {
    if (!user) return;
    try {
      const newId = await updateItem(user.uid, updatedItem.sku, updatedItem);
      const item = { ...updatedItem, id: newId };
      setInventory(prev => {
        const next = prev.map(i => i.sku === item.sku ? item : i);
        saveCache(next);
        return next;
      });
      // Toujours mettre à jour selectedItem si c'est le même article,
      // pour que ItemDetails affiche les données fraîches
      setSelectedItem(prev => prev?.sku === item.sku ? item : prev);
    } catch (err) { console.error('Error updating item:', err); }
  }, [user, saveCache]);

  const handleBulkUpdate = useCallback(async (skus: string[], updates: Partial<InventoryItem>) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const results = await Promise.all(
        skus.map(async sku => {
          const newId = await updateItem(user.uid, sku, updates);
          const existing = inventory.find(i => i.sku === sku);
          return existing ? { ...existing, ...updates, id: newId } : null;
        })
      );
      const updated = results.filter(Boolean) as InventoryItem[];
      setInventory(prev => {
        const next = prev.map(item => updated.find(u => u.sku === item.sku) ?? item);
        saveCache(next);
        return next;
      });
    } catch (err) { console.error('Bulk update error:', err); }
    finally { setIsLoading(false); }
  }, [user, inventory, saveCache]);

  const handleSave = useCallback(async (item: InventoryItem, stayOnPage?: boolean) => {
    if (!user) return;
    try {
      await saveItem(user.uid, item);
      setInventory(prev => {
        const next = prev.find(i => i.sku === item.sku)
          ? prev.map(i => i.sku === item.sku ? item : i)
          : [item, ...prev];
        saveCache(next);
        return next;
      });
      if (!stayOnPage) navigateTo(View.STOCK_VIEW);
    } catch (err) { console.error('Error saving item:', err); }
  }, [user, navigateTo, saveCache]);

  const handleDelete = useCallback(async (sku: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Delete Firestore document
      await deleteItemFromFirestore(user.uid, sku);
      // Also delete images from Firebase Storage to avoid orphaned files
      const item = inventory.find(i => i.sku === sku);
      if (item?.Images?.length) {
        await Promise.allSettled(item.Images.map(url => deleteImageFromStorage(url)));
      }
      setInventory(prev => {
        const next = prev.filter(i => i.sku !== sku);
        saveCache(next);
        return next;
      });
      navigateTo(View.STOCK_VIEW);
    } catch (err) { console.error('Error deleting item:', err); }
    finally { setIsLoading(false); }
  }, [user, inventory, navigateTo, saveCache]);

  const getNextSku = useCallback(() => {
    if (inventory.length === 0) return '0001';
    const max = Math.max(0, ...inventory.map(i => parseInt(i.sku.replace(/\D/g, '')) || 0));
    return (max + 1).toString().padStart(4, '0');
  }, [inventory]);

  const hasPhotos = (item: InventoryItem) =>
    !!(item.images?.length || item.Images?.length);

  const stockItems = inventory.filter(i =>
    (!i.isSold && (!COMMAND_STATUSES.includes(i.articleStatus) || !hasPhotos(i))) ||
    (i.isSold && !hasPhotos(i))
  );
  const commandItems = inventory.filter(i => COMMAND_STATUSES.includes(i.articleStatus) && hasPhotos(i));
  const soldItems = inventory.filter(i => i.isSold && hasPhotos(i));

  const hasUserHint = localStorage.getItem('vinted_is_logged_in') === 'true';

  // Splash unique : visible pendant auth + chargement données + photos
  if (!isAppReady) return <SplashScreen isVisible statusMessage={splashMessage} />;
  if (!user) return <Login />;

  return (
    <Layout
      currentView={currentView}
      setView={navigateTo}
      onRefresh={handleRefresh}
      isRefreshing={isLoading}
      isAuthLoading={isAuthLoading}
      error={cloudError}
      selectedItem={selectedItem}
    >

      <div className={currentView === View.DASHBOARD ? 'block' : 'hidden'}>
        <Dashboard inventory={inventory} onRefresh={handleRefresh} />
      </div>

      <div className={currentView === View.STOCK_VIEW ? 'block' : 'hidden'}>
        <StockView
          inventory={stockItems}
          onAddClick={() => navigateTo(View.ADD_ITEM)}
          onItemClick={(item) => navigateTo(View.ITEM_DETAILS, item)}
          onImageFetch={handleImageFetch}
          onBulkUpdate={handleBulkUpdate}
          isLoading={isLoading}
        />
      </div>

      <div className={currentView === View.COMMAND_VIEW ? 'block' : 'hidden'}>
        <CommandView
          user={user}
          inventory={commandItems}
          onItemClick={(item) => navigateTo(View.ITEM_DETAILS, item)}
          onImageFetch={handleImageFetch}
          onUpdateItem={handleUpdateItem}
          isLoading={isLoading}
        />
      </div>

      <div className={currentView === View.SOLD_VIEW ? 'block' : 'hidden'}>
        <SalesView
          inventory={soldItems}
          onItemClick={(item) => navigateTo(View.ITEM_DETAILS, item)}
          onImageFetch={handleImageFetch}
          isLoading={isLoading}
        />
      </div>

      {currentView === View.ADD_ITEM && (
        <AddItem
          onSave={handleSave}
          onCancel={() => navigateTo(View.STOCK_VIEW)}
          onGoToStock={() => navigateTo(View.STOCK_VIEW)}
          nextSku={getNextSku()}
        />
      )}

      {currentView === View.EDIT_ITEM && selectedItem && (
        <EditItem
          item={selectedItem}
          onSave={async (updated) => { await handleUpdateItem(updated); navigateTo(View.ITEM_DETAILS, updated); }}
          onCancel={() => navigateTo(View.ITEM_DETAILS, selectedItem)}
          onGoToStock={async (updated) => { await handleUpdateItem(updated); navigateTo(View.STOCK_VIEW); }}
          onDelete={handleDelete}
        />
      )}

      {currentView === View.ITEM_DETAILS && selectedItem && (
        <ItemDetails
          item={selectedItem}
          onEdit={() => navigateTo(View.EDIT_ITEM, selectedItem)}
          onBack={() => {
            if (selectedItem.isSold) navigateTo(View.SOLD_VIEW);
            else if (COMMAND_STATUSES.includes(selectedItem.articleStatus)) navigateTo(View.COMMAND_VIEW);
            else navigateTo(View.STOCK_VIEW);
          }}
          onDelete={handleDelete}
        />
      )}
    </Layout>
  );
};

export default App;
