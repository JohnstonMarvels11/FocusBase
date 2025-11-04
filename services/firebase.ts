import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile,
    type User
} from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    addDoc 
} from "firebase/firestore";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import type { UserData, AuthUser, SharedNote } from '../types';

// Your web app's Firebase configuration
// SECURITY NOTE: This configuration, including the apiKey, is intended to be public.
// It identifies your Firebase project on Google's servers. Security for your data is
// enforced by Firebase Security Rules in your project console, not by keeping this key secret.
const firebaseConfig = {
  apiKey: "AIzaSyASyBzXu7xAnBBspdDNAd7b2Ia_iXGumbU",
  authDomain: "study-sphere-6675b.firebaseapp.com",
  projectId: "study-sphere-6675b",
  storageBucket: "study-sphere-6675b.appspot.com",
  messagingSenderId: "572361603589",
  appId: "1:572361603589:web:b528fe5037357b6b9afa6c",
  measurementId: "G-8LCBQBJ00X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

isSupported().then(supported => {
  if (supported) {
    try {
      getAnalytics(app);
    } catch (e) {
      console.warn("Firebase Analytics could not be initialized. If a 'PERMISSION_DENIED' error persists, please double-check that the Firebase Installations API is enabled in your Google Cloud project.", e);
    }
  }
});


// --- Authentication Functions ---

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/documents.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
googleProvider.addScope('https://www.googleapis.com/auth/tasks');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);

export const signOutUser = () => signOut(auth);

export const onAuthStateChangedListener = (callback: (user: AuthUser | null) => void) => onAuthStateChanged(auth, callback as (user: User | null) => void);

export const updateUserProfile = async (profile: { displayName?: string; photoURL?: string; }): Promise<void> => {
  const user = auth.currentUser;
  if (user) {
    await updateProfile(user, profile);
  } else {
    throw new Error("No authenticated user found to update profile.");
  }
};

// Re-export the GoogleAuthProvider class for use in other components
export { GoogleAuthProvider };


// --- Firestore Data Functions ---

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const defaultUserData: Omit<UserData, 'customThemes' | 'studySets'> = {
    tasks: [], notes: [], goals: [], events: [], reminders: [], whiteboards: [],
    usage: { 
        advanced: { count: 0, lastReset: getTodayDateString() }, 
        standard: { count: 0, lastReset: getTodayDateString() },
        assistant: { count: 0, lastReset: getTodayDateString() } 
    },
};

export const getUserData = async (userId: string): Promise<UserData> => {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return { ...defaultUserData, ...data } as UserData;
    } else {
        await setDoc(userDocRef, defaultUserData);
        return defaultUserData as UserData;
    }
};

export const updateUserData = async (userId: string, data: Partial<UserData>): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
};

export const resetUserData = async (userId: string): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, defaultUserData);
};

// --- Firestore Sharing Functions ---

/**
 * Creates a public, read-only snapshot of a note.
 * Requires user to be authenticated.
 * @param item - The shared note data.
 * @returns The unique ID of the shared document.
 */
export const createSharedItem = async (item: SharedNote): Promise<string> => {
    if (!auth.currentUser) throw new Error("Authentication required to share items.");
    const docRef = await addDoc(collection(db, 'shared_items'), item);
    return docRef.id;
};

/**
 * Retrieves a shared item by its unique ID.
 * Publicly readable.
 * @param shareId - The ID of the shared document.
 * @returns The shared item data, or null if not found.
 */
export const getSharedItem = async (shareId: string): Promise<SharedNote | null> => {
    const docRef = doc(db, 'shared_items', shareId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as SharedNote;
    }
    return null;
};

// --- Firebase Storage Functions ---

/**
 * Uploads a material file to Firebase Storage.
 * @param userId The user's UID.
 * @param file The file to upload.
 * @returns The full path to the file in Storage.
 */
export const uploadMaterialFile = async (userId: string, file: File): Promise<string> => {
    const filePath = `users/${userId}/materials/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, filePath);
    await uploadBytes(fileRef, file);
    return filePath;
};

/**
 * Gets the download URL for a file in Firebase Storage.
 * @param storagePath The full path to the file.
 * @returns A promise that resolves to the download URL.
 */
export const getMaterialDownloadUrl = async (storagePath: string): Promise<string> => {
    const fileRef = ref(storage, storagePath);
    return getDownloadURL(fileRef);
};

/**
 * Deletes a file from Firebase Storage.
 * @param storagePath The full path to the file.
 */
export const deleteMaterialFile = async (storagePath: string): Promise<void> => {
    const fileRef = ref(storage, storagePath);
    try {
        await deleteObject(fileRef);
    } catch (error: any) {
        // It's okay if the file doesn't exist, maybe it was already deleted.
        if (error.code !== 'storage/object-not-found') {
            console.error("Error deleting file from storage:", error);
            throw error; // Re-throw other errors
        }
    }
};