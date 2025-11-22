"""
Emoji Sprite Sheet Loader for MatrixOS

Loads and extracts emojis from the bundled sprite sheet for efficient
offline icon support. Can also download emojis on-demand if enabled.
"""

import os
import json
import urllib.request
import io
from pathlib import Path
from PIL import Image


class EmojiLoader:
    """Loads emojis from sprite sheet."""
    
    def __init__(self, spritesheet_path=None, metadata_path=None):
        """Initialize emoji loader.
        
        Args:
            spritesheet_path: Path to sprite sheet PNG (default: matrixos/emoji_spritesheet.png)
            metadata_path: Path to metadata JSON (default: matrixos/emoji_spritesheet.json)
        """
        # Default paths relative to this file
        if spritesheet_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            spritesheet_path = os.path.join(base_dir, 'emoji_spritesheet.png')
        
        if metadata_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            metadata_path = os.path.join(base_dir, 'emoji_spritesheet.json')
        
        self.spritesheet_path = spritesheet_path
        self.metadata_path = metadata_path
        
        # Lazy load
        self._spritesheet = None
        self._metadata = None
        self._cache = {}  # Cache extracted emoji images
    
    def _load_spritesheet(self):
        """Load sprite sheet image (lazy)."""
        if self._spritesheet is None:
            if not os.path.exists(self.spritesheet_path):
                raise FileNotFoundError(f"Sprite sheet not found: {self.spritesheet_path}")
            self._spritesheet = Image.open(self.spritesheet_path)
        return self._spritesheet
    
    def _load_metadata(self):
        """Load metadata JSON (lazy)."""
        if self._metadata is None:
            if not os.path.exists(self.metadata_path):
                raise FileNotFoundError(f"Metadata not found: {self.metadata_path}")
            with open(self.metadata_path, 'r') as f:
                self._metadata = json.load(f)
        return self._metadata
    
    def has_emoji(self, emoji):
        """Check if emoji is available in sprite sheet.
        
        Args:
            emoji: Emoji character (e.g., "🕹️")
            
        Returns:
            True if emoji is in sprite sheet
        """
        metadata = self._load_metadata()
        return emoji in metadata['emojis']
    
    def get_emoji_image(self, emoji):
        """Extract emoji image from sprite sheet.
        
        Args:
            emoji: Emoji character (e.g., "🕹️")
            
        Returns:
            PIL Image object (32×32 RGBA), or None if not found
        """
        # Check cache first
        if emoji in self._cache:
            return self._cache[emoji]
        
        # Load metadata
        metadata = self._load_metadata()
        if emoji not in metadata['emojis']:
            return None
        
        # Get position
        emoji_data = metadata['emojis'][emoji]
        x = emoji_data['x']
        y = emoji_data['y']
        size = metadata['emoji_size']
        
        # Extract from sprite sheet
        spritesheet = self._load_spritesheet()
        emoji_img = spritesheet.crop((x, y, x + size, y + size))
        
        # Cache it
        self._cache[emoji] = emoji_img
        
        return emoji_img
    
    def emoji_to_icon_json(self, emoji, size=32):
        """Convert emoji to MatrixOS icon JSON format.
        
        Args:
            emoji: Emoji character (e.g., "🕹️")
            size: Target size (will resize if needed)
            
        Returns:
            Icon data dict with 'width', 'height', 'data' keys, or None if not found
        """
        img = self.get_emoji_image(emoji)
        if img is None:
            return None
        
        # Resize if needed
        if size != 32:
            img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Convert to RGB565 format for MatrixOS
        pixels = []
        for y in range(size):
            for x in range(size):
                r, g, b, a = img.getpixel((x, y))
                
                # Skip transparent pixels
                if a < 128:
                    continue
                
                # Skip black pixels (background/anti-aliasing artifacts)
                if r < 30 and g < 30 and b < 30:
                    continue
                
                # Convert to RGB565
                r5 = (r >> 3) & 0x1F
                g6 = (g >> 2) & 0x3F
                b5 = (b >> 3) & 0x1F
                rgb565 = (r5 << 11) | (g6 << 5) | b5
                
                pixels.append({
                    'x': x,
                    'y': y,
                    'c': rgb565
                })
        
        return {
            'width': size,
            'height': size,
            'data': pixels
        }
    
    def list_available_emojis(self, limit=None):
        """List all available emojis.
        
        Args:
            limit: Maximum number to return (None = all)
            
        Returns:
            List of emoji characters
        """
        metadata = self._load_metadata()
        emojis = list(metadata['emojis'].keys())
        
        if limit:
            return emojis[:limit]
        return emojis
    
    def download_emoji_on_demand(self, emoji, size=32):
        """Download emoji from Noto Emoji GitHub on-demand.
        
        Args:
            emoji: Emoji character to download
            size: Target size (default 32)
            
        Returns:
            PIL Image object or None if download failed
        """
        # Convert emoji to codepoint
        codepoint = self._emoji_to_codepoint(emoji)
        if not codepoint:
            return None
        
        # Download from Noto Emoji repository
        url = f"https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/{size}/emoji_u{codepoint}.png"
        
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                img_data = response.read()
                img = Image.open(io.BytesIO(img_data))
                
                # Cache it
                self._cache[emoji] = img
                
                # Optionally save to cache directory
                self._save_to_cache(emoji, img, size)
                
                return img
        except Exception as e:
            print(f"Failed to download emoji '{emoji}': {e}")
            return None
    
    def _emoji_to_codepoint(self, emoji):
        """Convert emoji character to codepoint string.
        
        Args:
            emoji: Emoji character
            
        Returns:
            Codepoint string like "1f579" or None
        """
        try:
            # Handle multi-codepoint emojis (like flags, skin tones, etc.)
            codepoints = [f"{ord(c):04x}" for c in emoji]
            return "_".join(codepoints)
        except:
            return None
    
    def _save_to_cache(self, emoji, img, size):
        """Save downloaded emoji to cache directory.
        
        Args:
            emoji: Emoji character
            img: PIL Image object
            size: Image size
        """
        try:
            # Get cache directory from system config
            try:
                from matrixos.system_config_loader import get_emoji_cache_dir
                cache_dir = get_emoji_cache_dir()
            except:
                # Fallback if system config not available
                cache_dir = Path.home() / ".matrixos" / "emoji_cache"
            
            cache_dir.mkdir(parents=True, exist_ok=True)
            
            codepoint = self._emoji_to_codepoint(emoji)
            cache_file = cache_dir / f"emoji_{codepoint}_{size}.png"
            
            img.save(cache_file, "PNG")
        except Exception as e:
            # Silent fail - caching is optional
            pass
    
    def get_emoji_with_fallback(self, emoji, size=32, allow_download=True):
        """Get emoji image with fallback to download if not in sprite sheet.
        
        Args:
            emoji: Emoji character
            size: Target size
            allow_download: Whether to download if not found (checks system config)
            
        Returns:
            PIL Image object or None
        """
        # Try sprite sheet first
        img = self.get_emoji_image(emoji)
        if img and size != 32:
            img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        if img:
            return img
        
        # Not in sprite sheet - check if downloads enabled
        if not allow_download:
            return None
        
        try:
            from matrixos.system_config_loader import is_emoji_download_enabled
            if not is_emoji_download_enabled():
                return None
        except:
            # If system config not available, don't download
            return None
        
        # Try to download
        return self.download_emoji_on_demand(emoji, size)
    
    def get_info(self):
        """Get sprite sheet info.
        
        Returns:
            Dict with version, size, total_emojis, etc.
        """
        metadata = self._load_metadata()
        return {
            'version': metadata.get('version', 'unknown'),
            'emoji_size': metadata.get('emoji_size', 32),
            'columns': metadata.get('columns', 0),
            'rows': metadata.get('rows', 0),
            'total_emojis': metadata.get('total_emojis', 0),
            'available_emojis': len(metadata.get('emojis', {}))
        }


