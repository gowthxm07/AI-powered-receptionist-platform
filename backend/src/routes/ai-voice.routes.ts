import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { AIVoiceController } from '../controllers/ai-voice.controller';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';
import { speechConfig } from '../modules/speech/speech.config';

const router = Router();

// Ensure upload directory exists
AudioStorageService.ensureDirectories();

// Configure multer for audio upload handling
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, speechConfig.storage.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    const uniqueName = `upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: speechConfig.stt.maxAudioSizeBytes, // 15 MB
  },
});

// 1. Status & Runtime Capabilities
router.get('/status', AIVoiceController.getVoiceStatus);

// 2. Safe Audio Retrieval by ID
router.get('/audio/:audioId', AIVoiceController.getAudioById);

// 3. Primary End-to-End Voice Conversation Pipeline Endpoint
router.post(
  '/conversation',
  upload.single('audio'),
  AIVoiceController.processVoiceConversation
);

export default router;
