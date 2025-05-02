// src/authService.js
import { auth } from "./firebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";

// Sign Up Function
export const signUp = async (email, password, name, organization) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update the user's profile with name and organization
    await updateProfile(userCredential.user, {
      displayName: name,
      photoURL: null
    });
    // Store organization in user metadata
    await userCredential.user.updateProfile({
      displayName: `${name} (${organization})`
    });
    return userCredential.user;
  } catch (error) {
    throw error.message;
  }
};

// Login Function
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error.message;
  }
};

// Logout Function
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error.message;
  }
};
