import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBsHZ6H0Td5AZ3kw_kraFpl0HEFP5GHZdE",
  authDomain: "market-map-1e6e4.firebaseapp.com",
  databaseURL: "https://market-map-1e6e4-default-rtdb.firebaseio.com",
  projectId: "market-map-1e6e4",
  storageBucket: "market-map-1e6e4.firebasestorage.app",
  messagingSenderId: "851268932559",
  appId: "1:851268932559:web:aeb6f4fbb4cc44ed2c78ba",
  measurementId: "G-2J3LTR07JL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Analytics can throw in unsupported environments (SSR, privacy blockers)
let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
});

export { app, analytics, database, storage, auth };