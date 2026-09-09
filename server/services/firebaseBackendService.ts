import axios from 'axios';

/**
 * Server-side Firebase Backend Service
 * 
 * Safely manages Firebase console and server credentials strictly in the Backend.
 * Never exposes the Firebase console API Key to the frontend or client bundles.
 */

// Backend-only key provided for server operations
const DEFAULT_FIREBASE_KEY = 'AIzaSyApvrjOz196Z3feFfkW6y3W7r4OQiM6oIY';

const getFirebaseApiKey = (): string => {
  const key = process.env.FIREBASE_API_KEY || process.env.FIREBASE_CONSOLE_API_KEY || DEFAULT_FIREBASE_KEY;
  return key.trim();
};

export interface FirebaseBackendStatus {
  hasApiKey: boolean;
  maskedApiKey: string;
  projectId: string;
  hostingSite: string;
  hostingUrl: string;
  hostingDomainAliases: string[];
  status: 'connected' | 'unconfigured';
}

export const getFirebaseBackendStatus = (): FirebaseBackendStatus => {
  const apiKey = getFirebaseApiKey();
  const maskedApiKey = apiKey && apiKey.length > 8 
    ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` 
    : (apiKey ? '***configured***' : 'not_set');

  return {
    hasApiKey: Boolean(apiKey),
    maskedApiKey,
    projectId: 'sj-tutorai',
    hostingSite: 'sj-tutorai',
    hostingUrl: 'https://sj-tutorai.web.app',
    hostingDomainAliases: [
      'https://sj-tutorai.web.app',
      'https://sj-tutorai.firebaseapp.com'
    ],
    status: apiKey ? 'connected' : 'unconfigured'
  };
};

/**
 * Server-side Firebase Identity Toolkit lookup
 * Verifies or retrieves account details via Google Identity Toolkit REST API
 */
export const verifyFirebaseUserWithBackend = async (idToken: string): Promise<{ success: boolean; user?: any; error?: string }> => {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    return { success: false, error: 'Firebase backend API key is not configured on the server.' };
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`;
    const response = await axios.post(
      url,
      { idToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    const users = response.data?.users;
    if (users && users.length > 0) {
      return { success: true, user: users[0] };
    }
    return { success: false, error: 'No user found for the provided token.' };
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to verify token with Firebase backend.';
    return { success: false, error: errorMessage };
  }
};

/**
 * Server-side check if email exists in Firebase Auth
 */
export const checkFirebaseEmailWithBackend = async (email: string): Promise<{ exists: boolean; error?: string }> => {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    return { exists: false, error: 'Firebase backend API key is not configured on the server.' };
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(apiKey)}`;
    const response = await axios.post(
      url,
      { identifier: email, continueUri: 'https://sj-tutorai.web.app' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    const registered = Boolean(response.data?.registered);
    return { exists: registered };
  } catch (error: any) {
    return { exists: false, error: error?.response?.data?.error?.message || error?.message };
  }
};
