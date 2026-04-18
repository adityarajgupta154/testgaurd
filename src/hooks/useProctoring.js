import { useEffect, useRef, useState, useCallback } from 'react';
import { storage, db } from '../services/firebase/config';
import { ref, uploadString } from 'firebase/storage';
import { doc, arrayUnion, updateDoc, getDoc } from 'firebase/firestore';
import { loadModels, detectFaces, compareEmbeddings } from '../services/ai/faceApi';

export const useProctoring = (testId, userId, onViolationLimit) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [violations, setViolations] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [baselineEmbedding, setBaselineEmbedding] = useState(null);
  const violationCountRef = useRef(0);

  // Fetch baseline embedding
  useEffect(() => {
    const fetchBaseline = async () => {
      if (userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists() && userDoc.data().faceEmbedding) {
          setBaselineEmbedding(userDoc.data().faceEmbedding);
        }
      }
    };
    fetchBaseline();
  }, [userId]);

  const recordViolation = useCallback(async (reason) => {
    violationCountRef.current += 1;
    setViolations(violationCountRef.current);
    
    if (violationCountRef.current >= 6 && onViolationLimit) {
       // slightly relax strict auto-submit to 6 to handle momentary misses
       onViolationLimit(); 
    }
    
    try {
      const attemptRef = doc(db, 'attempts', `${userId}_${testId}`);
      await updateDoc(attemptRef, {
        violations: arrayUnion({ timestamp: new Date().toISOString(), reason })
      });
    } catch (err) {
      console.error("Failed to log violation", err);
    }
  }, [testId, userId, onViolationLimit]);

  const startProctoring = async () => {
    try {
      await loadModels(); // Preload face models
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setPermissionDenied(false);
    } catch (err) {
      console.error("Proctoring Start Error:", err);
      setPermissionDenied(true);
      recordViolation("Camera/Mic Permission Denied");
    }
  };

  const stopProctoring = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureSnapshot = async () => {
    if (!videoRef.current || !stream) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

    try {
      const snapshotRef = ref(storage, `snapshots/${testId}/${userId}/${Date.now()}.jpg`);
      await uploadString(snapshotRef, dataUrl, 'data_url');
    } catch (err) {}
  };

  // Face Detection Loop
  useEffect(() => {
    if (!stream || !videoRef.current) return;

    const detectInterval = setInterval(async () => {
      if (videoRef.current && stream.active) {
        try {
          const detections = await detectFaces(videoRef.current);
          if (detections.length === 0) {
            recordViolation("NO_FACE");
          } else if (detections.length > 1) {
            recordViolation("MULTIPLE_FACE");
            captureSnapshot(); // Take snapshot as proof
          } else {
            // Single face detected, check identity
            if (baselineEmbedding) {
              const currentDesc = Array.from(detections[0].descriptor);
              const distance = compareEmbeddings(baselineEmbedding, currentDesc);
              if (distance > 0.55) { // 0.5-0.6 is common threshold
                recordViolation("IDENTITY_MISMATCH");
                captureSnapshot();
              }
            }
          }
        } catch (e) {
            console.error("Face API detection err", e);
        }
      }
    }, 2500); // Check every 2.5s for performance

    return () => clearInterval(detectInterval);
  }, [stream, baselineEmbedding, recordViolation]);

  useEffect(() => {
    const snapshotInterval = setInterval(() => {
      captureSnapshot();
    }, 30000); // 30s standard snapshot fallback

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
         recordViolation("Tab Switched");
      }
    };

    const handleCopyPaste = (e) => { e.preventDefault(); };
    const handleContextMenu = (e) => { e.preventDefault(); };
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(snapshotInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [testId, userId, stream, recordViolation]);

  return { videoRef, startProctoring, stopProctoring, violations, stream, permissionDenied };
};
