import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { speechConfig } from '../speech.config';

export class AudioStorageService {
  /**
   * Ensure runtime directories for audio output and uploads exist.
   */
  public static ensureDirectories(): void {
    if (!fs.existsSync(speechConfig.storage.outputDir)) {
      fs.mkdirSync(speechConfig.storage.outputDir, { recursive: true });
    }
    if (!fs.existsSync(speechConfig.storage.uploadDir)) {
      fs.mkdirSync(speechConfig.storage.uploadDir, { recursive: true });
    }
  }

  /**
   * Generate a unique, safe audio filename and target path for synthesized TTS responses.
   */
  public static createAudioPath(prefix: string = 'tts'): { audioId: string; fileName: string; fullPath: string } {
    this.ensureDirectories();
    const audioId = `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const fileName = `${audioId}.wav`;
    const fullPath = path.resolve(speechConfig.storage.outputDir, fileName);
    return { audioId, fileName, fullPath };
  }

  /**
   * Safely resolve an audioId to its physical filesystem path with strict path traversal defense.
   */
  public static getAudioPathById(audioId: string): { exists: boolean; fullPath?: string; error?: string } {
    this.ensureDirectories();

    // 1. Strict validation of audioId structure (only alphanumeric, underscores, hyphens)
    if (!audioId || !/^[a-zA-Z0-9_-]+$/.test(audioId)) {
      return { exists: false, error: 'Invalid audio ID format.' };
    }

    const fileName = audioId.endsWith('.wav') ? audioId : `${audioId}.wav`;
    const resolvedPath = path.resolve(speechConfig.storage.outputDir, fileName);

    // 2. Strict path traversal containment check
    const normalizedOutputDir = path.normalize(speechConfig.storage.outputDir);
    const normalizedResolved = path.normalize(resolvedPath);

    if (!normalizedResolved.startsWith(normalizedOutputDir)) {
      return { exists: false, error: 'Access denied: Directory traversal detected.' };
    }

    if (!fs.existsSync(resolvedPath)) {
      return { exists: false, error: 'Audio file not found on server.' };
    }

    return { exists: true, fullPath: resolvedPath };
  }

  /**
   * Purge expired temporary audio files older than the configured TTL.
   */
  public static cleanupStaleAudio(maxAgeMs: number = speechConfig.storage.ttlMs): number {
    this.ensureDirectories();
    let cleanedCount = 0;
    const now = Date.now();

    try {
      const files = fs.readdirSync(speechConfig.storage.outputDir);
      for (const file of files) {
        const filePath = path.resolve(speechConfig.storage.outputDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
            cleanedCount++;
          }
        } catch {}
      }
    } catch {}

    return cleanedCount;
  }
}
