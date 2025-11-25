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
    
    #container {
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
      background: #000;
      padding: 10px;
    }
    
    canvas {
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      transition: opacity 0.3s ease;
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
    
    // Keyboard input handling
    document.addEventListener('keydown', (e) => {
      // Prevent default browser behavior for arrow keys, space, etc.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' ', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Send key to server
      socket.emit('keydown', { key: e.key });
    });
    
    // Focus canvas to receive keyboard events
    canvas.focus();
    canvas.tabIndex = 0;
  </script>
</body>
</html>
    `.trim();
  }
}
