import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  // FIX: Aliased the imported function to avoid name collision with the exported wrapper function.
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';

export type { FirebaseUser };

/**
 * Registers a new user with email and password, and prepares user profile data.
 * @param name The user's full name.
 * @param email The user's email.
 * @param pass The user's password.
 * @returns The user credential from Firebase.
 */
export const register = async (name: string, email: string, pass: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  
  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName: name });
    await sendEmailVerification(userCredential.user);
  }

  return userCredential;
};

/**
 * Signs in a user with their email and password.
 * @param email The user's email.
 * @param pass The user's password.
 * @returns The user credential from Firebase.
 */
export const login = (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

/**
 * Signs out the current user.
 */
export const logout = () => {
  return signOut(auth);
};

/**
 * Sends a password reset email to the specified email address.
 * @param email The user's email.
 */
export const resetPassword = (email: string) => {
    return sendPasswordResetEmail(auth, email);
};

/**
 * Listens for authentication state changes.
 * @param callback A function to be called with the user object or null.
 * @returns An unsubscribe function.
 */
export const onAuthStateChanged = (callback: (user: FirebaseUser | null) => void) => {
    // FIX: Called the aliased import 'firebaseOnAuthStateChanged' instead of the local function.
    return firebaseOnAuthStateChanged(auth, callback);
}
