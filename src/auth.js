import { auth, db } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

//register new user and, save profile and send verification email
export async function registerUser(email, password, displayName) {
  // 1) create account with email & password
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  //set the display name on the Firebase user
  await updateProfile(user, { displayName });

  //save a user document in Firestore
  await setDoc(doc(db, "users", user.uid), {
    email,
    displayName,
    createdAt: Date.now(),
  });

  //sending verification email
  await sendEmailVerification(user);

  return user;
}

//login
export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

//forgot pass
export function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}
