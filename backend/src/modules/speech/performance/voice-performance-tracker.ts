/**
 * Voice Pipeline Performance Tracker
 * Phase 8.1: End-to-End Voice Pipeline Performance Benchmarking
 *
 * High-resolution in-memory tracker that records latency across every stage of
 * the backend voice pipeline without adding noticeable runtime overhead (< 0.05ms).
 *
 * Enforces zero double-counting: sub-latencies (intent, tool, database, LLM)
 * are categorized under aiMs / toolExecutionMs rather than inflating totalBackendPipelineMs.
 */

import {
  VoiceTurnPerformanceMetric,
  VoiceStageLatencies,
  VoiceOperationalMetadata,
  AIExecutionSource,
  LatencyStatistics,
  ScenarioStatisticalSummary,
} from './voice-performance.types';

export class VoicePerformanceTracker {
  private startTime: number;
  private stageTimestamps: Map<string, { start: number; duration?: number }> = new Map();
  private sessionId: string;
  private turnNumber: number;
  private metadata: Partial<VoiceOperationalMetadata> = {};

  constructor(sessionId: string = `sess_bench_${Date.now()}`, turnNumber: number = 1) {
    this.sessionId = sessionId;
    this.turnNumber = turnNumber;
    this.startTime = performance.now();
  }

  /**
   * Begin timing a specific stage.
   */
  public startStage(stageName: string): void {
    this.stageTimestamps.set(stageName, { start: performance.now() });
  }

  /**
   * End timing a specific stage and record elapsed duration in milliseconds.
   */
  public endStage(stageName: string): number {
    const stage = this.stageTimestamps.get(stageName);
    const now = performance.now();
    if (!stage) {
      this.stageTimestamps.set(stageName, { start: now, duration: 0 });
      return 0;
    }
    const duration = Number((now - stage.start).toFixed(2));
    stage.duration = duration;
    return duration;
  }

  /**
   * Manually record a stage duration if it was already measured.
   */
  public recordStageDuration(stageName: string, durationMs: number): void {
    this.stageTimestamps.set(stageName, {
      start: performance.now() - durationMs,
      duration: Number(Math.max(0, durationMs).toFixed(2)),
    });
  }

  /**
   * Attach operational indicators to the performance record.
   */
  public setOperationalMetadata(meta: Partial<VoiceOperationalMetadata>): void {
    this.metadata = { ...this.metadata, ...meta };
  }

  /**
   * Retrieve the duration of an individual stage.
   */
  public getStageDuration(stageName: string): number {
    const stage = this.stageTimestamps.get(stageName);
    return stage?.duration !== undefined ? stage.duration : 0;
  }

