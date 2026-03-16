import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAkjscvmx4bbOCpOe6Y0U854dtZxnVQgRQ",
  authDomain: "upwork3-1d814.firebaseapp.com",
  projectId: "upwork3-1d814",
  storageBucket: "upwork3-1d814.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "810775964015",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:810775964015:web:159e240f4d848499aae09a"
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export default firebaseApp;
