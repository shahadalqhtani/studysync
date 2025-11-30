// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBz0ZWZPyrwVpwyH-a_9ntR2fH2kic8F8I",
  authDomain: "cloudcomputingproject-20994.firebaseapp.com",
  projectId: "cloudcomputingproject-20994",
  storageBucket: "cloudcomputingproject-20994.firebasestorage.app",
  messagingSenderId: "977355856794",
  appId: "1:977355856794:web:527796178c1c0d0e59f823",
  measurementId: "G-5Q6YHG4K8K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


//setting up auth firestore
const auth = getAuth(app);
const db = getFirestore(app);

//exporting what the app needs
export { app, analytics, auth, db };