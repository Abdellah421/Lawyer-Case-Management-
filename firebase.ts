// Import v9 modular functions
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  Firestore,
  serverTimestamp as v9ServerTimestamp,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase for SSR and to avoid re-initialization on hot reloads.
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);

// Enable offline persistence using IndexedDB cache.
// persistentSingleTabManager is the correct choice for Capacitor / Android WebView
// environments where there is only ever one tab. The multi-tab manager uses a
// service-worker coordination protocol that is not available in WebViews, causing
// the IndexedDB lease to fail silently and falling back to memory-only storage —
// which is why data was disappearing after reinstall / app updates.
const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(undefined),
  }),
});

const storage: FirebaseStorage = getStorage(app);

// Export a v9 serverTimestamp function for use in services.
export const serverTimestamp = v9ServerTimestamp;

export { app, auth, db, storage };
