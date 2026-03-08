# 🍽️ CanteenBite – Smart Canteen Ordering System
**ICOE College · Built with React + Firebase**

---

## 📁 Project Structure

```
canteenbite/
├── src/
│   ├── assets/              ← Put your college logo here (logo.png)
│   ├── components/
│   │   ├── BottomNav.jsx    ← Bottom navigation bar
│   │   └── OrderProgressBar.jsx  ← Order status tracker
│   ├── contexts/
│   │   ├── AuthContext.jsx  ← Login/Registration logic
│   │   └── CartContext.jsx  ← Shopping cart state
│   ├── screens/
│   │   ├── LoginScreen.jsx
│   │   ├── RegisterScreen.jsx
│   │   ├── student/
│   │   │   ├── MenuScreen.jsx    ← Browse food menu
│   │   │   ├── CartScreen.jsx    ← Cart + Order placement
│   │   │   ├── OrdersScreen.jsx  ← Track orders
│   │   │   ├── WalletScreen.jsx  ← View wallet balance
│   │   │   └── ProfileScreen.jsx
│   │   └── manager/
│   │       └── ManagerDashboard.jsx ← Full admin panel
│   ├── styles/global.css    ← Design system
│   ├── firebase.js          ← 🔴 PUT YOUR FIREBASE CONFIG HERE
│   ├── App.jsx              ← Routes
│   └── main.jsx
├── firestore.rules          ← Paste into Firebase Console
├── package.json
└── README.md
```

---

## 🚀 STEP-BY-STEP SETUP GUIDE

### Step 1 – Install Node.js
Download from: https://nodejs.org (choose LTS version)

### Step 2 – Install Dependencies
Open terminal in the `canteenbite` folder and run:
```bash
npm install
```

### Step 3 – Set Up Firebase

1. Go to https://console.firebase.google.com/
2. Click **"Add project"** → Name it `canteenbite`
3. Click **"Add app"** → Choose **Web** (</>)
4. Register the app, copy the config

5. In Firebase Console, enable these services:

   **Authentication:**
   - Go to Authentication → Sign-in method
   - Enable **Email/Password**
   - Enable **Google**

   **Firestore Database:**
   - Go to Firestore Database → Create database
   - Start in **test mode** (you'll add rules later)
   - Choose a region close to India (e.g., asia-south1)

   **Storage (for future image uploads):**
   - Go to Storage → Get started

### Step 4 – Add Firebase Config

Open `src/firebase.js` and replace:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",           ← Replace with your values
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### Step 5 – Set Firestore Security Rules

1. Go to Firestore → Rules tab
2. Copy the contents of `firestore.rules` and paste it there
3. Click **Publish**

### Step 6 – Create Manager Account

1. Start the app: `npm run dev`
2. Register as a student first
3. Go to Firebase Console → Firestore → users collection
4. Find your user document
5. Change `role` from `"student"` to `"manager"`
6. Sign out and sign back in — you'll see the Manager Dashboard!

### Step 7 – Add Your College Logo

1. Save your college logo as `src/assets/logo.png`
2. If it's a different format (.jpg, .svg), update the import in `LoginScreen.jsx`:
   ```jsx
   import logoUrl from '../assets/logo.png'; // change extension if needed
   ```

### Step 8 – Add Menu Items

1. Sign in as Manager
2. Go to the **Menu** tab
3. Click **"+ Add Item"** and fill in:
   - Name, Category, Price, Prep Time
   - Image URL (optional — you can use a web URL or leave blank)
4. For item images: upload images to Firebase Storage or use any image hosting

### Step 9 – Run & Test

```bash
npm run dev
```
Open http://localhost:5173 in your browser.

---

## 🏗️ BUILD FOR PRODUCTION

```bash
npm run build
```
Then deploy the `dist/` folder to:
- Firebase Hosting: `firebase deploy`
- Vercel: drag & drop the dist folder
- Netlify: same as above

---

## 📱 CONVERTING TO REACT NATIVE (Future)

This project is structured to make React Native migration easier:
- All business logic is in `contexts/` (reusable)
- Firebase calls are the same in React Native
- UI components can be rewritten with React Native equivalents

For React Native, use **Expo**: https://expo.dev

---

## 🔧 FEATURES IMPLEMENTED

### Students & Staff
- ✅ Email/Password registration & login
- ✅ Google Sign-In
- ✅ Roll number / Staff ID duplicate check
- ✅ Browse menu by category with real-time updates
- ✅ Add to cart, adjust quantities
- ✅ Order placement with wallet deduction
- ✅ Queue-based estimated ready time
- ✅ Order status tracking (Placed → Preparing → Ready → Completed)
- ✅ Cancel orders (only when "Placed") with auto-refund
- ✅ Order history (read-only)
- ✅ Wallet balance view
- ✅ Bottom navigation

### Manager
- ✅ View all active + past orders
- ✅ Advance order status (Placed → Preparing → Ready → Completed)
- ✅ Add/Edit/Delete menu items
- ✅ Mark items Out of Stock / Available (real-time)
- ✅ Recharge user wallets (search by name/ID)
- ✅ Today's analytics dashboard
- ✅ Export orders as CSV by date range

---

## ❓ FAQ

**Q: How do I add menu item images?**
A: In the Manager Dashboard → Menu, enter an image URL. You can:
- Upload to Firebase Storage and paste the download URL
- Use any publicly accessible image URL

**Q: Why does Google Sign-In not work on localhost?**
A: Add `localhost` to authorized domains in Firebase Console → Authentication → Settings → Authorized domains

**Q: How do push notifications work?**
A: Firebase Cloud Messaging (FCM) is set up in `firebase.js`. For notifications to work, you need to set up a service worker. This is an advanced step — see Firebase docs for FCM Web setup.

**Q: How to add a new manager?**
A: Register normally, then manually change `role` to `"manager"` in Firestore Console.

---

## 🎨 DESIGN SYSTEM

| Color | Usage |
|-------|-------|
| #E8590C (Saffron Orange) | Primary, CTAs |
| #1A1A2E (Dark Navy) | Manager header |
| #F7B731 (Amber) | Accent |
| Baloo 2 | Headings |
| Nunito | Body text |

---

Built with ❤️ for ICOE College Canteen
