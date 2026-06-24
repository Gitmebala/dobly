import { DeepgramStreamHandler, getDeepgramConfig, TranscriptionResult } from "./deepgram";
import { ElevenLabsSynthesizer, getElevenLabsConfig } from "./elevenlabs";
import { anthropic } from "@/lib/anthropic";
import { initializeVoiceSession, endVoiceSession, getVoiceSession, type VoiceSession } from "./runtime";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { failedProviderCharge } from "@/lib/billing/economy-core";

/**
 * Voice Loop Orchestrator
 * Coordinates the full voice pipeline: Twilio → Deepgram → Groq → ElevenLabs → Twilio
 */

export interface VoiceOrchestratorConfig {
  userId: string;
  coworkerId: string;
  callSid: string;
  systemPrompt?: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
  };
}

export interface VoiceTurn {
  userTranscript: string;
  agentResponse: string;
  audioResponse: Buffer;
  metrics: {
    sttLatency: number;
    llmLatency: number;
    ttsLatency: number;
    totalLatency: number;
  };
  timestamp: string;
}

export class VoiceOrchestrator {
  private config: VoiceOrchestratorConfig;
  private deepgramHandler: DeepgramStreamHandler | null = null;
  private elevenLabsSynthesizer: ElevenLabsSynthesizer | null = null;
  private sessionId: string;
  private conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  private isSpeaking = false;

  constructor(config: VoiceOrchestratorConfig) {
    this.config = config;
    this.sessionId = initializeVoiceSession(config.callSid, config.userId, config.coworkerId).sessionId;
  }

  /**
   * Initialize the voice pipeline
   */
  async initialize(): Promise<void> {
    const deepgramConfig = getDeepgramConfig();
    const elevenLabsConfig = getElevenLabsConfig();

    if (!deepgramConfig) {
      throw new Error("Deepgram is not configured");
    }

    if (!elevenLabsConfig) {
      throw new Error("ElevenLabs is not configured");
    }

    this.deepgramHandler = new DeepgramStreamHandler(deepgramConfig);
    this.elevenLabsSynthesizer = new ElevenLabsSynthesizer({
      ...elevenLabsConfig,
      ...this.config.voiceSettings,
    });
  }

  /**
   * Start the voice loop
   */
  async start(onAudioReady: (audio: Buffer) => void, onTranscript: (text: string) => void): Promise<void> {
    if (!this.deepgramHandler) {
      throw new Error("Voice orchestrator not initialized");
    }

    await this.deepgramHandler.startTranscription(
      async (result: TranscriptionResult) => {
        onTranscript(result.transcript);

        // Only process final transcripts
        if (result.isFinal && !this.isSpeaking) {
          await this.processUserSpeech(result.transcript, onAudioReady);
        }
      },
      (error) => {
        console.error("Voice transcription error:", error);
      }
    );
  }

