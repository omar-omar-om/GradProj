// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUZwySdJn8PRxX-dWj_O7pp0K11ZVKyEU",
  authDomain: "graduation-project-ddfad.firebaseapp.com",
  projectId: "graduation-project-ddfad",
  storageBucket: "graduation-project-ddfad.appspot.com",
  messagingSenderId: "437068771023",
  appId: "1:437068771023:web:f9f2dd2945782a467151ba",
  measurementId: "G-82N5S262Q2"
};

let app;
let auth;
let db;
let storage;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized successfully");

  // Initialize Authentication
  auth = getAuth(app);
  console.log("Firebase auth initialized successfully");

  // Initialize Firestore
  db = getFirestore(app);
  console.log("Firebase Firestore initialized successfully");

  // Initialize Storage
  storage = getStorage(app);
  console.log("Firebase Storage initialized successfully");

  // Connect to emulators if in development
  if (process.env.NODE_ENV === 'development') {
    // Uncomment these lines if you're using Firebase emulators
    // connectAuthEmulator(auth, "http://localhost:9099");
    // connectFirestoreEmulator(db, 'localhost', 8080);
    // connectStorageEmulator(storage, "localhost", 9199);
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw error;
}

// Verify initialization
if (!app || !auth || !db || !storage) {
  throw new Error("Firebase services not initialized properly");
}

export { app, auth, db, storage };
