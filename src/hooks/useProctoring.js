import { useEffect, useRef, useState, useCallback } from 'react';
import { storage, db } from '../services/firebase/config';
import { ref, uploadString } from 'firebase/storage';
import { doc, arrayUnion, setDoc, getDoc } from 'firebase/firestore';
import { loadModels, detectFaces, compareEmbeddings } from '../services/ai/faceApi';

const MAX_VIOLATIONS = 3;

export const useProctoring = (testId, userId, onViolationLimit) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [violations, setViolations] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [baselineEmbedding, setBaselineEmbedding] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const violationCountRef = useRef(0);
  const warningTimeoutRef = useRef(null);
  
  const [ignoreDetection, setIgnoreDetection] = useState(false);
  const isInternalNavigationRef = useRef(false);

  const setInternalNavigation = useCallback((value) => {
    isInternalNavigationRef.current = value;
    if (value) {
      setIgnoreDetection(true);
      setTimeout(() => {
        setIgnoreDetection(false);
        isInternalNavigationRef.current = false;
      }, 2000);
    }
  }, []);

  // Fetch baseline embedding and existing violations
  useEffect(() => {
    const fetchInitialData = async () => {
      if (userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists() && userDoc.data().faceEmbedding) {
            setBaselineEmbedding(userDoc.data().faceEmbedding);
          }
          
          if (testId) {
            const attemptDoc = await getDoc(doc(db, 'attempts', `${userId}_${testId}`));
            if (attemptDoc.exists()) {
              const data = attemptDoc.data();
              if (typeof data.violations === 'number') {
                violationCountRef.current = data.violations;
                setViolations(data.violations);
              } else if (Array.isArray(data.violations)) {
                violationCountRef.current = data.violations.length;
                setViolations(data.violations.length);
              }
            }
          }
        } catch (err) {
          console.error("[Proctoring] Failed to fetch initial data:", err);
        }
      }
    };
    fetchInitialData();
  }, [userId, testId]);

  const recordViolation = useCallback(async (reason) => {
    if (ignoreDetection || isInternalNavigationRef.current) return;
    
    violationCountRef.current += 1;
    setViolations(violationCountRef.current);

    if (reason === "NO_FACE" || reason === "EXIT_FULLSCREEN" || reason === "Tab Switched") {
      setWarningMessage(reason === "NO_FACE" ? "Face not detected. Please stay in frame" : `Violation: ${reason}`);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = setTimeout(() => {
        setWarningMessage(null);
      }, 4000);
    }

    if (violationCountRef.current >= MAX_VIOLATIONS && onViolationLimit) {
      onViolationLimit();
    }

    try {
      // Use setDoc with merge to avoid errors if document doesn't exist yet
      const attemptRef = doc(db, 'attempts', `${userId}_${testId}`);
      await setDoc(attemptRef, {
        violations: violationCountRef.current,
        logs: arrayUnion({ timestamp: new Date().toISOString(), reason })
      }, { merge: true });
    } catch (err) {
      console.error("[Proctoring] Failed to log violation:", err);
    }
  }, [testId, userId, onViolationLimit]);

  const startProctoring = async () => {
    try {
      await loadModels(); // Preload face models
      // Only request video — audio is not needed for proctoring
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setPermissionDenied(false);
    } catch (err) {
      console.error("[Proctoring] Start Error:", err);
      setPermissionDenied(true);
      // Don't record violation here — the attempt doc may not exist yet
    }
  };

  const stopProctoring = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, [stream]);

  const captureSnapshot = useCallback(async () => {
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
    } catch (err) {
      console.warn("[Proctoring] Snapshot upload failed:", err);
    }
  }, [stream, testId, userId]);

  const [isPaused, setIsPaused] = useState(false);
  const noFaceTimestampRef = useRef(null);

  // Face Detection Loop
  useEffect(() => {
    if (!stream || !videoRef.current) return;

    const detectInterval = setInterval(async () => {
      if (ignoreDetection || isInternalNavigationRef.current) return;
      if (videoRef.current && stream.active) {
        try {
          const detections = await detectFaces(videoRef.current);
          if (!detections || detections.length === 0) {
            // No face detected
            if (!noFaceTimestampRef.current) {
              noFaceTimestampRef.current = Date.now();
            } else {
              const timeWithoutFace = Date.now() - noFaceTimestampRef.current;
              if (timeWithoutFace >= 60000 && !isPaused) {
                setIsPaused(true);
                try {
                  const msg = new SpeechSynthesisUtterance("Please put your face into the frame");
                  window.speechSynthesis.speak(msg);
                } catch(e) {}
              }
            }
            // Temporarily show warning but don't record a hard violation that increments the strike counter immediately
            setWarningMessage("Face not detected. Please stay in frame");
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            warningTimeoutRef.current = setTimeout(() => {
              setWarningMessage(null);
            }, 4000);

          } else {
            // Face is present
            if (isPaused) {
              setIsPaused(false);
            }
            noFaceTimestampRef.current = null;

            if (detections.length > 1) {
              recordViolation("MULTIPLE_FACES");
              captureSnapshot();
            } else {
              // Single face detected, check identity
              const detection = detections[0];
              if (baselineEmbedding) {
                const currentDesc = Array.from(detection.descriptor);
                const distance = compareEmbeddings(baselineEmbedding, currentDesc);
                if (distance > 0.55) {
                  recordViolation("IDENTITY_MISMATCH");
                  captureSnapshot();
                }
              }
            }
          }
        } catch (e) {
          console.error("[Proctoring] Face detection error:", e);
        }
      }
    }, 1500);

    return () => clearInterval(detectInterval);
  }, [stream, baselineEmbedding, recordViolation, captureSnapshot, isPaused]);

  useEffect(() => {
    const snapshotInterval = setInterval(() => {
      captureSnapshot();
    }, 30000);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("Tab Switched");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isMobile) {
        recordViolation("EXIT_FULLSCREEN");
      }
    };

    const handleCopyPaste = (e) => { e.preventDefault(); };
    const handleContextMenu = (e) => { e.preventDefault(); };
    const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste); // Also prevent cut
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(snapshotInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [testId, userId, stream, recordViolation, captureSnapshot]);

  return { videoRef, startProctoring, stopProctoring, violations, stream, permissionDenied, warningMessage, maxViolations: MAX_VIOLATIONS, isPaused, setInternalNavigation };
};
