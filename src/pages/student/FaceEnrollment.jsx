import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loadModels, getFaceEmbedding } from '../../services/ai/faceApi';
import { db, storage } from '../../services/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
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
      setError('Failed to load Face AI models. Check that model files exist in public/models/.');
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
  useEffect(() => {
    if (!modelsReady || !streamRef.current) return;
    let active = true;
    const checkFace = async () => {
      while (active && videoRef.current && streamRef.current?.active) {
        try {
          const embedding = await getFaceEmbedding(videoRef.current);
          if (active) setFaceDetected(!!embedding);
        } catch (e) { /* ignore */ }
        await new Promise(r => setTimeout(r, 1500));
      }
    };
    checkFace();
    return () => { active = false; };
  }, [modelsReady]);

  const captureCanvasImage = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7); // compressed JPEG
  };

  const handleCapture = async () => {
    setCapturing(true);
    setError('');

    try {
      // 1. Get face embedding for identity verification during exams
      const embedding = await getFaceEmbedding(videoRef.current);
      if (!embedding) {
        throw new Error('No face detected. Please face the camera clearly and try again.');
      }

      // 2. Capture face image from canvas
      const imageDataUrl = captureCanvasImage();
      if (!imageDataUrl) {
        throw new Error('Failed to capture image from camera.');
      }

      // 3. Upload to Firebase Storage
      console.log('[FaceEnroll] Uploading face image...');
      const storageRef = ref(storage, `faces/${currentUser.uid}.jpg`);
      await uploadString(storageRef, imageDataUrl, 'data_url');
      const faceImageUrl = await getDownloadURL(storageRef);
      console.log('[FaceEnroll] ✅ Image uploaded:', faceImageUrl);

      // 4. Update Firestore user document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        faceEnrolled: true,
        faceImageUrl: faceImageUrl,
        faceEmbedding: embedding,
        faceEnrolledAt: Date.now()
      });
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
      console.error('[FaceEnroll] Error:', err);
      setError(err.message || 'Failed to capture face data.');
    }

    setCapturing(false);
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
                    Capturing & Uploading...
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
