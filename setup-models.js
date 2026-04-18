/**
 * Pre-build script: Copies face-api model files into public/models/
 * so they are included in the Vite production build and deployed to Vercel.
 * 
 * Run: node setup-models.js
 * Also runs automatically via: npm run build
 */
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const modelsDir = path.join(rootDir, 'public', 'models');

const MODEL_SOURCES = {
  'tiny_face_detector': path.join(rootDir, 'tiny_face_detector'),
  'face_landmark_68': path.join(rootDir, 'face_landmark_68'),
  'face_recognition': path.join(rootDir, 'face_recognition'),
};

// Create public/models if needed
if (!fs.existsSync(path.join(rootDir, 'public'))) {
  fs.mkdirSync(path.join(rootDir, 'public'));
}
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir);
}

let copied = 0;
for (const [name, srcDir] of Object.entries(MODEL_SOURCES)) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`⚠️  Source folder not found: ${name}/ — skipping`);
    continue;
  }
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(modelsDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
      console.log(`  ✅ ${file}`);
    }
  }
}

if (copied > 0) {
  console.log(`\n✅ Copied ${copied} model files to public/models/`);
} else {
  console.log('\n✅ All model files already in public/models/');
}
