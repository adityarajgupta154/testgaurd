import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';

let modelsLoaded = false;
let modelsLoading = null; // Prevent duplicate concurrent loads

export const loadModels = async () => {
  if (modelsLoaded) return true;

  // If already loading, wait for the same promise (prevents double-load on re-render)
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    try {
      console.log('[FaceAPI] Loading tiny_face_detector...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('[FaceAPI] ✅ tiny_face_detector loaded');

      console.log('[FaceAPI] Loading face_landmark_68...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log('[FaceAPI] ✅ face_landmark_68 loaded');

      console.log('[FaceAPI] Loading face_recognition...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log('[FaceAPI] ✅ face_recognition loaded');

      modelsLoaded = true;
      console.log('[FaceAPI] ✅ All models loaded successfully');
      return true;
    } catch (error) {
      console.error('[FaceAPI] ❌ MODEL LOAD ERROR:', error);
      console.error('[FaceAPI] Check: http://localhost:5174/models/tiny_face_detector_model-weights_manifest.json');
      console.error('[FaceAPI] Models must be in /public/models/ (flat, no subfolders)');
      modelsLoading = null; // Allow retry
      return false;
    }
  })();

  return modelsLoading;
};

export const getFaceEmbedding = async (videoElement) => {
  if (!modelsLoaded) {
    const ok = await loadModels();
    if (!ok) return null;
  }
  try {
    const detection = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
                                    .withFaceLandmarks()
                                    .withFaceDescriptor();
    return detection ? Array.from(detection.descriptor) : null;
  } catch (error) {
    console.error('[FaceAPI] Error getting face embedding:', error);
    return null;
  }
};

export const detectFaces = async (videoElement) => {
  if (!modelsLoaded) {
    const ok = await loadModels();
    if (!ok) return [];
  }
  try {
    const detections = await faceapi.detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks()
                                     .withFaceDescriptors();
    return detections;
  } catch (error) {
    console.error('[FaceAPI] Error detecting faces:', error);
    return [];
  }
};

export const compareEmbeddings = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return 1.0;
  return faceapi.euclideanDistance(new Float32Array(descriptor1), new Float32Array(descriptor2));
};
