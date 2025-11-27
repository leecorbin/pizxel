/**
 * Canvas Audio Driver
 *
 * Audio driver for canvas mode that sends audio commands to browser via WebSocket.
 * Works alongside CanvasDisplayDriver.
 */

import {
  AudioDriver,
  SoundEffect,
  BeepParams,
  SweepParams,
  NoiseParams,
  MelodyParams,
} from "./audio-driver";
import { CanvasServer } from "../display/canvas-server";

export class CanvasAudioDriver implements AudioDriver {
  private volume: number = 0.5;
  private sounds: Map<string, SoundEffect> = new Map();
  private server: CanvasServer | null = null;

  constructor(server: CanvasServer) {
    this.server = server;
  }

  async initialize(): Promise<void> {
    // Register default sound effects
    this.registerDefaultSounds();
    console.log("[CanvasAudioDriver] Initialized (browser-based audio)");
  }

  private registerDefaultSounds(): void {
    // Game sounds
    this.sounds.set("coin", {
      name: "coin",
      type: "sweep",
      params: {
        startFreq: 400,
        endFreq: 800,
        duration: 100,
        volume: 0.3,
      },
    });

    this.sounds.set("jump", {
      name: "jump",
      type: "sweep",
      params: {
        startFreq: 200,
        endFreq: 600,
        duration: 150,
        volume: 0.3,
      },
    });

    this.sounds.set("hit", {
      name: "hit",
      type: "noise",
      params: {
        duration: 100,
        volume: 0.3,
        type: "white",
      },
    });

    this.sounds.set("die", {
      name: "die",
      type: "sweep",
      params: {
        startFreq: 400,
        endFreq: 100,
        duration: 500,
        volume: 0.4,
      },
    });

    this.sounds.set("powerup", {
      name: "powerup",
      type: "melody",
      params: {
        notes: [
          { frequency: 261.63, duration: 80 }, // C
          { frequency: 329.63, duration: 80 }, // E
          { frequency: 392.0, duration: 80 }, // G
          { frequency: 523.25, duration: 150 }, // C (octave up)
        ],
        volume: 0.3,
      },
    });

    this.sounds.set("select", {
      name: "select",
      type: "beep",
      params: {
        frequency: 800,
        duration: 50,
        volume: 0.2,
      },
    });

    this.sounds.set("error", {
      name: "error",
      type: "beep",
      params: {
        frequency: 200,
        duration: 200,
        volume: 0.3,
      },
    });

    this.sounds.set("brick", {
      name: "brick",
      type: "beep",
      params: {
        frequency: 600,
        duration: 50,
        volume: 0.2,
      },
    });

    this.sounds.set("bounce", {
      name: "bounce",
      type: "beep",
      params: {
        frequency: 400,
        duration: 50,
        volume: 0.2,
      },
    });
  }

  beep(frequency: number, duration: number, volume: number = 0.5): void {
    if (!this.server) return;
    console.log(
      `[CanvasAudioDriver] Sending beep: ${frequency}Hz, ${duration}ms, vol=${volume}`
    );
    this.server.sendBeep(frequency, duration, volume * this.volume);
  }

  playSound(name: string): void {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`[CanvasAudioDriver] Sound "${name}" not found`);
      return;
    }

    switch (sound.type) {
      case "beep":
        this.playBeep(sound.params as BeepParams);
        break;
      case "sweep":
        this.playSweep(sound.params as SweepParams);
        break;
      case "noise":
        this.playNoise(sound.params as NoiseParams);
        break;
      case "melody":
        this.playMelody(sound.params as MelodyParams);
        break;
    }
  }

  private playBeep(params: BeepParams): void {
    this.beep(params.frequency, params.duration, params.volume);
  }

  private playSweep(params: SweepParams): void {
    if (!this.server) return;
    this.server.sendSweep(
      params.startFreq,
      params.endFreq,
      params.duration,
      (params.volume || 0.5) * this.volume
    );
  }

  private playNoise(params: NoiseParams): void {
    // Noise is white noise - simulate with rapid random beeps
    if (!this.server) return;
    // For now, just play a low beep
    this.server.sendBeep(
      150,
      params.duration,
      (params.volume || 0.5) * this.volume
    );
  }

  private playMelody(params: MelodyParams): void {
    let offset = 0;
    for (const note of params.notes) {
      setTimeout(() => {
        this.beep(note.frequency, note.duration, params.volume);
      }, offset);
      offset += note.duration;
    }
  }

  stopAll(): void {
    // Can't stop sounds that are already playing in browser
    // (they auto-stop after duration)
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }

  isAvailable(): boolean {
    return this.server !== null;
  }

  shutdown(): void {
    this.stopAll();
  }

  /**
   * Register a custom sound effect
   */
  registerSound(sound: SoundEffect): void {
    this.sounds.set(sound.name, sound);
  }
}
