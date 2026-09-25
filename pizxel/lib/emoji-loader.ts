/**
 * Emoji Sprite Sheet Loader for PiZXel
 *
 * Loads and extracts emojis from the bundled sprite sheet for efficient
 * offline icon support.
 */

import { createCanvas, loadImage, Image as CanvasImage } from "canvas";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { isNetworkAllowed } from "../core/network";
import { DisplayBuffer } from "../core/display-buffer";

interface EmojiMetadata {
  version: string;
  emoji_size: number;
  columns: number;
  rows: number;
  total_emojis: number;
  emojis: {
    [emoji: string]: {
      codepoint: string;
      row: number;
      col: number;
      x: number;
      y: number;
    };
  };
}

interface EmojiImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA pixel data
}

export class EmojiLoader {
  private spritesheetPath: string;
  private metadataPath: string;
  private spritesheet: CanvasImage | null = null;
  private metadata: EmojiMetadata | null = null;
  private cache: Map<string, EmojiImageData> = new Map();

  constructor(spritesheetPath?: string, metadataPath?: string) {
    // Default paths relative to this file
    const baseDir = __dirname;

    this.spritesheetPath =
      spritesheetPath || path.join(baseDir, "emoji_spritesheet.png");
    this.metadataPath =
      metadataPath || path.join(baseDir, "emoji_spritesheet.json");
  }

  /**
   * Load sprite sheet image (lazy)
   */
  private async loadSpritesheet(): Promise<CanvasImage> {
    if (this.spritesheet === null) {
      if (!fs.existsSync(this.spritesheetPath)) {
        throw new Error(`Sprite sheet not found: ${this.spritesheetPath}`);
      }
      this.spritesheet = await loadImage(this.spritesheetPath);
    }
    return this.spritesheet;
  }

  /**
   * Load metadata JSON (lazy)
   */
  private loadMetadata(): EmojiMetadata {
    if (this.metadata === null) {
      if (!fs.existsSync(this.metadataPath)) {
        throw new Error(`Metadata not found: ${this.metadataPath}`);
      }
      const data = fs.readFileSync(this.metadataPath, "utf-8");
      this.metadata = JSON.parse(data);
    }
    return this.metadata!;
  }

  /**
   * Get codepoint string for Twemoji CDN URL
   */
  private getEmojiCodepoint(emoji: string): string {
    const codePoints: string[] = [];
    for (let i = 0; i < emoji.length; i++) {
      const code = emoji.codePointAt(i);
      if (code !== undefined) {
        // Skip variation selectors (U+FE00 to U+FE0F)
        if (code >= 0xfe00 && code <= 0xfe0f) {
          if (code > 0xffff) i++; // Skip low surrogate
          continue;
        }
        codePoints.push(code.toString(16));
        // Skip low surrogate if this was a high surrogate
        if (code > 0xffff) i++;
      }
    }
    return codePoints.join("-");
  }

