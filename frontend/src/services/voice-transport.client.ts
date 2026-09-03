import {
  VoiceTransportSession,
  VoiceTurnResult,
  CreateVoiceSessionInput,
  VoiceClientChannel,
} from '../types/voice';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class VoiceTransportClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Create a new voice transport session mapped to the selected business.
   */
  public async createSession(input: CreateVoiceSessionInput): Promise<VoiceTransportSession> {
    const url = `${this.baseUrl}/api/ai/voice/transport/session`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        businessId: input.businessId,
        customerId: input.customerId,
        channel: input.channel || 'MOBILE_WEB',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.message || `Failed to create voice session (${response.status})`);
    }

    return data.data;
  }

  /**
   * Inspect the current status and metadata of an active voice transport session.
   */
  public async getSession(transportSessionId: string): Promise<VoiceTransportSession> {
    const url = `${this.baseUrl}/api/ai/voice/transport/session/${encodeURIComponent(transportSessionId)}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.message || `Failed to retrieve voice session (${response.status})`);
    }

    return data.data;
  }

  /**
   * Terminate and clean up an active voice transport session.
   */
  public async terminateSession(transportSessionId: string): Promise<void> {
    const url = `${this.baseUrl}/api/ai/voice/transport/session/${encodeURIComponent(transportSessionId)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok && response.status !== 404) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || data.message || `Failed to terminate voice session (${response.status})`);
    }
  }

  /**
   * Submit a recorded spoken audio turn Blob to the backend voice transport pipeline.
   */
  public async submitAudioTurn(params: {
    transportSessionId?: string;
    businessId: string;
    customerId?: string;
    audioBlob: Blob;
    channel?: VoiceClientChannel;
  }): Promise<VoiceTurnResult> {
    const { transportSessionId, businessId, customerId, audioBlob, channel = 'MOBILE_WEB' } = params;

    const formData = new FormData();
    const extension = audioBlob.type.includes('wav') ? 'wav' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
    formData.append('audio', audioBlob, `turn_${Date.now()}.${extension}`);
    formData.append('businessId', businessId);
    if (transportSessionId) formData.append('transportSessionId', transportSessionId);
    if (customerId) formData.append('customerId', customerId);
    formData.append('channel', channel);

    const url = `${this.baseUrl}/api/ai/voice/transport/turn`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.message || `Failed to process audio turn (${response.status})`);
    }

    return data.data || data;
  }

  /**
   * Generate an absolute audio playback URL for a synthesized audio response.
   */
  public getAudioStreamUrl(audioId: string): string {
    return `${this.baseUrl}/api/ai/voice/audio/${encodeURIComponent(audioId)}`;
  }
}

export const voiceTransportClient = new VoiceTransportClient();
