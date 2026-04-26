import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const sessionIdRef = useRef(null);

  // Keep ref in sync with state so the snapshot listener always has latest value
  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Auth state listener — runs once, no dependency on session
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role || null);
            setCurrentSessionId(data.activeSessionId);
            setFaceEnrolled(!!data.faceEnrolled);
          } else {
            // User exists in Auth but not in Firestore — force logout
            await logoutUser(user.uid).catch(() => {});
            setCurrentUser(null);
            setRole(null);
            setCurrentSessionId(null);
            setFaceEnrolled(false);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Error fetching user document:", err);
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
  }, []); // No dependency on currentSessionId — prevents double-fire

  // Multi-session detection listener
  useEffect(() => {
    if (!currentUser || !currentSessionId) return;

    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const dbSessionId = data.activeSessionId;
        // Use ref for latest session ID to avoid stale closure
        if (dbSessionId && dbSessionId !== sessionIdRef.current) {
          console.warn("Multiple logins detected. Logging out.");
          alert('You have been logged out because another session was started.');
          logoutUser(currentUser.uid);
        }
        // Keep faceEnrolled in sync in real-time
        setFaceEnrolled(!!data.faceEnrolled);
      }
    });
    return unsub;
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