  /**
   * Fetch emoji image from Twemoji CDN
   */
  private async fetchEmojiFromCDN(emoji: string): Promise<CanvasImage | null> {
    if (!isNetworkAllowed()) {
      return null;
    }

    try {
      const codepoint = this.getEmojiCodepoint(emoji);
      // Fetch 72×72 PNG from CDN (we'll scale it to 32×32 for caching)
      const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${codepoint}.png`;

      console.log(`[EmojiLoader] Fetching ${emoji} from CDN: ${url}`);

      return await new Promise<CanvasImage>((resolve, reject) => {
        https
          .get(url, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`CDN returned ${response.statusCode}`));
              return;
            }

            const chunks: Buffer[] = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", async () => {
              try {
                const buffer = Buffer.concat(chunks);
                const image = await loadImage(buffer);
                resolve(image);
              } catch (err) {
                reject(err);
              }
            });
          })
          .on("error", reject);
      });
    } catch (err) {
      console.warn(`[EmojiLoader] Failed to fetch ${emoji} from CDN:`, err);
      return null;
    }
  }

  /**
   * Dynamically render an emoji using canvas (for emojis not in spritesheet)
   */
  private async renderEmojiDynamically(
    emoji: string
  ): Promise<EmojiImageData | null> {
    try {
      const size = 32; // Render at 32px to match spritesheet size

      // Try fetching from Twemoji CDN first (proper color emoji)
      const cdnImage = await this.fetchEmojiFromCDN(emoji);

      if (cdnImage) {
        // Successfully got color emoji from CDN
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, size, size);

        // Draw the emoji image, scaling to fit if needed
        const scale = Math.min(size / cdnImage.width, size / cdnImage.height);
        const w = cdnImage.width * scale;
        const h = cdnImage.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(cdnImage, x, y, w, h);

        const imageData = ctx.getImageData(0, 0, size, size);
        const emojiImageData: EmojiImageData = {
          width: size,
          height: size,
          data: imageData.data,
        };

        this.cache.set(emoji, emojiImageData);
        console.log(`[EmojiLoader] Successfully rendered ${emoji} from CDN`);
        return emojiImageData;
      }

      // Fallback: Render with canvas text (grayscale only)
      console.log(
        `[EmojiLoader] CDN failed, falling back to canvas rendering for ${emoji}`
      );
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext("2d");

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Set font and render emoji
      ctx.font = `${size}px Arial, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, size / 2, size / 2);

      // Get image data
      const imageData = ctx.getImageData(0, 0, size, size);

      // Node.js canvas renders emoji as grayscale - colorize based on emoji
      // Newspaper emoji: white/beige paper with black text
      const colorMap: Record<
        string,
        { light: [number, number, number]; dark: [number, number, number] }
      > = {
        "🗞️": { light: [240, 235, 220], dark: [20, 20, 20] }, // Beige paper, black text
        "🗞": { light: [240, 235, 220], dark: [20, 20, 20] }, // Alt encoding
      };

      const colors = colorMap[emoji] || {
        light: [200, 200, 200],
        dark: [50, 50, 50],
      };

      // Convert grayscale to colored version
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];

        // Skip transparent pixels
        if (a < 10) continue;

        // Grayscale value (all RGB should be same from canvas)
        const gray = r;

