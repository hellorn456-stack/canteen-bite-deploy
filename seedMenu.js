// ============================================================
// CANTEENBITE – MENU SEED SCRIPT
// Run this ONCE to populate all menu items in Firestore
//
// HOW TO RUN:
// 1. npm install firebase-admin (inside canteenbite folder)
// 2. Download service account key from Firebase Console:
//    → Project Settings → Service Accounts → Generate New Private Key
//    → Save the downloaded file as "serviceAccountKey.json"
//    → Place it in the canteenbite folder (same level as package.json)
// 3. Run: node seedMenu.js
// ============================================================

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Load service account key
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── MENU ITEMS ────────────────────────────────────────────
// imageUrl: leave as "" for now — you can add URLs later
//           from Manager Dashboard → Menu → ✏️ Edit
// ──────────────────────────────────────────────────────────
const menuItems = [

  // ── BEVERAGES ────────────────────────────────────────────
  {
    name: 'Tea',
    category: 'Beverages',
    price: 10,
    prepTime: 2,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Coffee',
    category: 'Beverages',
    price: 15,
    prepTime: 3,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Cold Coffee',
    category: 'Beverages',
    price: 30,
    prepTime: 4,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Lemonade',
    category: 'Beverages',
    price: 20,
    prepTime: 2,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Buttermilk',
    category: 'Beverages',
    price: 15,
    prepTime: 2,
    imageUrl: '',
    available: true,
  },

  // ── ICE CREAMS ───────────────────────────────────────────
  {
    name: 'Vanilla Ice Cream',
    category: 'Ice Creams',
    price: 30,
    prepTime: 1,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Chocolate Ice Cream',
    category: 'Ice Creams',
    price: 30,
    prepTime: 1,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Strawberry Ice Cream',
    category: 'Ice Creams',
    price: 30,
    prepTime: 1,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Butterscotch Ice Cream',
    category: 'Ice Creams',
    price: 35,
    prepTime: 1,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Mango Ice Cream',
    category: 'Ice Creams',
    price: 35,
    prepTime: 1,
    imageUrl: '',
    available: true,
  },

  // ── INDIAN FOOD ──────────────────────────────────────────
  {
    name: 'Samosa',
    category: 'Indian Food',
    price: 15,
    prepTime: 3,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Vada Pav',
    category: 'Indian Food',
    price: 20,
    prepTime: 5,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Bread Omelette',
    category: 'Indian Food',
    price: 35,
    prepTime: 7,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Sandwich',
    category: 'Indian Food',
    price: 40,
    prepTime: 5,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Maggi',
    category: 'Indian Food',
    price: 30,
    prepTime: 7,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Poha',
    category: 'Indian Food',
    price: 25,
    prepTime: 5,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Upma',
    category: 'Indian Food',
    price: 25,
    prepTime: 5,
    imageUrl: '',
    available: true,
  },

  // ── MAHARASHTRIAN SPECIAL ────────────────────────────────
  {
    name: 'Misal Pav',
    category: 'Maharashtrian Special',
    price: 50,
    prepTime: 8,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Thalipeeth',
    category: 'Maharashtrian Special',
    price: 40,
    prepTime: 8,
    imageUrl: '',
    available: true,
  },
  {
    name: 'Kande Pohe',
    category: 'Maharashtrian Special',
    price: 30,
    prepTime: 5,
    imageUrl: '',
    available: true,
  },
];

// ─── SEED FUNCTION ─────────────────────────────────────────
async function seedMenu() {
  console.log('🍽️  CanteenBite – Menu Seeder');
  console.log('─────────────────────────────');

  // Check if menu items already exist
  const existing = await db.collection('menuItems').limit(1).get();
  if (!existing.empty) {
    console.log('⚠️  Menu items already exist in Firestore!');
    console.log('   If you want to re-seed, manually delete the menuItems');
    console.log('   collection from Firebase Console first, then run again.');
    process.exit(0);
  }

  console.log(`📋 Adding ${menuItems.length} menu items...\n`);

  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  menuItems.forEach((item) => {
    const ref = db.collection('menuItems').doc();
    batch.set(ref, { ...item, createdAt: now });
    console.log(`   ✅ ${item.category.padEnd(25)} ${item.name}`);
  });

  await batch.commit();

  console.log('\n─────────────────────────────');
  console.log('🎉 All menu items added successfully!');
  console.log('   Open your app → Manager Dashboard → Menu tab to verify.');
  console.log('   You can edit prices, images, and prep times anytime.\n');

  process.exit(0);
}

seedMenu().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
