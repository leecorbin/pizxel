/**
 * Canvas Audio Input Proxy Driver
 *
 * Server-side proxy that receives audio analysis data from the browser.
 * The actual Web Audio API microphone capture runs in the browser,
 * and analysis results are sent to this driver via WebSocket.
 */

import {
  AudioInputDriver,
  AudioInputEvent,
  AudioInputEventCallback,
  SpectrumData,
  AudioLevels,
  WaveformData,
  AudioClassification,
  AudioAnalysis,
} from "./audio-input-driver";
import type { AudioBridge } from "./audio-bridge";

export class CanvasAudioInputProxy implements AudioInputDriver {
  private server: AudioBridge | null = null;
  private available: boolean = false;
  private capturing: boolean = false;

  private eventCallbacks: Set<AudioInputEventCallback> = new Set();

  // Latest analysis data received from browser
  private currentAnalysis: AudioAnalysis | null = null;
  private lastUpdateTime: number = 0;

  // Settings (passed to browser when it starts)
  private fftSize: number = 2048;
  private smoothing: number = 0.8;

  constructor(server?: AudioBridge) {
    if (server) {
      this.setServer(server);
    }
  }

  /**
   * Set the canvas server (for receiving data from browser)
   */
  setServer(server: AudioBridge): void {
    this.server = server;
    this.available = true;

    // Listen for audio events from browser
    server.onAudioInput((event: string, data: any) => {
      this.handleBrowserEvent(event, data);
    });

    console.log("[CanvasAudioInputProxy] Connected to canvas server");
  }

  /**
   * Handle events from browser
   */
  private handleBrowserEvent(event: string, data: any): void {
    switch (event) {
      case "audio:analysis":
        // Full analysis data from browser
        this.currentAnalysis = data as AudioAnalysis;
        this.lastUpdateTime = Date.now();
        break;

      case "audio:started":
        this.capturing = true;
        this.emitEvent({ type: "permission-granted" });
        console.log("[CanvasAudioInputProxy] Browser started audio capture");
        break;

      case "audio:stopped":
        this.capturing = false;
        console.log("[CanvasAudioInputProxy] Browser stopped audio capture");
        break;

      case "audio:denied":
        this.capturing = false;
        this.emitEvent({ type: "permission-denied" });
        console.log("[CanvasAudioInputProxy] Browser denied microphone access");
        break;

      case "audio:beat":
        this.emitEvent({
          type: "beat-detected",
          tempo: data.tempo || 0,
        });
        break;

      case "audio:error":
        this.emitEvent({
          type: "error",
          error: new Error(data.message || "Audio error"),
        });
        break;
    }
  }

  private emitEvent(event: AudioInputEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (e) {
        console.error("[CanvasAudioInputProxy] Event callback error:", e);
      }
    }
  }

  async initialize(): Promise<void> {
    // Already initialized if server is set
    if (this.server) {
      console.log("[CanvasAudioInputProxy] Initialized (waiting for browser)");
    } else {
      console.warn("[CanvasAudioInputProxy] No canvas server provided");
      this.available = false;
    }
  }

  async start(): Promise<void> {
    if (!this.server) {
      throw new Error("No canvas server connected");
    }

    // Request browser to start audio capture
    this.server.requestAudioStart();
    console.log("[CanvasAudioInputProxy] Requested browser to start audio");
  }

  stop(): void {
    if (this.server) {
      this.server.requestAudioStop();
    }
    this.capturing = false;
    this.currentAnalysis = null;
  }

  isAvailable(): boolean {
    return this.available && !!this.server;
  }

  isCapturing(): boolean {
    return this.capturing;
  }

  onEvent(callback: AudioInputEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  offEvent(callback: AudioInputEventCallback): void {
    this.eventCallbacks.delete(callback);
  }

  getSpectrum(): SpectrumData | null {
    return this.currentAnalysis?.spectrum ?? null;
  }

  getLevels(): AudioLevels | null {
    return this.currentAnalysis?.levels ?? null;
  }

  getWaveform(): WaveformData | null {
    return this.currentAnalysis?.waveform ?? null;
  }

  getClassification(): AudioClassification | null {
    return this.currentAnalysis?.classification ?? null;
  }

  getAnalysis(): AudioAnalysis | null {
    return this.currentAnalysis;
  }

  setFFTSize(size: number): void {
    this.fftSize = size;
    // TODO: Send to browser if capturing
  }

  setSmoothing(value: number): void {
    this.smoothing = Math.max(0, Math.min(1, value));
    // TODO: Send to browser if capturing
  }

  shutdown(): void {
    this.stop();
    this.eventCallbacks.clear();
    this.server = null;
    this.available = false;
  }
}
