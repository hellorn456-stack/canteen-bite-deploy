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
import config from '../config';

const AuthContext = createContext(null);

const normalizeRollNumber = (rawRoll, branch) => {
  const branchCode = branch.replace(/\s+/g, '').toUpperCase();
  let numericPart = rawRoll.toUpperCase();
  if (numericPart.startsWith(branchCode)) numericPart = numericPart.slice(branchCode.length);
  numericPart = numericPart.replace(/\D/g, '');
  return `${branchCode}${numericPart.padStart(3, '0')}`;
};

const normalizeStaffId = (rawId) => {
  let input = rawId.toUpperCase().trim();
  if (input.startsWith('STF')) input = input.slice(3);
  return `STF${input.replace(/\D/g, '').padStart(3, '0')}`;
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }

      if (firebaseUser) {
        setUser(firebaseUser);
        const profileRef = doc(db, 'users', firebaseUser.uid);
        profileUnsub = onSnapshot(profileRef, (snap) => {
          setProfile(snap.exists() ? snap.data() : null);
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

    return () => { authUnsub(); if (profileUnsub) profileUnsub(); };
  }, []);

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', result.user.uid));
    return snap.exists() ? snap.data() : null;
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const snap = await getDoc(doc(db, 'users', result.user.uid));
    if (!snap.exists()) return { user: result.user, needsProfileSetup: true };
    return { user: result.user, profile: snap.data(), needsProfileSetup: false };
  };

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
      walletBalance: config.welcomeBonus,
      welcomeBonusClaimed: false,
      fcmToken: null,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profileData);
    return profileData;
  };

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
      walletBalance: config.welcomeBonus,
      welcomeBonusClaimed: false,
      fcmToken: null,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid), profileData);
    return profileData;
  };

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
      walletBalance: config.welcomeBonus,
      welcomeBonusClaimed: false,
      fcmToken: null,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profileData);
    return profileData;
  };

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
    refreshProfile: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
