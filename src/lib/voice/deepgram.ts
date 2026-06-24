import { DeepgramClient } from "@deepgram/sdk";

/**
 * Deepgram Streaming STT Integration
 * Handles real-time speech-to-text using Deepgram's API.
 */

export interface DeepgramConfig {
  apiKey: string;
  language?: string;
  model?: string;
  smartFormat?: boolean;
  interimResults?: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: string;
}

type DeepgramConnection = {
  on?: (event: string, handler: (...args: any[]) => void) => void;
  send?: (audioData: Buffer | Uint8Array) => void;
  finish?: () => void;
};

export class DeepgramStreamHandler {
  private deepgram: DeepgramClient;
  private config: DeepgramConfig;
  private connection: DeepgramConnection | null = null;
  private onTranscriptCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(config: DeepgramConfig) {
    this.config = {
      language: "en-US",
      model: "nova-2",
      smartFormat: true,
      interimResults: true,
      ...config,
    };

    this.deepgram = new DeepgramClient({ apiKey: this.config.apiKey });
  }

  async startTranscription(
    onTranscript: (result: TranscriptionResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    try {
      const deepgramAny = this.deepgram as any;
      const connection =
        deepgramAny.listen?.live?.(this.config) ??
        deepgramAny.listen?.v1?.connect?.(this.config) ??
        null;

      if (!connection) {
        throw new Error("Deepgram live transcription is not available in the installed SDK");
      }

      this.connection = connection;

      connection.on?.("open", () => {
        console.log("Deepgram connection opened");
      });

      connection.on?.("transcript", (data: any) => {
        const result = this.parseTranscript(data);
        if (result && this.onTranscriptCallback) {
          this.onTranscriptCallback(result);
        }
      });

      connection.on?.("error", (error: any) => {
        console.error("Deepgram error:", error);
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error(error?.message || "Deepgram transcription error"));
        }
      });

      connection.on?.("close", () => {
        console.log("Deepgram connection closed");
      });
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      throw error;
    }
  }

  sendAudio(audioData: Buffer | Uint8Array): void {
    this.connection?.send?.(audioData);
  }

  stopTranscription(): void {
    this.connection?.finish?.();
    this.connection = null;
  }

  private parseTranscript(data: any): TranscriptionResult | null {
    try {
      const result = data?.channel?.alternatives?.[0] ?? data?.result?.channel?.alternatives?.[0];
      if (!result) return null;

      return {
        transcript: result.transcript || result.text || "",
        isFinal: Boolean(data?.is_final ?? data?.isFinal),
        confidence: result.confidence || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error parsing Deepgram transcript:", error);
      return null;
    }
  }

  async transcribeFile(audioBuffer: Buffer): Promise<string> {
    const response = await this.deepgram.listen.v1.media.transcribeFile(audioBuffer, {
      model: this.config.model,
      language: this.config.language,
      smart_format: this.config.smartFormat,
    });

    const data = response as any;
    return (
      data?.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ||
      data?.result?.results?.channels?.[0]?.alternatives?.[0]?.text ||
      ""
    );
  }
}

export function createDeepgramHandler(config: DeepgramConfig): DeepgramStreamHandler {
  return new DeepgramStreamHandler(config);
}

export function getDeepgramConfig(): DeepgramConfig | null {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.warn("DEEPGRAM_API_KEY is not configured");
    return null;
  }

  return {
    apiKey,
    language: "en-US",
    model: "nova-2",
    smartFormat: true,
    interimResults: true,
  };
}