  /**
   * Finalize and construct the complete VoiceTurnPerformanceMetric record.
   */
  public finalize(): VoiceTurnPerformanceMetric {
    const requestHandlingMs = this.getStageDuration('requestHandling');
    const audioValidationMs = this.getStageDuration('audioValidation');
    const audioNormalizationMs = this.getStageDuration('audioNormalization');
    const sttMs = this.getStageDuration('stt');
    const aiMs = this.getStageDuration('ai');
    const ttsMs = this.getStageDuration('tts');
    const responsePreparationMs = this.getStageDuration('responsePreparation');

    // Optional sub-latencies
    const intentClassificationMs = this.stageTimestamps.has('intentClassification')
      ? this.getStageDuration('intentClassification')
      : undefined;
    const conversationStateMs = this.stageTimestamps.has('conversationState')
      ? this.getStageDuration('conversationState')
      : undefined;
    const toolExecutionMs = this.stageTimestamps.has('toolExecution')
      ? this.getStageDuration('toolExecution')
      : undefined;
    const llmInferenceMs = this.stageTimestamps.has('llmInference')
      ? this.getStageDuration('llmInference')
      : undefined;
    const databaseMs = this.stageTimestamps.has('database')
      ? this.getStageDuration('database')
      : undefined;

    // Strict non-double-counting total calculation:
    // Core pipeline = RequestHandling + AudioValidation + AudioNormalization + STT + AI + TTS + ResponsePreparation
    const totalBackendPipelineMs = Number(
      (
        requestHandlingMs +
        audioValidationMs +
        audioNormalizationMs +
        sttMs +
        aiMs +
        ttsMs +
        responsePreparationMs
      ).toFixed(2)
    );

    const latencies: VoiceStageLatencies = {
      requestHandlingMs,
      audioValidationMs,
      audioNormalizationMs,
      sttMs,
      aiMs,
      intentClassificationMs,
      conversationStateMs,
      toolExecutionMs,
      llmInferenceMs,
      databaseMs,
      ttsMs,
      responsePreparationMs,
      totalBackendPipelineMs,
    };

    const operational: VoiceOperationalMetadata = {
      source: this.metadata.source || 'deterministic',
      sttSuccess: this.metadata.sttSuccess !== undefined ? this.metadata.sttSuccess : true,
      sttEmptyOrFailed: this.metadata.sttEmptyOrFailed || false,
      inputAudioFormat: this.metadata.inputAudioFormat || 'wav',
      sttCharacterCount: this.metadata.sttCharacterCount || 0,
      responseCharacterCount: this.metadata.responseCharacterCount || 0,
      audioDurationMs: this.metadata.audioDurationMs,
      generatedAudioSizeBytes: this.metadata.generatedAudioSizeBytes,
    };

    return {
      sessionId: this.sessionId,
      turnNumber: this.turnNumber,
      timestamp: Date.now(),
      ...latencies,
      ...operational,
    };
  }

  /**
   * Compute statistical summary (Average, Min, Max, Median) across multiple runs.
   */
  public static calculateStatistics(values: number[]): LatencyStatistics {
    if (!values || values.length === 0) {
      return { avg: 0, min: 0, max: 0, median: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = Number((sum / sorted.length).toFixed(2));
    const min = Number(sorted[0].toFixed(2));
    const max = Number(sorted[sorted.length - 1].toFixed(2));

    let median: number;
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      median = Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
    } else {
      median = Number(sorted[mid].toFixed(2));
    }

    return { avg, min, max, median };
  }

  /**
   * Aggregate an array of turn performance metrics into a statistical summary for a scenario.
   */
  public static summarizeScenario(
    scenarioName: string,
    source: AIExecutionSource,
    turnType: 'Cold' | 'Warm',
    runs: VoiceTurnPerformanceMetric[]
  ): ScenarioStatisticalSummary {
    const stt = this.calculateStatistics(runs.map((r) => r.sttMs));
    const ai = this.calculateStatistics(runs.map((r) => r.aiMs));
    const database = this.calculateStatistics(runs.map((r) => r.databaseMs || 0));
    const tts = this.calculateStatistics(runs.map((r) => r.ttsMs));
    const totalPipeline = this.calculateStatistics(runs.map((r) => r.totalBackendPipelineMs));

    const intentList = runs.map((r) => r.intentClassificationMs).filter((v): v is number => v !== undefined);
    const stateList = runs.map((r) => r.conversationStateMs).filter((v): v is number => v !== undefined);
    const toolList = runs.map((r) => r.toolExecutionMs).filter((v): v is number => v !== undefined);
    const llmList = runs.map((r) => r.llmInferenceMs).filter((v): v is number => v !== undefined);

    const subLatencies = {
      ...(intentList.length > 0 ? { intentClassification: this.calculateStatistics(intentList) } : {}),
      ...(stateList.length > 0 ? { conversationState: this.calculateStatistics(stateList) } : {}),
      ...(toolList.length > 0 ? { toolExecution: this.calculateStatistics(toolList) } : {}),
      ...(llmList.length > 0 ? { llmInference: this.calculateStatistics(llmList) } : {}),
    };

    return {
      scenarioName,
      source,
      turnType,
      runCount: runs.length,
      stt,
      ai,
      database,
      tts,
      totalPipeline,
      ...(Object.keys(subLatencies).length > 0 ? { subLatencies } : {}),
    };
  }
}
