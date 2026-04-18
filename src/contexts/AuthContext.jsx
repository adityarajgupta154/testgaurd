import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { logoutUser } from '../services/firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [faceEnrolled, setFaceEnrolled] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!currentSessionId) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setRole(data.role || null);
                setCurrentSessionId(data.activeSessionId); 
                setFaceEnrolled(!!data.faceEnrolled);
            } else {
                logoutUser(user.uid);
            }
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setRole(null);
        setCurrentSessionId(null);
        setFaceEnrolled(false);
      }
      setLoading(false);
    });
    return unsubscribeAuth;
  }, [currentSessionId]);

  useEffect(() => {
    if (currentUser && currentSessionId) {
      const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const dbSessionId = data.activeSessionId;
          if (dbSessionId && dbSessionId !== currentSessionId) {
            console.warn("Multiple logins detected. Logging out.");
            alert('You have been logged out because another session was started.');
            logoutUser(currentUser.uid);
          }
          // Keep faceEnrolled in sync in real-time
          setFaceEnrolled(!!data.faceEnrolled);
        }
      });
      return unsub;
    }
  }, [currentUser, currentSessionId]);

  const value = {
    currentUser,
    role,
    loading,
    setCurrentSessionId,
    setRole,
    faceEnrolled,
    setFaceEnrolled
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
