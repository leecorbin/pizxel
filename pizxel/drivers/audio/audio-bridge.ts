/**
 * Audio Bridge
 *
 * What the browser-based audio drivers need from whatever connects them to
 * the browser: the local CanvasServer, or a session in server mode.
 */

export interface AudioBridge {
  /** Play a tone in the browser */
  sendBeep(frequency: number, duration: number, volume?: number): void;
  /** Play a frequency sweep in the browser */
  sendSweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    volume?: number
  ): void;
  /** Receive microphone events (audio:started, audio:analysis, ...) */
  onAudioInput(callback: (event: string, data: any) => void): void;
  /** Ask the browser to start microphone capture */
  requestAudioStart(): void;
  /** Ask the browser to stop microphone capture */
  requestAudioStop(): void;
}
