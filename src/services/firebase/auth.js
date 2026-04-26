import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "./config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userId = userCredential.user.uid;
  const userDoc = await getDoc(doc(db, "users", userId));

  if (!userDoc.exists()) {
    await signOut(auth); // Prevent ghost session
    throw new Error("User record not found in database.");
  }

  const userData = userDoc.data();

  // Generate new Session ID for anti-multiple login
  const newSessionId = crypto.randomUUID();
  await setDoc(doc(db, "users", userId), { activeSessionId: newSessionId }, { merge: true });

  return { user: userCredential.user, role: userData.role, sessionId: newSessionId };
};

export const logoutUser = async (userId) => {
  try {
    if (userId) {
      await setDoc(doc(db, "users", userId), { activeSessionId: null }, { merge: true });
    }
  } catch (err) {
    console.warn("Failed to clear session on logout:", err);
  }
  return signOut(auth);
};
