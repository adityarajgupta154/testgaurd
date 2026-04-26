# ExamGuard

Proctored exam platform built with React + Vite + Firebase + face-api.js.

## Face-API Model Setup

Face detection models must exist at `public/models/` for both dev and production builds:

```
public/models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-shard1
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-shard1
└── face_recognition_model-shard2
```

### How it works

- `setup-models.js` copies model files from root source folders into `public/models/`
- Runs automatically via `npm run dev` (predev hook) and `npm run build`
- Vite serves `public/` as static assets at the root URL
- `faceApi.js` uses `import.meta.env.BASE_URL` to resolve model paths dynamically

### Troubleshooting model loading

1. Ensure all 7 files above exist in `public/models/`
2. In dev, verify: `http://localhost:5173/models/tiny_face_detector_model-weights_manifest.json` returns HTTP 200
3. Check browser console for `[FaceAPI]` log messages — failed URLs are printed explicitly
4. If using a custom `base` in `vite.config.js`, the model path adjusts automatically

## Development

```bash
npm install
npm run dev       # starts dev server (auto-copies models)
npm run build     # production build
npm run preview   # preview production build
```