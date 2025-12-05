/**
 * Canvas HTTP Display Server
 *
 * Provides a web-based display for PiZXel using HTML Canvas.
 * Useful for development and remote viewing.
 */

import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import { DisplayBuffer } from "../core/display-buffer";
import { RGB } from "../types";

export interface CanvasServerOptions {
  port?: number;
  pixelSize?: number;
}

export class CanvasServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private port: number;
  private pixelSize: number;
  private displayWidth: number = 256;
  private displayHeight: number = 192;
  private clientCount: number = 0;
  private lastFrame: any = null;
  private keyCallback: ((key: string) => void) | null = null;
  private fullscreenMode: boolean = false;
  private audioInputCallback: ((event: string, data: any) => void) | null =
    null;

  constructor(options: CanvasServerOptions = {}) {
    this.port = options.port ?? 3000;
    this.pixelSize = options.pixelSize ?? 3;

    // Setup Express
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server);

    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupRoutes(): void {
    // Serve HTML viewer
    this.app.get("/", (req, res) => {
      res.send(this.getViewerHTML());
    });

    // API endpoint for display size
    this.app.get("/api/size", (req, res) => {
      res.json({
        width: this.displayWidth,
        height: this.displayHeight,
        pixelSize: this.pixelSize,
      });
    });
  }

  private setupSocketIO(): void {
    this.io.on("connection", (socket) => {
      this.clientCount++;
      console.log(
        `[CanvasServer] Client connected (${this.clientCount} total)`
      );

      // Send current display size
      socket.emit("init", {
        width: this.displayWidth,
        height: this.displayHeight,
        pixelSize: this.pixelSize,
      });

      // Send current frame immediately if we have one
      if (this.lastFrame) {
        console.log("[CanvasServer] Sending cached frame to new client");
        socket.emit("frame", this.lastFrame);
      }

      // Handle keyboard input from browser
      socket.on("keydown", (data: { key: string }) => {
        if (this.keyCallback) {
          this.keyCallback(data.key);
        }
      });

      // Handle paste events from browser
      socket.on("paste", (data: { text: string }) => {
        // Inject each character as a key event
        if (this.keyCallback) {
          for (const char of data.text) {
            this.keyCallback(char);
          }
        }
      });

      // Handle fullscreen toggle from browser
      socket.on("fullscreen", (data: { enabled: boolean }) => {
        this.fullscreenMode = data.enabled;
        console.log(
          `[CanvasServer] Fullscreen ${data.enabled ? "enabled" : "disabled"}`
        );
      });

      // Handle audio input events from browser
      socket.on("audio:started", () => {
        if (this.audioInputCallback) {
          this.audioInputCallback("audio:started", {});
        }
      });

      socket.on("audio:stopped", () => {
        if (this.audioInputCallback) {
          this.audioInputCallback("audio:stopped", {});
        }
      });

      socket.on("audio:denied", () => {
        if (this.audioInputCallback) {
          this.audioInputCallback("audio:denied", {});
        }
      });

      socket.on("audio:analysis", (data: any) => {
        if (this.audioInputCallback) {
          this.audioInputCallback("audio:analysis", data);
        }
      });

      socket.on("audio:beat", (data: any) => {
        if (this.audioInputCallback) {
          this.audioInputCallback("audio:beat", data);
        }
      });

      socket.on("audio:error", (data: any) => {
        if (this.audioInputCallback) {
          this.audioInputCallback("audio:error", data);
        }
      });

      socket.on("disconnect", () => {
        this.clientCount--;
        console.log(
          `[CanvasServer] Client disconnected (${this.clientCount} remaining)`
        );
      });
    });
  }

  /**
   * Set callback for keyboard events from browser
   */
  onKey(callback: (key: string) => void): void {
    this.keyCallback = callback;
  }

  /**
   * Toggle fullscreen mode (sends command to all clients)
   */
  toggleFullscreen(): void {
    this.fullscreenMode = !this.fullscreenMode;
    this.io?.emit("fullscreen:toggle");
    console.log(`[CanvasServer] Fullscreen toggled: ${this.fullscreenMode}`);
  }

  /**
   * Check if in fullscreen mode
   */
  isFullscreen(): boolean {
    return this.fullscreenMode;
  }

  /**
   * Send audio beep to all connected clients
   */
  sendBeep(frequency: number, duration: number, volume: number = 0.5): void {
    console.log(
      `[CanvasServer] Emitting audio:beep to ${this.clientCount} clients`
    );
    this.io?.emit("audio:beep", { frequency, duration, volume });
  }

  /**
   * Send audio sweep to all connected clients
   */
  sendSweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number = 0.5
  ): void {
    this.io?.emit("audio:sweep", { startFreq, endFreq, duration, volume });
  }

  /**
   * Set callback for audio input events from browser
   */
  onAudioInput(callback: (event: string, data: any) => void): void {
    this.audioInputCallback = callback;
  }

  /**
   * Request browser to start audio capture
   */
  requestAudioStart(): void {
    console.log("[CanvasServer] Requesting browser to start audio capture");
    this.io?.emit("audio:request-start");
  }

  /**
   * Request browser to stop audio capture
   */
  requestAudioStop(): void {
    console.log("[CanvasServer] Requesting browser to stop audio capture");
    this.io?.emit("audio:request-stop");
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`[CanvasServer] Running at http://localhost:${this.port}`);
        console.log(
          `[CanvasServer] Display: ${this.displayWidth}×${this.displayHeight} @ ${this.pixelSize}px/pixel`
        );
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log("[CanvasServer] Stopped");
        resolve();
      });
    });
  }

  /**
   * Update display dimensions
   */
  setDisplaySize(width: number, height: number): void {
    this.displayWidth = width;
    this.displayHeight = height;

    // Notify all clients
    this.io.emit("resize", { width, height });
  }

  /**
   * Send frame update to all connected clients
   */
  sendFrame(buffer: DisplayBuffer): void {
    const rgbBuffer = buffer.getBuffer();

    // Flatten RGB data for efficient transmission
    const flatData: number[] = [];
    for (let y = 0; y < this.displayHeight; y++) {
      for (let x = 0; x < this.displayWidth; x++) {
        const [r, g, b] = rgbBuffer[y][x];
        flatData.push(r, g, b);
      }
    }

    // Cache frame for new clients (ALWAYS cache, even if no clients)
    this.lastFrame = {
      data: flatData,
      width: this.displayWidth,
      height: this.displayHeight,
    };

    // Only emit if we have clients
    if (this.clientCount === 0) {
      console.log("[CanvasServer] Frame cached but no clients connected");
      return;
    }

    // Debug: Log frame data occasionally
    if (flatData.length > 0 && Math.random() < 0.1) {
      const sample = flatData.slice(0, 30);
      const nonZero = flatData.filter((v) => v !== 0).length;
      console.log(
        `[CanvasServer] Sending frame: ${flatData.length} values, ${nonZero} non-zero`
      );
    }

    this.io.emit("frame", this.lastFrame);
  }

  /**
   * Generate HTML viewer page
   */
  private getViewerHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PiZXel Display</title>
  <style>
    body {
      margin: 0;
      padding: 60px 20px 20px 20px;
      background: #1a1a1a;
      color: #00ffff;
      font-family: 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }

    /* Fullscreen mode styling - multiple selector strategies */
    html:fullscreen body,
    html:-webkit-full-screen body,
    html:-moz-full-screen body,
    html:-ms-fullscreen body,
    :fullscreen body,
    :-webkit-full-screen body,
    :-moz-full-screen body,
    :-ms-fullscreen body {
      padding: 0 !important;
      margin: 0 !important;
      background: #000 !important;
      overflow: hidden !important;
    }

    /* Hide container styling in fullscreen - remove border, shadow, padding */
    html:fullscreen #container,
    html:-webkit-full-screen #container,
    html:-moz-full-screen #container,
    html:-ms-fullscreen #container,
    :fullscreen #container,
    :-webkit-full-screen #container,
    :-moz-full-screen #container,
    :-ms-fullscreen #container {
      border: none !important;
      padding: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
      margin: 0 !important;
      position: static !important;
    }

    /* Hide status bar in fullscreen */
    html:fullscreen #status-bar,
    html:-webkit-full-screen #status-bar,
    html:-moz-full-screen #status-bar,
    html:-ms-fullscreen #status-bar,
    :fullscreen #status-bar,
    :-webkit-full-screen #status-bar,
    :-moz-full-screen #status-bar,
    :-ms-fullscreen #status-bar {
      display: none !important;
    }

    /* Make canvas fill entire screen */
    html:fullscreen canvas,
    html:-webkit-full-screen canvas,
    html:-moz-full-screen canvas,
    html:-ms-fullscreen canvas,
    :fullscreen canvas,
    :-webkit-full-screen canvas,
    :-moz-full-screen canvas,
    :-ms-fullscreen canvas {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      max-height: none !important;
      object-fit: contain !important;
      image-rendering: pixelated !important;
      background: #000 !important;
      z-index: 9999 !important;
    }

    html:fullscreen #stats,
    html:-webkit-full-screen #stats,
    html:-moz-full-screen #stats,
    html:-ms-fullscreen #stats,
    :fullscreen #stats,
    :-webkit-full-screen #stats,
    :-moz-full-screen #stats,
    :-ms-fullscreen #stats {
      display: none !important;
    }

    html:fullscreen #fullscreen-btn,
    html:-webkit-full-screen #fullscreen-btn,
    html:-moz-full-screen #fullscreen-btn,
    html:-ms-fullscreen #fullscreen-btn,
    :fullscreen #fullscreen-btn,
    :-webkit-full-screen #fullscreen-btn,
    :-moz-full-screen #fullscreen-btn,
    :-ms-fullscreen #fullscreen-btn {
      display: none !important;
    }
    
    #container {
      position: relative;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
      background: #000;
      padding: 10px;
    }

    #fullscreen-btn {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      padding: 8px 12px;
      font-size: 20px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s, background 0.2s;
      z-index: 100;
    }

    #container:hover #fullscreen-btn {
      opacity: 1;
    }

    #fullscreen-btn:hover {
      background: rgba(0, 0, 0, 0.9);
      border-color: rgba(255, 255, 255, 0.6);
    }
    
    canvas {
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      transition: opacity 0.3s ease;
      width: 100%;
      height: auto;
    }
    
    canvas.disconnected {
      opacity: 0.3;
    }
    
    #stats {
      margin-top: 20px;
      font-size: 12px;
      color: #888;
      text-align: center;
    }
    
    .status {
      color: #00ff00;
    }
    
    .error {
      color: #ff0000;
    }
  </style>
