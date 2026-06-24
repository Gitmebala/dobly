import * as ElevenLabsSdk from "elevenlabs";

/**
 * ElevenLabs TTS Integration
 * Handles text-to-speech synthesis using ElevenLabs API.
 */

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface SynthesisResult {
  audio: Buffer;
  duration: number;
  characters: number;
  timestamp: string;
}

function resolveElevenLabsClient() {
  const sdkAny = ElevenLabsSdk as any;
  return sdkAny.ElevenLabs ?? sdkAny.default ?? sdkAny;
}

function toBuffer(audio: unknown): Buffer {
  if (Buffer.isBuffer(audio)) {
    return audio;
  }

  if (audio instanceof Uint8Array) {
    return Buffer.from(audio);
  }

  if (audio instanceof ArrayBuffer) {
    return Buffer.from(audio);
  }

  if (typeof audio === "string") {
    return Buffer.from(audio);
  }

  return Buffer.alloc(0);
}

export class ElevenLabsSynthesizer {
  private elevenLabs: any;
  private config: ElevenLabsConfig;

  constructor(config: ElevenLabsConfig) {
    this.config = {
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
      stability: 0.5,
      similarityBoost: 0.75,
      ...config,
    };

    const Client = resolveElevenLabsClient();
    this.elevenLabs = new Client({
      apiKey: this.config.apiKey,
    });
  }

  async synthesize(text: string): Promise<SynthesisResult> {
    const startTime = Date.now();

    try {
      const audio = await this.elevenLabs.generate({
        voice: this.config.voiceId,
        text,
        model_id: this.config.modelId,
        output_format: this.config.outputFormat,
        voice_settings: {
          stability: this.config.stability,
          similarity_boost: this.config.similarityBoost,
        },
      });

      return {
        audio: toBuffer(audio),
        duration: Date.now() - startTime,
        characters: text.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("ElevenLabs synthesis error:", error);
      throw new Error(`ElevenLabs synthesis failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  async *synthesizeStream(text: string): AsyncGenerator<Buffer, void, unknown> {
    const result = await this.synthesize(text);
    yield result.audio;
  }

  async getVoices(): Promise<any[]> {
    try {
      const voices = await this.elevenLabs.voices.getAll();
      return voices?.voices || [];
    } catch (error) {
      console.error("Error fetching ElevenLabs voices:", error);
      return [];
    }
  }

  async getVoiceSettings(): Promise<any> {
    try {
      return await this.elevenLabs.voices.getSettings(this.config.voiceId);
    } catch (error) {
      console.error("Error fetching voice settings:", error);
      return null;
    }
  }

  async updateVoiceSettings(settings: {
    stability?: number;
    similarity_boost?: number;
  }): Promise<void> {
    try {
      await this.elevenLabs.voices.updateSettings(this.config.voiceId, settings);

      if (settings.stability !== undefined) {
        this.config.stability = settings.stability;
      }
      if (settings.similarity_boost !== undefined) {
        this.config.similarityBoost = settings.similarity_boost;
      }
    } catch (error) {
      console.error("Error updating voice settings:", error);
      throw new Error(`Failed to update voice settings: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
}

export function createElevenLabsSynthesizer(config: ElevenLabsConfig): ElevenLabsSynthesizer {
  return new ElevenLabsSynthesizer(config);
}

export function getElevenLabsConfig(): ElevenLabsConfig | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY is not configured");
    return null;
  }

  if (!voiceId) {
    console.warn("ELEVENLABS_VOICE_ID or ELEVENLABS_AGENT_ID is not configured");
    return null;
  }

  return {
    apiKey,
    voiceId,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    stability: 0.5,
    similarityBoost: 0.75,
  };
}

export async function textToSpeech(text: string): Promise<Buffer | null> {
  const config = getElevenLabsConfig();
  if (!config) {
    return null;
  }

  const synthesizer = createElevenLabsSynthesizer(config);
  const result = await synthesizer.synthesize(text);
  return result.audio;
}
