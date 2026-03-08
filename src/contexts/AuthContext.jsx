import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, onSnapshot,
  collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

const AuthContext = createContext(null);

// ─── Normalization Helpers ─────────────────────────────────
const normalizeRollNumber = (rawRoll, branch) => {
  const branchCode = branch.replace(/\s+/g, '').toUpperCase();
  let numericPart = rawRoll.toUpperCase();
  if (numericPart.startsWith(branchCode)) {
    numericPart = numericPart.slice(branchCode.length);
  }
  numericPart = numericPart.replace(/\D/g, '');
  const padded = numericPart.padStart(3, '0');
  return `${branchCode}${padded}`;
};

const normalizeStaffId = (rawId) => {
  let input = rawId.toUpperCase().trim();
  if (input.startsWith('STF')) input = input.slice(3);
  const numericPart = input.replace(/\D/g, '');
  const padded = numericPart.padStart(3, '0');
  return `STF${padded}`;
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Unsubscribe previous profile listener if any
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        // ── Real-time listener on user profile ──────────────
        // This means wallet balance, name etc. update instantly
        // without any page reload when manager changes them
        const profileRef = doc(db, 'users', firebaseUser.uid);
        profileUnsub = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error('Profile listener error:', err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  // ─── LOGIN ──────────────────────────────────────────────
  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Profile will be set by the onSnapshot listener automatically
    const snap = await getDoc(doc(db, 'users', result.user.uid));
    return snap.exists() ? snap.data() : null;
  };

  // ─── GOOGLE SIGN-IN ─────────────────────────────────────
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const snap = await getDoc(doc(db, 'users', result.user.uid));
    if (!snap.exists()) {
      return { user: result.user, needsProfileSetup: true };
    }
    return { user: result.user, profile: snap.data(), needsProfileSetup: false };
  };

  // ─── REGISTER STUDENT ───────────────────────────────────
  const registerStudent = async ({ email, password, name, branch, rollNumber, year }) => {
    const normalizedRoll = normalizeRollNumber(rollNumber, branch);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const q = query(collection(db, 'users'), where('rollNumber', '==', normalizedRoll));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await cred.user.delete();
      throw new Error(`Roll number ${normalizedRoll} is already registered. Please contact the canteen manager.`);
    }
    const profileData = {
      name, email, role: 'student', branch,
      rollNumber: normalizedRoll, year,
      walletBalance: 0, fcmToken: null,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profileData);
    return profileData;
  };

  // ─── COMPLETE GOOGLE PROFILE ────────────────────────────
  const completeStudentProfile = async (uid, { name, branch, rollNumber, year }) => {
    const normalizedRoll = normalizeRollNumber(rollNumber, branch);
    const q = query(collection(db, 'users'), where('rollNumber', '==', normalizedRoll));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`Roll number ${normalizedRoll} is already registered. Please contact the canteen manager.`);
    }
    const profileData = {
      name, email: auth.currentUser?.email || '',
      role: 'student', branch,
      rollNumber: normalizedRoll, year,
      walletBalance: 0, fcmToken: null,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid), profileData);
    return profileData;
  };

  // ─── REGISTER STAFF ─────────────────────────────────────
  const registerStaff = async ({ email, password, name, staffId }) => {
    const normalizedStaffId = normalizeStaffId(staffId);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const q = query(collection(db, 'users'), where('staffId', '==', normalizedStaffId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await cred.user.delete();
      throw new Error(`Staff ID ${normalizedStaffId} is already registered. Please contact the canteen manager.`);
    }
    const profileData = {
      name, email, role: 'staff',
      staffId: normalizedStaffId,
      walletBalance: 0, fcmToken: null,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profileData);
    return profileData;
  };

  // ─── LOGOUT ─────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const value = {
    user, profile, loading,
    login, loginWithGoogle,
    registerStudent, registerStaff, completeStudentProfile,
    logout,
    // refreshProfile kept for compatibility but no longer needed
    // since profile is now real-time via onSnapshot
    refreshProfile: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