        // Map dark grays to dark color, light grays to light color
        if (gray < 128) {
          // Dark pixel - use dark color
          const intensity = gray / 128;
          imageData.data[i] = colors.dark[0] * intensity;
          imageData.data[i + 1] = colors.dark[1] * intensity;
          imageData.data[i + 2] = colors.dark[2] * intensity;
        } else {
          // Light pixel - use light color
          const intensity = (gray - 128) / 127;
          imageData.data[i] =
            colors.light[0] * intensity + colors.dark[0] * (1 - intensity);
          imageData.data[i + 1] =
            colors.light[1] * intensity + colors.dark[1] * (1 - intensity);
          imageData.data[i + 2] =
            colors.light[2] * intensity + colors.dark[2] * (1 - intensity);
        }
      }

      // Cache and return
      const emojiImageData: EmojiImageData = {
        width: size,
        height: size,
        data: imageData.data,
      };

      this.cache.set(emoji, emojiImageData);
      console.log(
        `[EmojiLoader] Successfully rendered ${emoji} dynamically with colorization`
      );
      return emojiImageData;
    } catch (err) {
      console.error(
        `[EmojiLoader] Failed to render ${emoji} dynamically:`,
        err
      );
      return null;
    }
  }

  /**
   * Check if emoji is available in sprite sheet
   */
  hasEmoji(emoji: string): boolean {
    const metadata = this.loadMetadata();
    return emoji in metadata.emojis;
  }

  /**
   * Extract emoji image from sprite sheet
   */
  async getEmojiImage(emoji: string): Promise<EmojiImageData | null> {
    // Check cache first
    if (this.cache.has(emoji)) {
      return this.cache.get(emoji)!;
    }

    // Load metadata
    const metadata = this.loadMetadata();
    if (!(emoji in metadata.emojis)) {
      console.warn(
        `[EmojiLoader] Emoji ${emoji} not found in metadata, attempting to render dynamically...`
      );
      // Try dynamic rendering for missing emojis
      return await this.renderEmojiDynamically(emoji);
    }

    // Get position
    const emojiData = metadata.emojis[emoji];
    const x = emojiData.x;
    const y = emojiData.y;
    const size = metadata.emoji_size;

    // Load spritesheet
    const spritesheet = await this.loadSpritesheet();

    // Extract emoji using canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Draw the emoji portion from spritesheet
    ctx.drawImage(
      spritesheet,
      x,
      y,
      size,
      size, // Source rect
      0,
      0,
      size,
      size // Dest rect
    );

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, size, size);

    const result: EmojiImageData = {
      width: size,
      height: size,
      data: imageData.data,
    };

    // Cache it
    this.cache.set(emoji, result);

    return result;
  }

  /**
   * Render emoji to display buffer at specified position (SYNC - uses cache only)
   * Returns true if emoji was rendered, false if not in cache
   */
  renderToBufferSync(
    emoji: string,
    buffer: DisplayBuffer,
    x: number,
    y: number,
    targetSize?: number
  ): boolean {
    // Only render if in cache
    if (!this.cache.has(emoji)) {
      return false;
    }

    const emojiImage = this.cache.get(emoji)!;
    const size = targetSize || emojiImage.width;
    const scale = size / emojiImage.width;

    // Render emoji pixels to buffer
    for (let py = 0; py < emojiImage.height; py++) {
      for (let px = 0; px < emojiImage.width; px++) {
        const idx = (py * emojiImage.width + px) * 4;
        const r = emojiImage.data[idx];
        const g = emojiImage.data[idx + 1];
        const b = emojiImage.data[idx + 2];
        const a = emojiImage.data[idx + 3];

        // Skip transparent pixels
        if (a < 128) {
          continue;
        }

        // Don't skip dark pixels - they're part of the emoji content!
        // (The newspaper emoji 🗞️ has black text that needs to render)

        // Calculate scaled position
        if (scale === 1) {
          // No scaling
          buffer.setPixel(x + px, y + py, [r, g, b]);
        } else {
          // Simple nearest-neighbor scaling
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const targetX = x + Math.floor(px * scale) + sx;
              const targetY = y + Math.floor(py * scale) + sy;
              buffer.setPixel(targetX, targetY, [r, g, b]);
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Render emoji to display buffer at specified position (ASYNC)
   */
  async renderToBuffer(
    emoji: string,
    buffer: DisplayBuffer,
    x: number,
    y: number,
    targetSize?: number
  ): Promise<boolean> {
    const emojiImage = await this.getEmojiImage(emoji);
    if (!emojiImage) {
      return false;
    }

    const size = targetSize || emojiImage.width;
    const scale = size / emojiImage.width;

    // Render emoji pixels to buffer
    for (let py = 0; py < emojiImage.height; py++) {
      for (let px = 0; px < emojiImage.width; px++) {
        const idx = (py * emojiImage.width + px) * 4;
        const r = emojiImage.data[idx];
        const g = emojiImage.data[idx + 1];
        const b = emojiImage.data[idx + 2];
        const a = emojiImage.data[idx + 3];

        // Skip transparent pixels
        if (a < 128) {
          continue;
        }

        // Don't skip dark pixels - they're part of the emoji content!
        // (The newspaper emoji 🗞️ has black text that needs to render)

        // Calculate scaled position
        if (scale === 1) {
          // No scaling
          buffer.setPixel(x + px, y + py, [r, g, b]);
        } else {
          // Simple nearest-neighbor scaling
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const targetX = x + Math.floor(px * scale) + sx;
              const targetY = y + Math.floor(py * scale) + sy;
              buffer.setPixel(targetX, targetY, [r, g, b]);
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * List all available emojis
   */
  listAvailableEmojis(limit?: number): string[] {
    const metadata = this.loadMetadata();
    const emojis = Object.keys(metadata.emojis);

    if (limit) {
      return emojis.slice(0, limit);
    }
    return emojis;
  }

  /**
   * Get total number of emojis available
   */
  getEmojiCount(): number {
    const metadata = this.loadMetadata();
    return metadata.total_emojis;
  }

  /**
   * Get metadata (public accessor)
   */
  getMetadata(): EmojiMetadata {
    return this.loadMetadata();
  }
}

// Singleton instance
let _emojiLoader: EmojiLoader | null = null;

/**
 * Get shared emoji loader instance
 */
export function getEmojiLoader(): EmojiLoader {
  if (_emojiLoader === null) {
    _emojiLoader = new EmojiLoader();
  }
  return _emojiLoader;
}
