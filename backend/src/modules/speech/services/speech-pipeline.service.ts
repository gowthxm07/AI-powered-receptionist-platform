import {
  VoiceConversationOrchestrator,
  voiceConversationOrchestrator,
} from './voice-orchestrator.service';
import {
  SpeechToTextProvider,
  TextToSpeechProvider,
  SpeechPipelineInput,
  SpeechPipelineResult,
} from '../types/speech.types';
import { AIReceptionistService } from '../../ai/services/ai-receptionist.service';
import { InMemorySessionStore } from '../../ai/conversation/in-memory-session-store';

/**
 * SpeechPipelineService maintains backwards compatibility and delegates
 * directly to the unified VoiceConversationOrchestrator.
 */
export class SpeechPipelineService {
  private orchestrator: VoiceConversationOrchestrator;

  constructor(options?: {
    sttProvider?: SpeechToTextProvider;
    ttsProvider?: TextToSpeechProvider;
    aiService?: AIReceptionistService;
    sessionStore?: InMemorySessionStore;
  }) {
    this.orchestrator = options
      ? new VoiceConversationOrchestrator(options)
      : voiceConversationOrchestrator;
  }

  public async processVoiceTurn(input: SpeechPipelineInput): Promise<SpeechPipelineResult> {
    return this.orchestrator.orchestrateVoiceTurn(input);
  }
}

export const speechPipelineService = new SpeechPipelineService();
