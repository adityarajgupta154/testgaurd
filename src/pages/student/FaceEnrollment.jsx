import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loadModels, getFaceEmbedding } from '../../services/ai/faceApi';
import { uploadToCloudinary } from '../../services/cloudinary/upload';
import { db } from '../../services/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, AlertCircle, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const FaceEnrollment = () => {
  const { currentUser, setFaceEnrolled } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      return true;
    } catch (err) {
      console.error('[FaceEnroll] Camera error:', err);
      setError('Camera permission denied. Please allow camera access and reload.');
      return false;
    }
  };

  const initAll = async () => {
    setLoading(true);
    setError('');

    console.log('[FaceEnroll] Loading AI models...');
    const loaded = await loadModels();
    if (!loaded) {
      setError(`Failed to load Face AI models. Attempted URL: ${import.meta.env.BASE_URL}models/. Check that model files exist in public/models/.`);
      setLoading(false);
      return;
    }
    setModelsReady(true);

    console.log('[FaceEnroll] Starting camera...');
    const cameraOk = await startCamera();
    if (!cameraOk) {
      setLoading(false);
      return;
    }

    // Set cameraReady AFTER camera stream is active — this triggers the detection loop
    setCameraReady(true);
    console.log('[FaceEnroll] ✅ Ready');
    setLoading(false);
  };

  useEffect(() => {
    initAll();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuous face detection to enable/disable capture button
  // Uses cameraReady (state) instead of streamRef (ref) as dependency
  // so the effect re-runs when camera becomes available
  useEffect(() => {
    if (!modelsReady || !cameraReady || !streamRef.current) return;

    // Wait for video to actually have valid dimensions before starting detection
    const waitForVideo = () => {
      return new Promise((resolve) => {
        const check = () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
            resolve();
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      });
    };

    let intervalId = null;
    let cancelled = false;

    (async () => {
      await waitForVideo();
      if (cancelled) return;

      console.log('[FaceEnroll] Video ready, starting face detection loop',
        videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);

      intervalId = setInterval(async () => {
        if (!videoRef.current || !streamRef.current?.active || cancelled) return;
        try {
          const embedding = await getFaceEmbedding(videoRef.current);
          if (!cancelled) setFaceDetected(!!embedding);
        } catch (e) {
          console.warn('[FaceEnroll] Detection error:', e);
        }
      }, 800); // Check every 800ms for reliable detection
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [modelsReady, cameraReady]);

  const captureCanvasImage = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // compressed JPEG
    console.log('[FaceEnroll] Canvas image captured, length:', dataUrl.length);
    return dataUrl;
  };

  const handleCapture = async () => {
    console.log('[FaceEnroll] Capture clicked');
    setCapturing(true);
    setError('');

    try {
      // 1. Get face embedding for identity verification during exams
      console.log('[FaceEnroll] Step 1: Getting face embedding...');
      const embedding = await getFaceEmbedding(videoRef.current);
      if (!embedding) {
        throw new Error('No face detected. Please face the camera clearly and try again.');
      }
      console.log('[FaceEnroll] ✅ Embedding captured, length:', embedding.length);

      // 2. Capture face image from canvas
      console.log('[FaceEnroll] Step 2: Capturing canvas image...');
      const imageDataUrl = captureCanvasImage();
      if (!imageDataUrl) {
        throw new Error('Failed to capture image from camera.');
      }

      // 3. Upload to Cloudinary (unsigned upload — no API secret needed)
      console.log('[FaceEnroll] Step 3: Uploading to Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary(
        imageDataUrl,
        `examguard_face_${currentUser.uid}_${Date.now()}`
      );
      const faceImageUrl = cloudinaryResult.secure_url;
      console.log('[FaceEnroll] ✅ Cloudinary URL:', faceImageUrl);

      // 4. Update Firestore user document
      console.log('[FaceEnroll] Step 4: Saving to Firestore...');
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', currentUser.uid), {
        faceEnrolled: true,
        faceImage: faceImageUrl,         // Cloudinary secure_url
        faceImageUrl: faceImageUrl,      // Keep backward compat
        faceEmbedding: embedding,
        faceEnrolledAt: Date.now()
      }, { merge: true });
      console.log('[FaceEnroll] ✅ Firestore updated');

      // 5. Update local auth state
      setFaceEnrolled(true);
      setSuccess(true);

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setTimeout(() => {
        navigate('/student', { replace: true });
      }, 2500);
    } catch (err) {
      console.error('[FaceEnroll] ❌ Error:', err);
      setError(err.message || 'Failed to capture face data.');
    } finally {
      // ALWAYS reset capturing state — prevents stuck loading
      setCapturing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-5 text-white">
          <div className="flex items-center">
            <ShieldCheck className="w-7 h-7 mr-3" />
            <div>
              <h2 className="text-xl font-bold">Face Enrollment</h2>
              <p className="text-blue-100 text-xs mt-0.5">Required for proctored exams</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <p className="text-gray-600 text-sm mb-6 text-center">
            Align your face in the camera below. This image will be used for identity verification during exams.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start text-sm border border-red-100">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                {!modelsReady && (
                  <button
                    onClick={initAll}
                    className="mt-3 flex items-center text-red-800 font-semibold hover:underline text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry Loading Models
                  </button>
                )}
              </div>
            </div>
          )}

          {success ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                <CheckCircle className="w-20 h-20 text-green-500" />
              </motion.div>
              <p className="text-xl font-bold text-green-700">Face Enrollment Complete!</p>
              <p className="text-sm text-gray-500">Your identity has been securely recorded.</p>
              <p className="text-xs text-gray-400 animate-pulse">Redirecting to Dashboard...</p>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Camera Preview */}
              <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden mb-4 shadow-inner flex items-center justify-center border-2 border-gray-200">
                {loading && (
                  <div className="absolute z-10 text-white animate-pulse text-sm flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Setting up camera & AI...
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                {/* Face alignment guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-40 h-48 border-2 border-dashed rounded-full transition-colors duration-300 ${faceDetected ? 'border-green-400' : 'border-white/50'}`}></div>
                </div>
                {/* Face detection indicator */}
                {modelsReady && !loading && (
                  <div className={`absolute bottom-2 left-2 flex items-center text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md ${faceDetected ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                    <div className={`w-2 h-2 rounded-full mr-1.5 ${faceDetected ? 'bg-green-200' : 'bg-red-200 animate-pulse'}`}></div>
                    {faceDetected ? 'Face Detected' : 'No Face'}
                  </div>
                )}
              </div>

              {/* Capture Button */}
              <button
                onClick={handleCapture}
                disabled={loading || capturing || !modelsReady || !faceDetected}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex flex-row items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-[0.98]"
              >
                {capturing ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Uploading to Cloud...
                  </div>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    {faceDetected ? 'Capture Face Baseline' : 'Waiting for face...'}
                  </>
                )}
              </button>

              {!faceDetected && modelsReady && !loading && (
                <p className="text-xs text-amber-600 mt-3 text-center font-medium">
                  Position your face inside the oval guide above
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FaceEnrollment;
