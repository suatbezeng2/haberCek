// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPG_P_Ixjn5d_9iOWcp9CUfDhgng5rbLE",
  authDomain: "habericek-f8f1d.firebaseapp.com",
  projectId: "habericek-f8f1d",
  storageBucket: "habericek-f8f1d.firebasestorage.app",
  messagingSenderId: "127602055093",
  appId: "1:127602055093:web:919216474cb7bda2212bfc",
  measurementId: "G-R5YV8FBM93"
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // If already initialized, get the existing app
}

let analyticsInstance: Analytics | undefined = undefined;

// Initialize Analytics only on the client side and if supported
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
      // console.log("Firebase Analytics initialized");
    } else {
      // console.log("Firebase Analytics is not supported in this environment.");
    }
  }).catch((err) => {
    console.error("Error checking Firebase Analytics support:", err);
  });
}

export { app, analyticsInstance as analytics, firebaseConfig };
