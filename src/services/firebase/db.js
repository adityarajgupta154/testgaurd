import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

export const getUserRole = async (uid) => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().role;
  }
  return null;
};
