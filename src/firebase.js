// ============================================================
// FIREBASE CONFIGURATION – CANTEENBITE
// ============================================================
// HOW TO SET UP FIREBASE:
// 1. Go to https://console.firebase.google.com/
// 2. Click "Add project" → Name it "canteenbite"
// 3. Click "Add app" → choose Web (</>)
// 4. Copy the config below
// 5. Enable Authentication (Email/Password + Google)
// 6. Create Firestore Database (test mode, asia-south1)
// 7. Replace placeholder values below with your actual config
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 🔴 REPLACE THESE WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};


const app = initializeApp(firebaseConfig);

export const auth          = getAuth(app);
export const db            = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

// ============================================================
// FIRESTORE DATABASE STRUCTURE (reference):
//
// users/{userId}
//   name, email, role, rollNumber/staffId, branch, year
//   walletBalance, fcmToken, createdAt
//
// menuItems/{itemId}
//   name, category, price, imageUrl, prepTime, available, createdAt
//
// orders/{orderId}
//   orderId, token, dailyOrderNumber, userId, userName, userType
//   items[], totalAmount, totalPrepTime
//   status: Placed | Preparing | Ready | Completed | Cancelled
//   estimatedReadyTime, createdAt
//
// dailyCounters/{YYYYMMDD}
//   count: number
// ============================================================