# Global singleton instance
_loader = None

def get_emoji_loader():
    """Get global emoji loader instance."""
    global _loader
    if _loader is None:
        _loader = EmojiLoader()
    return _loader


if __name__ == '__main__':
    # Test the loader
    loader = EmojiLoader()
    
    print("="*60)
    print("Emoji Sprite Sheet Loader Test")
    print("="*60)
    
    info = loader.get_info()
    print(f"Version: {info['version']}")
    print(f"Emoji size: {info['emoji_size']}×{info['emoji_size']}")
    print(f"Grid: {info['columns']}×{info['rows']}")
    print(f"Total emojis: {info['available_emojis']}")
    
    # Test a few emojis
    test_emojis = ['🕹️', '🎮', '👾', '🐍', '🧱', '🏓', '😂', '❤️', '☀️', '⏰']
    
    print("\nTesting emoji extraction:")
    for emoji in test_emojis:
        if loader.has_emoji(emoji):
            img = loader.get_emoji_image(emoji)
            icon = loader.emoji_to_icon_json(emoji)
            print(f"  ✅ {emoji} - {img.size if img else 'N/A'} - {len(icon['data']) if icon else 0} pixels")
        else:
            print(f"  ❌ {emoji} - not found")
    
    print("\nFirst 20 emojis:")
    first_20 = loader.list_available_emojis(limit=20)
    print("  " + " ".join(first_20))
    
    print("\n✨ Emoji loader working!")