</head>
<body>
  <div id="container">
    <canvas id="display"></canvas>
    <button id="fullscreen-btn" title="Fullscreen (F)">⛶</button>
  </div>
  
  <div id="stats">
    <span id="size">Loading...</span> | 
    <span id="status" class="status">Connecting...</span> | 
    FPS: <span id="fps">0</span> | 
    Frames: <span id="frames">0</span> |
    Latency: <span id="latency">0ms</span>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const canvas = document.getElementById('display');
    const ctx = canvas.getContext('2d');
    const socket = io();
    
    let width = 256;
    let height = 192;
    let pixelSize = ${this.pixelSize};
    let frameCount = 0;
    let lastFrameTime = Date.now();
    let fps = 0;
    let lastUpdate = Date.now();
    
    // Initialize
    socket.on('init', (data) => {
      width = data.width;
      height = data.height;
      pixelSize = data.pixelSize;
      
      canvas.width = width * pixelSize;
      canvas.height = height * pixelSize;
      
      document.getElementById('size').textContent = \`\${width}×\${height} @ \${pixelSize}px/pixel\`;
      document.getElementById('status').textContent = 'Connected';
      document.getElementById('status').className = 'status';
      
      console.log(\`Display initialized: \${width}×\${height}\`);
    });
    
    // Handle resize
    socket.on('resize', (data) => {
      width = data.width;
      height = data.height;
      
      canvas.width = width * pixelSize;
      canvas.height = height * pixelSize;
      
      document.getElementById('size').textContent = \`\${width}×\${height} @ \${pixelSize}px/pixel\`;
      console.log(\`Display resized: \${width}×\${height}\`);
    });
    
    // Render frame
    socket.on('frame', (data) => {
      const now = Date.now();
      const latency = now - lastUpdate;
      lastUpdate = now;
      
      // Update stats
      frameCount++;
      document.getElementById('frames').textContent = frameCount;
      document.getElementById('latency').textContent = latency + 'ms';
      
      // Calculate FPS
      if (now - lastFrameTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
        document.getElementById('fps').textContent = fps;
        frameCount = 0;
        lastFrameTime = now;
      }
      
      // Render pixels
      const imageData = ctx.createImageData(width * pixelSize, height * pixelSize);
      const pixels = imageData.data;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 3;
          const r = data.data[idx];
          const g = data.data[idx + 1];
          const b = data.data[idx + 2];
          
          // Draw pixel as pixelSize × pixelSize block
          for (let py = 0; py < pixelSize; py++) {
            for (let px = 0; px < pixelSize; px++) {
              const pixelX = x * pixelSize + px;
              const pixelY = y * pixelSize + py;
              const pixelIdx = (pixelY * width * pixelSize + pixelX) * 4;
              
              pixels[pixelIdx] = r;
              pixels[pixelIdx + 1] = g;
              pixels[pixelIdx + 2] = b;
              pixels[pixelIdx + 3] = 255;
            }
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      document.getElementById('status').textContent = 'Disconnected';
      document.getElementById('status').className = 'error';
      canvas.classList.add('disconnected');
    });
    
    // Handle reconnection
    socket.on('connect', () => {
      document.getElementById('status').textContent = 'Connected';
      document.getElementById('status').className = 'status';
      canvas.classList.remove('disconnected');
    });
    
    // Audio setup (Web Audio API in browser)
    let audioContext = null;
    let masterGain = null;
    
    function initAudio() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(audioContext.destination);
        console.log('Audio initialized');
      }
      // Resume if suspended (autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
    
    // Handle audio commands from server
    socket.on('audio:beep', (data) => {
      initAudio();
      const { frequency, duration, volume } = data;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume || 0.5;
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      const now = audioContext.currentTime;
      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
      
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    });
    
    socket.on('audio:sweep', (data) => {
      initAudio();
      const { startFreq, endFreq, duration, volume } = data;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.value = startFreq;
      gainNode.gain.value = volume || 0.5;
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      const now = audioContext.currentTime;
      const dur = duration / 1000;
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
      
      oscillator.start(now);
      oscillator.stop(now + dur);
      
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    });
    
    // Fullscreen management (native browser fullscreen)
    let isFullscreen = false;

    function toggleFullscreen() {
      const elem = document.documentElement;
      const container = document.getElementById('container');
      const canvas = document.getElementById('display');
      const stats = document.getElementById('stats');
      const fullscreenBtn = document.getElementById('fullscreen-btn');
      
      // Check if already in fullscreen
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      
      console.log('toggleFullscreen called, currently fullscreen:', isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen) {
        // Enter fullscreen with vendor prefixes
        const requestFullscreen = 
          elem.requestFullscreen ||
          elem.webkitRequestFullscreen ||
          elem.mozRequestFullScreen ||
          elem.msRequestFullscreen;
          
        if (requestFullscreen) {
          requestFullscreen.call(elem).then(() => {
            isFullscreen = true;
            socket.emit('fullscreen', { enabled: true });
            console.log('Entered fullscreen');
            
            // Apply fullscreen styles via JavaScript for maximum specificity
            document.body.style.padding = '0';
            document.body.style.margin = '0';
            document.body.style.background = '#000';
            document.body.style.overflow = 'hidden';
            
            if (container) {
              container.style.border = 'none';
              container.style.padding = '0';
              container.style.boxShadow = 'none';
              container.style.background = 'transparent';
              container.style.margin = '0';
            }
            
            if (stats) stats.style.display = 'none';
            if (fullscreenBtn) fullscreenBtn.style.display = 'none';
            
            if (canvas) {
              canvas.style.position = 'fixed';
              canvas.style.top = '0';
              canvas.style.left = '0';
              canvas.style.width = '100vw';
              canvas.style.height = '100vh';
              canvas.style.maxWidth = 'none';
              canvas.style.maxHeight = 'none';
              canvas.style.objectFit = 'contain';
              canvas.style.imageRendering = 'pixelated';
              canvas.style.background = '#000';
              canvas.style.zIndex = '9999';
            }
            
            // Debug: Check applied styles
            setTimeout(() => {
              console.log('=== FULLSCREEN DEBUG ===');
              console.log('HTML matches :fullscreen?', elem.matches(':fullscreen'));
              if (container) {
                console.log('Container computed style:', {
                  border: getComputedStyle(container).border,
                  boxShadow: getComputedStyle(container).boxShadow,
                  padding: getComputedStyle(container).padding
                });
              }
              if (stats) console.log('Stats display:', getComputedStyle(stats).display);
              if (canvas) {
                console.log('Canvas computed style:', {
                  position: getComputedStyle(canvas).position,
                  width: getComputedStyle(canvas).width,
                  height: getComputedStyle(canvas).height,
                  top: getComputedStyle(canvas).top,
                  left: getComputedStyle(canvas).left
                });
              }
              console.log('========================');
            }, 100);
          }).catch(err => {
            console.error('Failed to enter fullscreen:', err);
          });
        }
      } else {
        // Exit fullscreen - restore original styles
        const exitFullscreen =
          document.exitFullscreen ||
          document.webkitExitFullscreen ||
          document.mozCancelFullScreen ||
          document.msExitFullscreen;
          
        if (exitFullscreen) {
          exitFullscreen.call(document).then(() => {
            isFullscreen = false;
            socket.emit('fullscreen', { enabled: false });
            console.log('Exited fullscreen');
            
            // Remove inline styles to restore CSS
            document.body.style.padding = '';
            document.body.style.margin = '';
            document.body.style.background = '';
            document.body.style.overflow = '';
            
            if (container) {
              container.style.border = '';
              container.style.padding = '';
              container.style.boxShadow = '';
              container.style.background = '';
              container.style.margin = '';
            }
            
            if (stats) stats.style.display = '';
            if (fullscreenBtn) fullscreenBtn.style.display = '';
            
            if (canvas) {
              canvas.style.position = '';
              canvas.style.top = '';
              canvas.style.left = '';
              canvas.style.width = '';
              canvas.style.height = '';
              canvas.style.maxWidth = '';
              canvas.style.maxHeight = '';
              canvas.style.objectFit = '';
              canvas.style.imageRendering = '';
              canvas.style.background = '';
              canvas.style.zIndex = '';
            }
          }).catch(err => {
            console.error('Failed to exit fullscreen:', err);
          });
        }
      }
    }

    // Fullscreen button click handler
    document.getElementById('fullscreen-btn').addEventListener('click', (e) => {
      e.preventDefault();
      toggleFullscreen();
    });

    // Listen for fullscreen changes (user pressing ESC or F11)
    // Handle all vendor-prefixed events
    document.addEventListener('fullscreenchange', () => {
      isFullscreen = !!document.fullscreenElement;
      socket.emit('fullscreen', { enabled: isFullscreen });
      console.log('Fullscreen changed:', isFullscreen);
    });
    document.addEventListener('webkitfullscreenchange', () => {
      isFullscreen = !!document.webkitFullscreenElement;
      socket.emit('fullscreen', { enabled: isFullscreen });
    });
    document.addEventListener('mozfullscreenchange', () => {
      isFullscreen = !!document.mozFullScreenElement;
      socket.emit('fullscreen', { enabled: isFullscreen });
    });
    document.addEventListener('msfullscreenchange', () => {
      isFullscreen = !!document.msFullscreenElement;
      socket.emit('fullscreen', { enabled: isFullscreen });
    });

    // Keyboard input handling
    document.addEventListener('keydown', (e) => {
      // F key toggles fullscreen (but not when typing in input fields)
      if ((e.key === 'f' || e.key === 'F') && !e.target.matches('input, textarea')) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // F11 always toggles fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Prevent default browser behavior for arrow keys, space, etc.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' ', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Init audio on first interaction (required by browsers)
      initAudio();
      
      // Send key to server
      socket.emit('keydown', { key: e.key });
    });
    
    // Paste handling
    document.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text');
      if (text) {
        console.log('Pasting text:', text);
        socket.emit('paste', { text });
      }
    });
    
    // Focus canvas to receive keyboard events
    canvas.focus();
    canvas.tabIndex = 0;

    // ===== AUDIO INPUT (Microphone) =====
    let audioInputContext = null;
    let audioInputAnalyser = null;
    let audioInputStream = null;
    let audioInputSource = null;
    let isCapturingAudio = false;
    let audioAnalysisInterval = null;

    // FFT configuration
    const fftSize = 2048;
    const numBands = 32;

    // For beat detection
    let beatHistory = [];
    let lastBeatTime = 0;
    const beatThreshold = 1.3;

    // For classification
    let energyHistory = [];
    let spectralHistory = [];
    const classificationWindow = 30;

    async function startAudioCapture() {
      if (isCapturingAudio) return;

      try {
        // Request microphone access
        audioInputStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        // Create audio context
        audioInputContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create analyser node
        audioInputAnalyser = audioInputContext.createAnalyser();
        audioInputAnalyser.fftSize = fftSize;
        audioInputAnalyser.smoothingTimeConstant = 0.8;

        // Connect microphone to analyser
        audioInputSource = audioInputContext.createMediaStreamSource(audioInputStream);
        audioInputSource.connect(audioInputAnalyser);

        isCapturingAudio = true;
        socket.emit('audio:started');
        console.log('[AudioInput] Started microphone capture');

        // Start analysis loop
        startAudioAnalysis();
      } catch (err) {
        console.error('[AudioInput] Failed to start:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          socket.emit('audio:denied');
        } else {
          socket.emit('audio:error', { message: err.message });
        }
      }
    }

    function stopAudioCapture() {
      if (!isCapturingAudio) return;

      // Stop analysis
      if (audioAnalysisInterval) {
        clearInterval(audioAnalysisInterval);
        audioAnalysisInterval = null;
      }

      // Stop tracks
      if (audioInputStream) {
        audioInputStream.getTracks().forEach(track => track.stop());
        audioInputStream = null;
      }

      // Disconnect source
      if (audioInputSource) {
        audioInputSource.disconnect();
        audioInputSource = null;
      }

      // Close context
      if (audioInputContext && audioInputContext.state !== 'closed') {
        audioInputContext.close();
        audioInputContext = null;
      }

      audioInputAnalyser = null;
      isCapturingAudio = false;
      socket.emit('audio:stopped');
      console.log('[AudioInput] Stopped microphone capture');
    }

    function startAudioAnalysis() {
      if (!audioInputAnalyser) return;

      const frequencyData = new Float32Array(audioInputAnalyser.frequencyBinCount);
      const timeDomainData = new Float32Array(audioInputAnalyser.fftSize);

      // Run analysis at 60fps
      audioAnalysisInterval = setInterval(() => {
        if (!audioInputAnalyser || !isCapturingAudio) return;

        // Get frequency data
        audioInputAnalyser.getFloatFrequencyData(frequencyData);
        audioInputAnalyser.getFloatTimeDomainData(timeDomainData);

        // Calculate spectrum bands
        const spectrum = calculateSpectrum(frequencyData);

        // Calculate levels
        const levels = calculateLevels(timeDomainData);

        // Calculate waveform (downsample to 128 samples)
        const waveform = calculateWaveform(timeDomainData);

        // Classify audio and detect beats
        const classification = classifyAudio(spectrum, levels);

        // Send analysis to server
        socket.emit('audio:analysis', {
          spectrum,
          levels,
          waveform,
          classification,
        });

        // Check for beat
        if (classification.hasBeat) {
          socket.emit('audio:beat', {
            tempo: classification.tempo,
            confidence: classification.confidence,
          });
        }
      }, 1000 / 60);
    }

    function calculateSpectrum(frequencyData) {
      const bands = new Array(numBands).fill(0);
      const binCount = frequencyData.length;
      const binsPerBand = Math.floor(binCount / numBands);

      // Use logarithmic frequency distribution for more musical bands
      for (let i = 0; i < numBands; i++) {
        // Calculate frequency range for this band (logarithmic)
        const lowFreq = 20 * Math.pow(1000, i / numBands);
        const highFreq = 20 * Math.pow(1000, (i + 1) / numBands);
        
        const sampleRate = audioInputContext.sampleRate;
        const lowBin = Math.floor((lowFreq / sampleRate) * fftSize);
        const highBin = Math.floor((highFreq / sampleRate) * fftSize);

        let sum = 0;
        let count = 0;
        for (let j = lowBin; j <= highBin && j < binCount; j++) {
          // Convert from dB to linear (0-1)
          const db = frequencyData[j];
          const linear = Math.pow(10, db / 20);
          sum += linear;
          count++;
        }

        bands[i] = count > 0 ? Math.min(1, sum / count * 5) : 0;
      }

      // Calculate bass/mid/treble for classification
      const bassEnergy = bands.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
      const midEnergy = bands.slice(4, 16).reduce((a, b) => a + b, 0) / 12;
      const trebleEnergy = bands.slice(16, 32).reduce((a, b) => a + b, 0) / 16;

      return {
        bands,
        bassEnergy,
        midEnergy,
        trebleEnergy,
      };
    }

    function calculateLevels(timeDomainData) {
      // Calculate RMS
      let sumSquares = 0;
      let peak = 0;

      for (let i = 0; i < timeDomainData.length; i++) {
        const sample = timeDomainData[i];
        sumSquares += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }

      const rms = Math.sqrt(sumSquares / timeDomainData.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;

      return {
        rms: Math.min(1, rms * 5), // Normalize to 0-1 range
        peak: Math.min(1, peak),
        db: Math.max(-60, db), // Clamp to reasonable range
      };
    }

    function calculateWaveform(timeDomainData) {
      const numSamples = 128;
      const step = Math.floor(timeDomainData.length / numSamples);
      const samples = new Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        samples[i] = timeDomainData[i * step];
      }

      return { samples };
    }

    function classifyAudio(spectrum, levels) {
      // Update energy history
      const totalEnergy = levels.rms;
      energyHistory.push(totalEnergy);
      if (energyHistory.length > classificationWindow) {
        energyHistory.shift();
      }

      // Update spectral history
      spectralHistory.push([spectrum.bassEnergy, spectrum.midEnergy, spectrum.trebleEnergy]);
      if (spectralHistory.length > classificationWindow) {
        spectralHistory.shift();
      }

      // Calculate average energy
      const avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;

      // Beat detection
      let hasBeat = false;
      let tempo = 0;
      const now = Date.now();

      if (spectrum.bassEnergy > avgEnergy * beatThreshold && now - lastBeatTime > 200) {
        hasBeat = true;
        
        // Calculate tempo from beat intervals
        const beatInterval = now - lastBeatTime;
        if (beatInterval > 0 && beatInterval < 2000) {
          tempo = Math.round(60000 / beatInterval);
          tempo = Math.max(60, Math.min(200, tempo)); // Clamp to reasonable BPM
        }

        beatHistory.push(beatInterval);
        if (beatHistory.length > 8) beatHistory.shift();

        lastBeatTime = now;
      }

      // Classify audio type
      let type = 'silence';
      let confidence = 0;

      if (levels.db < -50) {
        type = 'silence';
        confidence = 1;
      } else if (spectralHistory.length >= 10) {
        // Calculate spectral variance
        const bassVariance = calculateVariance(spectralHistory.map(s => s[0]));
        const midVariance = calculateVariance(spectralHistory.map(s => s[1]));

        // Music: high bass variance, rhythmic patterns
        if (bassVariance > 0.02 && beatHistory.length >= 3) {
          type = 'music';
          confidence = Math.min(1, bassVariance * 10);
        }
        // Speech: high mid-range, lower bass
        else if (spectrum.midEnergy > spectrum.bassEnergy * 1.2 && midVariance > 0.01) {
          type = 'speech';
          confidence = Math.min(1, midVariance * 20);
        }
        // Noise: random distribution
        else if (levels.rms > 0.1) {
          type = 'noise';
          confidence = 0.5;
        }
      }

      return {
        type,
        confidence,
        hasBeat,
        tempo: tempo || undefined,
      };
    }

    function calculateVariance(arr) {
      if (arr.length === 0) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    }

    // Listen for server requests to start/stop audio
    socket.on('audio:request-start', () => {
      console.log('[AudioInput] Server requested start');
      startAudioCapture();
    });

    socket.on('audio:request-stop', () => {
      console.log('[AudioInput] Server requested stop');
      stopAudioCapture();
    });
  </script>
</body>
</html>
    `.trim();
  }
}
