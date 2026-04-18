import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This plugin serves face-api model files from their current root-level folders
// at the /models/ URL path — exactly what face-api.js loadFromUri('/models') expects.
// It maps e.g. GET /models/tiny_face_detector_model-shard1
//           → file: ./tiny_face_detector/tiny_face_detector_model-shard1
function faceApiModelsPlugin() {
  // Map from model file prefix → folder name in project root
  const MODEL_FOLDERS = {
    'tiny_face_detector_model': 'tiny_face_detector',
    'face_landmark_68_model': 'face_landmark_68',
    'face_recognition_model': 'face_recognition',
  };

  return {
    name: 'serve-face-api-models',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/models/')) return next();

        const fileName = req.url.replace('/models/', '').split('?')[0];

        // Find which folder this file belongs to
        let folderName = null;
        for (const [prefix, folder] of Object.entries(MODEL_FOLDERS)) {
          if (fileName.startsWith(prefix)) {
            folderName = folder;
            break;
          }
        }

        if (!folderName) return next();

        const filePath = path.join(process.cwd(), folderName, fileName);

        if (fs.existsSync(filePath)) {
          const ext = path.extname(fileName);
          const contentType = ext === '.json' ? 'application/json' : 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          fs.createReadStream(filePath).pipe(res);
        } else {
          console.warn(`[face-api-models] File not found: ${filePath}`);
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), faceApiModelsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
