import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const modelsDir = path.join(publicDir, 'models');

// Required face-api.js model directories to look for in the root folder
const TARGET_MODELS = [
  'tiny_face_detector',
  'face_landmark_68',
  'face_recognition',
  'face_expression',
  'mtcnn',
  'ssd_mobilenetv1'
];

try {
  console.log('🔍 Checking Vite public/models structure...');

  // Create public/models if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
    console.log('✅ Created /public folder');
  }
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir);
    console.log('✅ Created /public/models folder');
  }

  // Move the scattered models from root into public/models
  let movedCount = 0;
  for (const modelName of TARGET_MODELS) {
    const rootModelPath = path.join(rootDir, modelName);
    const destModelPath = path.join(modelsDir, modelName);

    if (fs.existsSync(rootModelPath)) {
       // It exists in root, need to move/rename it to public/models
       
       // Face API expects the files to be directly inside /models or we point it correctly.
       // Usually we just drop the raw .json and .weights directly in /models, or keep folder structure if the URI targets them.
       // @vladmandic/face-api loads files based on name from the URI folder. Meaning if we specify URI='/models', it expects:
       // /models/tiny_face_detector_model-weights_manifest.json 
       // Directly in the folder! Let's just copy all files within these directories directly into /public/models !

       const files = fs.readdirSync(rootModelPath);
       for (const file of files) {
          const srcFile = path.join(rootModelPath, file);
          const destFile = path.join(modelsDir, file);
          fs.renameSync(srcFile, destFile);
          movedCount++;
       }
       // Optional: Remove empty old directory
       try { fs.rmdirSync(rootModelPath); } catch (e) {}
    }
  }

  // Also check if they are already in the root but not in folders
  const rootFiles = fs.readdirSync(rootDir);
  for (const file of rootFiles) {
     if (file.endsWith('.json') && file.includes('model-weights_manifest')) {
         fs.renameSync(path.join(rootDir, file), path.join(modelsDir, file));
         movedCount++;
     }
     if (file.endsWith('.bin') || file.endsWith('.weights')) {
         fs.renameSync(path.join(rootDir, file), path.join(modelsDir, file));
         movedCount++;
     }
  }

  if (movedCount > 0) {
      console.log(`✅ Successfully moved ${movedCount} model files into /public/models/`);
  } else {
      console.log('⚠️ No model files were found in the root directory. Ensure you extracted them directly!');
  }

} catch (error) {
  console.error('❌ Error fixing model paths:', error);
}
