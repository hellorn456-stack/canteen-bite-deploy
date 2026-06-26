# 🍽️ CanteenBite

> A full-stack canteen platform that streamlines food ordering through online ordering, digital wallet payments, real-time order tracking, and analytics.

Developed as part of my **B.E. Computer Engineering Semester 6 Mini Project** using **React.js, Firebase, JavaScript, HTML, and CSS**.

---

## 🛠️ Tech Stack

| Category           | Technologies                                                                                                                                                                                                                                                                                                                                                                                                            |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**       | ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square\&logo=react\&logoColor=black) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square\&logo=javascript\&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square\&logo=html5\&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square\&logo=css3\&logoColor=white) |
| **Backend** | ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square\&logo=firebase\&logoColor=black)                                                                                                                                                                                                                                                                                                             |
| **Database**       | ![Cloud Firestore](https://img.shields.io/badge/Cloud%20Firestore-FFCA28?style=flat-square\&logo=firebase\&logoColor=black)                                                                                                                                                                                                                                                                                             |
| **Authentication** | ![Firebase Authentication](https://img.shields.io/badge/Firebase%20Authentication-FFCA28?style=flat-square\&logo=firebase\&logoColor=black)                                                                                                                                                                                                                                                                             |
| **Deployment**     | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square\&logo=vercel\&logoColor=white)                                                                                                                                                                                                                                                                                                                   |

---

## 💡 Problem Statement

College canteens often experience long queues during break hours, leading to increased waiting times for students and additional workload for canteen staff. Traditional manual ordering also makes it difficult to manage orders efficiently, monitor sales, and maintain an organized workflow.

**CanteenBite** addresses these challenges by digitizing the entire ordering process, enabling students to place orders online, make wallet-based payments, and track their orders in real time while providing managers with powerful tools to manage menus, users, and analytics.

---

## 🔧 Features

### 👨‍🎓 Student & Staff Portal

* Secure Email/Password and Google Sign-in
* Browse menu by category with real-time availability
* Add items to cart and adjust quantities
* Digital wallet for seamless cashless payments
* Order status tracking (Placed → Preparing → Ready → Completed)
* Queue-based estimated ready time
* Cancel eligible orders (only when "Placed") with automatic wallet refunds
* View order history and wallet balance

### 👨‍💼 Manager Dashboard

* View all active + past orders
* Manage menu items (Add, Edit, Delete)
* Mark items as Available or Out of Stock (real-time, no page refresh needed)
* Update live order status (Placed → Preparing → Ready → Completed)
* Recharge user wallet balances
* Search and manage registered users
* Revenue and order analytics dashboard
* Export order reports as CSV for any date range

---

## 🚀 Live Demo

🌐 **Live Application**  
https://canteen-bite-deploy.vercel.app/

📂 **GitHub Repository**  
https://github.com/aryanmitkar/canteen-bite-deploy

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

## ❓ FAQ

**Q: How do I add menu item images?** <br>
A: In the Manager Dashboard → Menu, enter an image URL. You can:
- Upload to Firebase Storage and paste the download URL
- Use any publicly accessible image URL

**Q: Why does Google Sign-In not work on localhost?** <br>
A: Add `localhost` to authorized domains in Firebase Console → Authentication → Settings → Authorized domains

**Q: How do push notifications work?** <br>
A: Firebase Cloud Messaging (FCM) is set up in `firebase.js`. For notifications to work, you need to set up a service worker. This is an advanced step — see Firebase docs for FCM Web setup.

**Q: How to add a new manager?** <br>
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

<p align="center">
🍽️ Developed with ❤️ to make canteens smarter, faster, and more efficient.
</p>
