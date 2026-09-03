import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { VoiceTransportController } from '../controllers/voice-transport.controller';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';
import { speechConfig } from '../modules/speech/speech.config';

const router = Router();

// Ensure upload directory exists
AudioStorageService.ensureDirectories();

// Configure multer for voice transport turn audio uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, speechConfig.storage.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    const uniqueName = `vturn_upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: speechConfig.stt.maxAudioSizeBytes, // 15 MB limit
  },
});

// 1. Session Lifecycle Endpoints
router.post('/session', VoiceTransportController.createSession);
router.get('/session/:transportSessionId', VoiceTransportController.getSession);
router.delete('/session/:transportSessionId', VoiceTransportController.terminateSession);

// 2. Turn Transport Endpoint
router.post('/turn', upload.single('audio'), VoiceTransportController.processTurn);

export default router;
