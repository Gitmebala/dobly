import { DeepgramClient, listen } from "@deepgram/sdk";
import { ElevenLabsSynthesizer } from "./elevenlabs";
import { anthropic } from "../anthropic";

/**
 * Voice Runtime: Orchestrates the sub-second voice loop
 * Twilio Media Stream → Deepgram STT → Groq 70B → ElevenLabs TTS → Twilio
 */

export interface VoiceRuntimeConfig {
  deepgramApiKey: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  elevenLabsAgentId?: string;
  userId: string;
  coworkerId: string;
  callSid: string;
}

export interface LatencyMetrics {
  sttLatency: number; // Speech-to-text latency
  llmLatency: number; // LLM generation latency
  ttsLatency: number; // Text-to-speech latency
  totalLatency: number; // End-to-end latency
  timestamp: string;
}

export interface VoiceSession {
  sessionId: string;
  callSid: string;
  startTime: string;
  endTime?: string;
  metrics: LatencyMetrics[];
  transcript: Array<{
    role: "user" | "agent";
    text: string;
    timestamp: string;
  }>;
}

const activeSessions = new Map<string, VoiceSession>();

/**
 * Initialize a voice session
 */
export function initializeVoiceSession(callSid: string, userId: string, coworkerId: string): VoiceSession {
  const session: VoiceSession = {
    sessionId: `${callSid}-${Date.now()}`,
    callSid,
    startTime: new Date().toISOString(),
    metrics: [],
    transcript: [],
  };
  
  activeSessions.set(session.sessionId, session);
  return session;
}

/**
 * Get active voice session
 */
export function getVoiceSession(sessionId: string): VoiceSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * End a voice session
 */
export function endVoiceSession(sessionId: string): VoiceSession | undefined {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.endTime = new Date().toISOString();
    activeSessions.delete(sessionId);
  }
  return session;
}

/**
 * Process audio stream through the voice pipeline
 * This is the core orchestration function
 */
export async function processVoiceStream(
  audioBuffer: Buffer,
  sessionId: string,
  config: VoiceRuntimeConfig
): Promise<{
  audioResponse: Buffer | null;
  transcript: string;
  metrics: LatencyMetrics;
}> {
  const session = getVoiceSession(sessionId);
  if (!session) {
    throw new Error(`Voice session ${sessionId} not found`);
  }

  const startTime = Date.now();
  const metrics: LatencyMetrics = {
    sttLatency: 0,
    llmLatency: 0,
    ttsLatency: 0,
    totalLatency: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // Step 1: Speech-to-Text (Deepgram)
    const sttStart = Date.now();
    const transcript = await transcribeAudio(audioBuffer, config.deepgramApiKey);
    metrics.sttLatency = Date.now() - sttStart;

    if (!transcript || transcript.trim().length === 0) {
      return {
        audioResponse: null,
        transcript: "",
        metrics,
      };
    }

    // Add user transcript to session
    session.transcript.push({
      role: "user",
      text: transcript,
      timestamp: new Date().toISOString(),
    });

    // Step 2: LLM Response Generation (Groq 70B via Anthropic)
    const llmStart = Date.now();
    const agentResponse = await generateAgentResponse(transcript, session.transcript, config);
    metrics.llmLatency = Date.now() - llmStart;

    // Add agent transcript to session
    session.transcript.push({
      role: "agent",
      text: agentResponse,
      timestamp: new Date().toISOString(),
    });

    // Step 3: Text-to-Speech (ElevenLabs)
    const ttsStart = Date.now();
    const audioResponse = await synthesizeSpeech(agentResponse, config);
    metrics.ttsLatency = Date.now() - ttsStart;

    metrics.totalLatency = Date.now() - startTime;
    session.metrics.push(metrics);

    // Check latency budget
    if (metrics.totalLatency > 800) {
      console.warn(`Voice latency exceeded budget: ${metrics.totalLatency}ms (target: <800ms)`, metrics);
    }

    return {
      audioResponse,
      transcript: agentResponse,
      metrics,
    };
  } catch (error) {
    console.error("Voice pipeline error:", error);
    throw error;
  }
}

/**
 * Transcribe audio using Deepgram
 */
async function transcribeAudio(audioBuffer: Buffer, apiKey: string): Promise<string> {
  const deepgram = new DeepgramClient({ apiKey });
  
  // For streaming, you would use LiveTranscription
  // For this implementation, we'll use the pre-recorded API for simplicity
  // In production, you'd use the streaming API with WebSocket
  
  const response = await deepgram.listen.v1.media.transcribeFile(
    audioBuffer,
    {
      model: "nova-2",
      language: "en-US",
      smart_format: true,
    }
  );

  // Handle different response formats from Deepgram v5
  const data = response as any;
  return data.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || data.result?.results?.channels?.[0]?.alternatives?.[0]?.text || "";

}

/**
 * Generate agent response using LLM
 */
async function generateAgentResponse(
  userTranscript: string,
  conversationHistory: VoiceSession["transcript"],
  config: VoiceRuntimeConfig
): Promise<string> {
  // Build conversation context
  const context = conversationHistory
    .map((msg) => `${msg.role}: ${msg.text}`)
    .join("\n");

  const systemPrompt = `You are a voice AI assistant for Dobly. You are helpful, professional, and concise.
Keep responses short and conversational (under 50 words typically).
You are speaking to a customer or business contact.
Respond naturally as if in a phone conversation.`;

  const response = await anthropic.messages.create({
    model: "llama-3.3-70b-versatile", // Using Groq model via their API
    max_tokens: 150,
    system: systemPrompt,
    messages: [
      ...(context ? [{ role: "user" as const, content: context }] : []),
      { role: "user", content: userTranscript },
    ],
  });

  return response.content[0]?.type === "text" ? response.content[0].text : "";
}

/**
 * Synthesize speech using ElevenLabs
 */
async function synthesizeSpeech(text: string, config: VoiceRuntimeConfig): Promise<Buffer> {
  const synthesizer = new ElevenLabsSynthesizer({
    apiKey: config.elevenLabsApiKey,
    voiceId: config.elevenLabsVoiceId,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
  });

  const result = await synthesizer.synthesize(text);
  return result.audio;
}

/**
 * Get average latency metrics for a session
 */
export function getSessionLatencyStats(sessionId: string): {
  avgSTT: number;
  avgLLM: number;
  avgTTS: number;
  avgTotal: number;
  maxTotal: number;
  minTotal: number;
} | null {
  const session = getVoiceSession(sessionId);
  if (!session || session.metrics.length === 0) {
    return null;
  }

  const metrics = session.metrics;
  const avgSTT = metrics.reduce((sum, m) => sum + m.sttLatency, 0) / metrics.length;
  const avgLLM = metrics.reduce((sum, m) => sum + m.llmLatency, 0) / metrics.length;
  const avgTTS = metrics.reduce((sum, m) => sum + m.ttsLatency, 0) / metrics.length;
  const avgTotal = metrics.reduce((sum, m) => sum + m.totalLatency, 0) / metrics.length;
  const maxTotal = Math.max(...metrics.map((m) => m.totalLatency));
  const minTotal = Math.min(...metrics.map((m) => m.totalLatency));

  return {
    avgSTT,
    avgLLM,
    avgTTS,
    avgTotal,
    maxTotal,
    minTotal,
  };
}
