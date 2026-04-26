import * as faceapi from '@vladmandic/face-api';

// ────────────────────────────────────────────────────────────
// Model URL – uses Vite's BASE_URL so it works in:
//   • dev  (base = '/')
//   • build/preview (base = '/' or '/subpath/')
//   • any deployment (Vercel, Firebase, etc.)
// ────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL || '/';
const MODEL_URL = `${BASE.endsWith('/') ? BASE : BASE + '/'}models`;

// Model manifest filenames used for health-check pre-fetching
const MODEL_MANIFESTS = [
  'tiny_face_detector_model-weights_manifest.json',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-weights_manifest.json',
];

// Tuned options for reliable webcam detection
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,       // 224 is optimal for webcam (valid: 128/160/224/320/416/512/608)
  scoreThreshold: 0.3   // Lower threshold catches more faces; 0.5 default misses many
});

let modelsLoaded = false;
let modelsLoading = null;

/**
 * Health-check: verify that all manifest files are reachable via HTTP 200
 * before handing off to face-api (which swallows network errors).
 */
const verifyModelFiles = async () => {
  const results = await Promise.all(
    MODEL_MANIFESTS.map(async (file) => {
      const url = `${MODEL_URL}/${file}`;
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        return { url, ok: res.ok, status: res.status };
      } catch (err) {
        return { url, ok: false, status: 0, error: err.message };
      }
    })
  );

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    const detail = failures
      .map((f) => `  ✗ ${f.url} → ${f.status || 'NETWORK_ERROR'} ${f.error || ''}`)
      .join('\n');
    throw new Error(
      `Face-API model files unreachable:\n${detail}\n\n` +
      `Expected model files in public/models/ served at ${MODEL_URL}/`
    );
  }
  console.log('[FaceAPI] ✅ Health-check passed – all manifests reachable');
};

export const loadModels = async () => {
  if (modelsLoaded) return true;
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    try {
      console.log('[FaceAPI] Loading models from', MODEL_URL);

      // Step 1 – health-check (fast HEAD requests)
      await verifyModelFiles();

      // Step 2 – actually load into face-api runtime
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      modelsLoaded = true;
      console.log('[FaceAPI] ✅ All models loaded successfully');
      return true;
    } catch (error) {
      console.error('[FaceAPI] ❌ Model load failed:', error);
      console.error('[FaceAPI] Attempted MODEL_URL:', MODEL_URL);
      console.error('[FaceAPI] BASE_URL:', import.meta.env.BASE_URL);
      modelsLoading = null;
      return false;
    }
  })();

  return modelsLoading;
};

/**
 * Check if a video element is actually ready for detection
 * (has valid dimensions and is playing)
 */
const isVideoReady = (videoElement) => {
  return (
    videoElement &&
    videoElement.readyState >= 2 &&   // HAVE_CURRENT_DATA or higher
    videoElement.videoWidth > 0 &&
    videoElement.videoHeight > 0
  );
};

export const getFaceEmbedding = async (videoElement) => {
  if (!modelsLoaded) {
    const ok = await loadModels();
    if (!ok) return null;
  }
  if (!isVideoReady(videoElement)) {
    console.warn('[FaceAPI] Video not ready yet, skipping detection');
    return null;
  }
  try {
    const detection = await faceapi
      .detectSingleFace(videoElement, DETECTOR_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (detection) {
      console.log('[FaceAPI] ✅ Face detected, score:', detection.detection.score.toFixed(3));
    }
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
  if (!isVideoReady(videoElement)) {
    return [];
  }
  try {
    const detections = await faceapi
      .detectAllFaces(videoElement, DETECTOR_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptors();
    return detections;
  } catch (error) {
    console.error('[FaceAPI] Error detecting faces:', error);
    return [];
  }
};

export const detectSingleFaceCustom = async (videoElement) => {
  if (!modelsLoaded) {
    const ok = await loadModels();
    if (!ok) return null;
  }
  if (!isVideoReady(videoElement)) {
    return null;
  }
  try {
    const detection = await faceapi
      .detectSingleFace(videoElement, DETECTOR_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection;
  } catch (error) {
    console.error('[FaceAPI] Error detecting single face:', error);
    return null;
  }
};

export const compareEmbeddings = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return 1.0;
  return faceapi.euclideanDistance(new Float32Array(descriptor1), new Float32Array(descriptor2));
};