  /**
   * Process user speech through the full pipeline
   */
  private async processUserSpeech(
    userTranscript: string,
    onAudioReady: (audio: Buffer) => void
  ): Promise<void> {
    if (!userTranscript.trim() || this.isSpeaking) {
      return;
    }

    this.isSpeaking = true;
    let billingReservation: { id: string } | null = null;
    const estimatedMinor = 200;
    const startTime = Date.now();
    const metrics = {
      sttLatency: 0,
      llmLatency: 0,
      ttsLatency: 0,
      totalLatency: 0,
    };

    try {
      billingReservation = await reserveOperatingCapacity({
        userId: this.config.userId,
        coworkerId: this.config.coworkerId,
        capability: "ai.routine",
        provider: "voice_pipeline",
        estimatedMinor,
        idempotencyKey: `voice-turn:${this.sessionId}:${this.conversationHistory.length}`,
        metadata: { callSid: this.config.callSid, sessionId: this.sessionId },
      });
      // Step 1: Add user transcript to conversation history
      this.conversationHistory.push({
        role: "user",
        content: userTranscript,
      });

      // Step 2: Generate agent response (LLM)
      const llmStart = Date.now();
      const agentResponse = await this.generateAgentResponse(userTranscript);
      metrics.llmLatency = Date.now() - llmStart;

      // Add agent response to conversation history
      this.conversationHistory.push({
        role: "assistant",
        content: agentResponse,
      });

      // Step 3: Synthesize speech (TTS)
      const ttsStart = Date.now();
      const audioResult = await this.synthesizeSpeech(agentResponse);
      metrics.ttsLatency = Date.now() - ttsStart;

      metrics.totalLatency = Date.now() - startTime;

      // Check latency budget
      if (metrics.totalLatency > 800) {
        console.warn(`Voice turn exceeded latency budget: ${metrics.totalLatency}ms (target: <800ms)`);
      }

      // Send audio back to caller
      onAudioReady(audioResult.audio);

      // Log the turn
      const session = getVoiceSession(this.sessionId);
      if (session) {
        session.transcript.push({
          role: "user",
          text: userTranscript,
          timestamp: new Date().toISOString(),
        });
        session.transcript.push({
          role: "agent",
          text: agentResponse,
          timestamp: new Date().toISOString(),
        });
      }
      await settleOperatingCapacity({
        reservationId: billingReservation!.id,
        actualMinor: estimatedMinor,
        status: "succeeded",
        metadata: { callSid: this.config.callSid, sessionId: this.sessionId, metrics },
      });
    } catch (error) {
      console.error("Error processing voice turn:", error);
      if (billingReservation) {
        const message = error instanceof Error ? error.message : "Voice turn failed.";
        await settleOperatingCapacity({
          reservationId: billingReservation.id,
          actualMinor: failedProviderCharge({ paidRail: true, estimatedMinor, errorMessage: message }),
          status: "failed",
          metadata: { callSid: this.config.callSid, sessionId: this.sessionId, error: message },
        }).catch(() => undefined);
      }
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * Generate agent response using LLM
   */
  private async generateAgentResponse(userTranscript: string): Promise<string> {
    const systemPrompt = this.config.systemPrompt || `You are a voice AI assistant for Dobly. You are helpful, professional, and concise.
Keep responses short and conversational (under 50 words typically).
You are speaking to a customer or business contact.
Respond naturally as if in a phone conversation.`;

    // Build messages from conversation history (last 10 turns)
    const recentHistory = this.conversationHistory.slice(-10);
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: systemPrompt },
      ...recentHistory,
    ];

    const response = await anthropic.messages.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      messages,
    });

    return response.content[0]?.type === "text" ? response.content[0].text : "";
  }

  /**
   * Synthesize speech using ElevenLabs
   */
  private async synthesizeSpeech(text: string): Promise<{ audio: Buffer; duration: number }> {
    if (!this.elevenLabsSynthesizer) {
      throw new Error("ElevenLabs synthesizer not initialized");
    }

    const result = await this.elevenLabsSynthesizer.synthesize(text);
    return {
      audio: result.audio,
      duration: result.duration,
    };
  }

  /**
   * Send audio data to the transcription stream
   */
  sendAudio(audioData: Buffer): void {
    if (this.deepgramHandler) {
      this.deepgramHandler.sendAudio(audioData);
    }
  }

  /**
   * Stop the voice loop
   */
  async stop(): Promise<void> {
    if (this.deepgramHandler) {
      this.deepgramHandler.stopTranscription();
    }

    endVoiceSession(this.sessionId);
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    sessionId: string;
    conversationTurns: number;
    averageLatency: number;
  } | null {
    const session = getVoiceSession(this.sessionId);
    if (!session) {
      return null;
    }

    const avgLatency = session.metrics.length > 0
      ? session.metrics.reduce((sum, m) => sum + m.totalLatency, 0) / session.metrics.length
      : 0;

    return {
      sessionId: this.sessionId,
      conversationTurns: Math.floor(session.transcript.length / 2),
      averageLatency: avgLatency,
    };
  }
}

/**
 * Create a voice orchestrator
 */
export function createVoiceOrchestrator(config: VoiceOrchestratorConfig): VoiceOrchestrator {
  return new VoiceOrchestrator(config);
}
