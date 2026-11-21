/**
 * Client-side Firebase Web SDK entry point.
 * The config values below are Firebase's public web-app identifiers (they are
 * not secrets; access control lives in Firebase Security Rules and IAM).
 * Analytics is initialised lazily and only where the Web SDK supports it
 * (browser environments with the required APIs).
 */

import { getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyAaBClT0A5y_q6L599ilBtRQttULDiVknc',
  authDomain: 'we-can-chat-13c4u.firebaseapp.com',
  projectId: 'we-can-chat-13c4u',
  storageBucket: 'we-can-chat-13c4u.firebasestorage.app',
  messagingSenderId: '934529467570',
  appId: '1:934529467570:web:b0b8eb7857b9171eaff5ab',
  measurementId: 'G-XMRN5F9HBX',
};

function getFirebaseApp() {
  if (getApps().length > 0) {
    // Already initialised — return the existing app
    return getApps()[0]!;
  }

  return initializeApp(firebaseConfig);
}

export const firebaseApp = getFirebaseApp();

export async function getFirebaseAnalytics() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const supported = await isSupported();
  return supported ? getAnalytics(firebaseApp) : undefined;
}
