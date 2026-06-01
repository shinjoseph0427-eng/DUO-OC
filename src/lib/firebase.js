import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { saveFcmToken } from './profile.js';

const requiredEnvs = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = requiredEnvs.filter((k) => !import.meta.env[k]);
if (missing.length > 0) {
  // Push notifications won't work, but the app keeps running — do not throw.
  console.warn('[DUO OC] Firebase env missing:', missing);
}

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function requestPushPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch (e) {
    console.error('Push permission error:', e);
    return null;
  }
}

// FCM token-refresh handling.
// The modular (v9+) SDK has no `onTokenRefresh` event — the supported pattern is
// to re-fetch the token (getToken returns the rotated value) and persist it.
// A rotated token surfaces on a fresh load / when the tab regains focus, so we
// re-fetch on visibilitychange and auto-save it if it changed.
let lastSavedToken = null;

export function watchTokenRefresh(userId) {
  if (!userId || typeof document === 'undefined') return () => {};

  const refresh = async () => {
    if (document.visibilityState !== 'visible') return;
    if (Notification.permission !== 'granted') return;
    try {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      if (token && token !== lastSavedToken) {
        lastSavedToken = token;
        await saveFcmToken(userId, token);
      }
    } catch (e) {
      console.warn('FCM token refresh failed:', e);
    }
  };

  document.addEventListener('visibilitychange', refresh);
  refresh(); // run once on start
  return () => document.removeEventListener('visibilitychange', refresh);
}
