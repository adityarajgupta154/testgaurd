import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "./config";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const loginUser = async (email, password) => {
  try {
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
    await updateDoc(doc(db, "users", userId), { activeSessionId: newSessionId });
    
    return { user: userCredential.user, role: userData.role, sessionId: newSessionId };
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async (userId) => {
  if (userId) {
    await updateDoc(doc(db, "users", userId), { activeSessionId: null }).catch(console.error);
  }
  return signOut(auth);
};
