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

// Year and branch code maps — must match RegisterScreen exactly
const YEAR_PREFIX_MAP = {
  'First Year':   'FE',
  'Second Year':  'SE',
  'Third Year':   'TE',
  'Fourth Year':  'BE',
};
const BRANCH_CODE_MAP = {
  'Computer Science Engineering':              'CSE',
  'Information Technology':                    'IT',
  'Artificial Intelligence and Data Science':  'AIDS',
  'Civil Engineering':                         'CE',
  'Electrical Engineering':                    'EE',
  'Mechanical Engineering':                    'ME',
};

const normalizeRollNumber = (numericInput, branch, year) => {
  const num = parseInt(String(numericInput).replace(/\D/g, ''), 10);
  if (isNaN(num) || num < 1 || num > 999) {
    throw new Error('Please enter a valid roll number (1–999).');
  }
  const yearCode   = YEAR_PREFIX_MAP[year];
  const branchCode = BRANCH_CODE_MAP[branch];
  if (!yearCode || !branchCode) throw new Error('Invalid branch or year selected.');
  return `${yearCode}-${branchCode}${String(num).padStart(3, '0')}`;
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
    // Validate + normalize first (throws if number out of range)
    const normalizedRoll = normalizeRollNumber(rollNumber, branch, year);
    // Create auth account so Firestore rules allow us to query
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Check for duplicate roll number (must be authenticated to query)
    const q = query(collection(db, 'users'), where('rollNumber', '==', normalizedRoll));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await cred.user.delete(); // clean up the orphan auth account
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
    const normalizedRoll = normalizeRollNumber(rollNumber, branch, year);
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
