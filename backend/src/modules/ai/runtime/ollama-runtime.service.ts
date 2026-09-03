import { config } from '../../../config/environment';

export interface OllamaAvailabilityStatus {
  available: boolean;
  modelAvailable: boolean;
  configuredModel: string;
  availableModels: string[];
  version?: string;
  error?: string;
}

export class OllamaRuntimeService {
  /**
   * Probes the local Ollama HTTP service to determine reachability and model availability.
   * Uses native fetch and timeout guards. Safe for health and diagnostics.
   */
  public static async checkOllamaAvailability(
    baseUrl: string = config.ollamaBaseUrl,
    targetModel: string = config.ollamaModel,
    timeoutMs: number = 3000
  ): Promise<OllamaAvailabilityStatus> {
    try {
      // 1. Probe Ollama /api/version
      let version: string | undefined;
      try {
        const versionRes = await fetch(`${baseUrl}/api/version`, {
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (versionRes.ok) {
          const versionData = (await versionRes.json()) as { version?: string };
          version = versionData.version;
        }
      } catch {
        // Version endpoint may be unavailable on older Ollama versions, continue to /api/tags
      }

      // 2. Query available local models via /api/tags
      const tagsRes = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!tagsRes.ok) {
        return {
          available: true,
          modelAvailable: false,
          configuredModel: targetModel,
          availableModels: [],
          version,
          error: `Ollama returned HTTP status ${tagsRes.status}`,
        };
      }

      const tagsData = (await tagsRes.json()) as { models?: Array<{ name: string }> };
      const availableModels = (tagsData.models || []).map((m) => m.name);

      // Check if target model or tag is in the list
      const modelAvailable = availableModels.some(
        (name) => name === targetModel || name.startsWith(`${targetModel}:`) || name === `${targetModel}:latest`
      );

      return {
        available: true,
        modelAvailable,
        configuredModel: targetModel,
        availableModels,
        version,
      };
    } catch (err: any) {
      return {
        available: false,
        modelAvailable: false,
        configuredModel: targetModel,
        availableModels: [],
        error: err?.message || 'Ollama connection failed (service not running or unreachable)',
      };
    }
  }
}
