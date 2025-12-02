# PiZXel Music Recognition System

A hybrid music recognition system for PiZXel that combines open-source and commercial APIs to provide ambient music detection and dedicated music identification with retro-styled visualizations.

## 1. Overview

This system provides two modes of operation:
- **Background/Ambient Mode**: Passive music detection for picture frames, widgets, and screensavers using free open-source APIs
- **Dedicated Music App**: Active music identification with aggressive matching, manual lookup, and full-screen visualizations using hybrid API approach

## 2. Architecture

### 2.1 Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Audio Input Layer                        │
│                  (Microphone Capture)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Audio Analysis Engine                      │
│  • Spectral Analysis    • Beat Detection                    │
│  • Change Detection     • Music/Speech Classification        │
│  • Silence Detection    • Energy Monitoring                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Fingerprinting Engine                       │
│                    (Chromaprint)                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Manager                               │
│  ┌──────────────┐              ┌──────────────┐            │
│  │  AcoustID    │              │  ACRCloud    │            │
│  │  (Primary)   │──fallback──► │  (Premium)   │            │
│  │  Free        │              │  Paid        │            │
│  └──────────────┘              └──────────────┘            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Results Cache                              │
│  • Last identified track  • Confidence scores                │
│  • Album art cache        • History log                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Display Layer                               │
│  • Picture Frame Mode   • Widget Mode                        │
│  • Dedicated App        • Screensaver                        │
│  • Visualizer Engine                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Shared Components

All components are designed for reuse across both modes:

1. **Audio Capture Module** (`audio_input.py`)
   - USB microphone interface
   - Audio buffer management
   - Sample rate conversion
   - Noise gate

2. **Audio Analysis Engine** (`audio_analysis.py`)
   - FFT-based spectral analysis
   - Music vs. non-music classification
   - Change detection algorithms
   - Beat detection
   - Silence detection

3. **Fingerprinting Engine** (`fingerprint.py`)
   - Chromaprint wrapper
   - Fingerprint generation
   - Duration optimization

4. **API Manager** (`api_manager.py`)
   - Unified interface for both APIs
   - Automatic fallback logic
   - Rate limiting
   - Error handling
   - Response caching

5. **Display Engine** (`display.py`)
   - Album art rendering
   - Pixelation effects
   - ZX Spectrum color palette
   - Text rendering
   - Transition effects

6. **Visualizer Engine** (`visualizer.py`)
   - Multiple visualization modes
   - Real-time audio reactive graphics
   - Retro pixel effects

## 3. Background/Ambient Mode

### 3.1 Operation

Runs as a background service for passive music detection in:
- Picture frame displays
- Home screen widgets
- Screensavers
- Always-on displays

### 3.2 Behavior

- **Polling Interval**: 15-20 seconds
- **API Usage**: AcoustID only (free)
- **Detection Strategy**:
  1. Monitor audio levels for music presence
  2. Detect spectral changes indicating new songs
  3. Generate fingerprint when change detected
  4. Query AcoustID
  5. Display results if confident match
  6. Continue silently if no match

### 3.3 Display Integration

When music is identified:
1. Smooth transition to "now playing" display
2. Show pixelated album art (64x64 or 128x128)
3. Display track name, artist, album
4. Hold for 30-60 seconds
5. Fade back to normal content
6. Cache result to avoid re-querying same song

### 3.4 Resource Usage

- Minimal CPU usage (< 5% average)
- Low memory footprint (< 50MB)
- No cost (free API only)
- Automatic throttling if API limits approached

## 4. Dedicated Music App

### 4.1 Operation

Full-screen application for active music identification:
- Always-visible display
- Real-time updates
- Manual controls
- Higher accuracy
- Full music visualizations

### 4.2 Behavior

- **Polling Interval**: 10 seconds (aggressive)
- **API Usage**: Hybrid (AcoustID → ACRCloud fallback)
- **Detection Strategy**:
  1. Continuous monitoring
  2. Immediate fingerprinting on change
  3. Try AcoustID first
  4. If low confidence (< 0.7) or no match, try ACRCloud
  5. Display best result with confidence score
  6. Allow manual "Lookup Now" button

### 4.3 UI Features

#### Main Screen
- Large album art display (pixelated, retro-styled)
- Track information (title, artist, album, year)
- Confidence indicator
- Audio level meter
- "Listening..." / "Identified" status
- Visualization options

#### Controls
- **Lookup Now**: Force immediate identification
- **Next Viz**: Cycle through visualizer modes
- **History**: Show recently identified tracks
- **Settings**: Configure sensitivity, API preferences
- **Info**: Show current audio levels and detection status

#### Visualizer Mode
- Full-screen audio visualization
- Track info overlay (when identified)
- Multiple visualization styles
- Reactive to audio in real-time

### 4.4 Fallback Logic

```python
def identify_track(audio_fingerprint):
    # Try primary (free) API first
    result = acoustid_lookup(audio_fingerprint)
    
    if result.confidence > 0.7:
        return result
    
    # Low confidence or no match - try premium API
    if user_has_acrcloud_credits():
        result = acrcloud_lookup(audio_fingerprint)
        return result
    
    return result  # Return best available
```

## 5. API Integration Details

### 5.1 AcoustID (Primary)

**Endpoint**: `https://api.acoustid.org/v2/lookup`

**Request**:
```python
{
    'client': 'YOUR_API_KEY',
    'duration': duration_seconds,
    'fingerprint': chromaprint_fingerprint,
    'meta': 'recordings releasegroups compress'
}
```

**Response Parsing**:
```python
{
    'status': 'ok',
    'results': [
        {
            'score': 0.95,  # Confidence
            'recordings': [
                {
                    'title': 'Song Name',
                    'artists': [{'name': 'Artist Name'}],
                    'releasegroups': [
                        {
                            'title': 'Album Name',
                            'id': 'musicbrainz-id'
                        }
                    ]
                }
            ]
        }
    ]
}
```

**Album Art Retrieval**:
Use MusicBrainz Release Group ID:
```
https://coverartarchive.org/release-group/{mbid}/front-500
```

**Rate Limits**: ~3 requests/second, generous monthly limit for personal use

### 5.2 ACRCloud (Fallback)

**Endpoint**: `https://identify-{region}.acrcloud.com/v1/identify`

**Request**: 
- Requires HMAC signature authentication
- Send audio fingerprint or raw audio sample
- Supports multiple audio formats

**Response**:
```python
{
    'status': {
        'msg': 'Success',
        'code': 0
    },
    'metadata': {
        'music': [
            {
                'title': 'Song Name',
                'artists': [{'name': 'Artist Name'}],
                'album': {'name': 'Album Name'},
                'release_date': '2020-01-01',
                'external_metadata': {
                    'spotify': {'album': {'id': 'spotify-id'}},
                    'youtube': {'vid': 'youtube-id'}
                },
                'score': 100  # 0-100 confidence
            }
        ]
    }
}
```

**Album Art**: Directly included in response via Spotify/iTunes links

**Pricing**:
- Free: 2,000 recognitions/month
- Basic: $49/month for 20,000 recognitions
- Pro: $199/month for 100,000 recognitions

### 5.3 Unified Response Format

Internal format used throughout the system:

```python
class TrackInfo:
    title: str
    artist: str
    album: str
    year: int
    confidence: float  # 0.0 - 1.0
    album_art_url: str
    source: str  # 'acoustid' or 'acrcloud'
    musicbrainz_id: str
    timestamp: datetime
```

## 6. Audio Analysis Algorithms

### 6.1 Music vs. Non-Music Detection

Uses spectral features to classify audio:

```python
def is_music(audio_buffer):
    spectrum = fft(audio_buffer)
    
    # Calculate features
    spectral_centroid = calculate_centroid(spectrum)
    spectral_rolloff = calculate_rolloff(spectrum)
    zero_crossing_rate = calculate_zcr(audio_buffer)
    harmonic_ratio = calculate_harmonic_ratio(spectrum)
    
    # Music typically has:
    # - Higher harmonic ratio (> 0.3)
    # - More consistent spectral centroid
    # - Lower zero crossing rate than speech
    # - Presence of rhythm (beat detection)
    
    score = (harmonic_ratio * 0.4 + 
             rhythm_score * 0.3 + 
             spectral_consistency * 0.3)
    
    return score > 0.6  # Threshold
```

### 6.2 Change Detection

Detects when a new song starts:

```python
def detect_change(current_spectrum, previous_spectrum):
    # Compare spectral features
    spectral_distance = calculate_spectral_distance(
        current_spectrum, 
        previous_spectrum
    )
    
    # Detect onset (sudden energy increase)
    onset_strength = detect_onset(current_spectrum)
    
    # Detect tempo change
    tempo_change = detect_tempo_change(
        current_buffer,
        previous_buffer
    )
    
    # Combine signals
    change_score = (spectral_distance * 0.5 + 
                   onset_strength * 0.3 + 
                   tempo_change * 0.2)
    
    return change_score > CHANGE_THRESHOLD
```

### 6.3 Silence Detection

Avoids processing when no audio present:

```python
def is_silence(audio_buffer, threshold_db=-40):
    rms = calculate_rms(audio_buffer)
    db = 20 * log10(rms)
    return db < threshold_db
```

### 6.4 Beat Detection

For visualization synchronization:

```python
def detect_beat(audio_buffer, sample_rate):
    # Energy-based beat detection
    onset_envelope = calculate_onset_envelope(audio_buffer)
    peaks = find_peaks(onset_envelope, min_distance=min_beat_interval)
    
    # Filter for significant beats
    beats = [p for p in peaks if onset_envelope[p] > beat_threshold]
    
    return beats, calculate_tempo(beats, sample_rate)
```

## 7. Display Rendering

### 7.1 Pixelation Effect

Retro-style album art rendering:

```python
def pixelate_image(image, pixel_size=4):
    # Downscale
    small = image.resize(
        (image.width // pixel_size, image.height // pixel_size),
        resample=Image.NEAREST
    )
    
    # Upscale back
    pixelated = small.resize(
        (image.width, image.height),
        resample=Image.NEAREST
    )
    
    return pixelated
```

### 7.2 ZX Spectrum Color Palette

Classic 8-color palette with bright variants:

```python
ZX_PALETTE = {
    'black': (0, 0, 0),
    'blue': (0, 0, 215),
    'red': (215, 0, 0),
    'magenta': (215, 0, 215),
    'green': (0, 215, 0),
    'cyan': (0, 215, 215),
    'yellow': (215, 215, 0),
    'white': (215, 215, 215),
    # Bright variants
    'bright_blue': (0, 0, 255),
    'bright_red': (255, 0, 0),
    # ... etc
}

def apply_zx_palette(image):
    # Quantize image to ZX Spectrum palette
    palette_image = Image.new('P', (1, 1))
    palette_image.putpalette([c for rgb in ZX_PALETTE.values() for c in rgb])
    return image.quantize(palette=palette_image)
```

### 7.3 Transition Effects

Smooth animations between states:

- Fade in/out
- Slide transitions
- Pixelation animation (gradually increase pixel size)
- CRT scan effect
- Color cycling

## 8. Configuration

### 8.1 System Config

```yaml
# config.yaml

audio:
  device: "default"  # or specific USB device
  sample_rate: 44100
  buffer_size: 2048
  channels: 1  # mono
  
analysis:
  polling_interval_bg: 15  # seconds (background mode)
  polling_interval_app: 10  # seconds (app mode)
  change_threshold: 0.7
  silence_threshold_db: -40
  music_classification_threshold: 0.6
  
fingerprinting:
  duration: 12  # seconds to fingerprint
  
apis:
  acoustid:
    api_key: "YOUR_ACOUSTID_KEY"
    enabled: true
    
  acrcloud:
    access_key: "YOUR_ACRCLOUD_ACCESS_KEY"
    access_secret: "YOUR_ACRCLOUD_SECRET"
    host: "identify-eu-west-1.acrcloud.com"
    enabled: true
    use_as_fallback: true
    confidence_threshold: 0.7  # When to fallback
    
display:
  album_art_size: 128  # pixels
  pixel_size: 4  # pixelation factor
  use_zx_palette: true
  transition_duration: 1.0  # seconds
  info_display_duration: 45  # seconds
  
cache:
  max_album_art: 50  # cached images
  history_length: 100  # tracks
  duplicate_window: 300  # seconds (don't re-identify same song)
  
visualizer:
  default_mode: "spectrum"
  fps_target: 30
  sensitivity: 0.8
```

### 8.2 Per-Mode Settings

```python
# Background/Ambient Mode
background_mode = {
    'api_priority': ['acoustid'],  # Only free API
    'polling_interval': 15,
    'display_duration': 45,
    'aggressive_matching': False
}

# Dedicated App Mode
app_mode = {
    'api_priority': ['acoustid', 'acrcloud'],  # Both APIs
    'polling_interval': 10,
    'display_duration': None,  # Always on
    'aggressive_matching': True,
    'show_confidence': True,
    'enable_manual_lookup': True
}
```

## 9. Music Visualizer

A full-screen music visualizer with multiple retro-styled pixel visualization modes that react to the audio in real-time.

### 9.1 Visualization Modes

#### Spectrum Analyzer
Classic frequency spectrum display with retro styling:
- Vertical bars representing frequency bands (16-32 bands)
- ZX Spectrum color cycling through the bars
- Peak hold indicators at top of each bar
- Smoothed animation for retro feel
- Optional mirror mode (mirrored vertically)

#### Waveform Oscilloscope
Retro oscilloscope-style waveform display:
- Scrolling waveform from right to left
- Classic green/amber CRT styling option
- Multiple waveform layers with slight offsets
- Adjustable time window (0.5-2 seconds)
- Scanline effect for authentic retro feel

#### VU Meters
Classic analog VU meter style:
- Large left/right channel meters
- Needle-style animation with smooth physics
- Peak indicators with decay
- Retro dial backgrounds
- Color zones (green/yellow/red)

#### Particle System
Music-reactive particle effects:
- Particles spawn based on beat detection
- Size/color based on frequency bands
- Physics-based movement (gravity, bounce)
- Multiple particle shapes (pixels, circles, squares)
- Trails and fade effects

#### Circular Spectrum
Radial frequency display:
- Frequency bands arranged in a circle
- Pulses outward from center
- Rotating animation
- Multiple color schemes
- Can include album art in center when track is identified

#### Pixel Rain
Retro matrix-style falling pixels:
- Columns of pixels falling down screen
- Height/speed based on frequency bands
- Color intensity based on amplitude
- ZX Spectrum attribute block styling
- Periodic "sweep" effects

#### Starfield
3D starfield that reacts to music:
- Stars move toward viewer at speed based on bass
- Color shifts based on frequency content
- Density changes with volume
- Warp speed effect on beat hits
- Classic 8-bit space aesthetic

#### Grid Pulse
Tron-style grid visualization:
- 3D perspective grid floor
- Grid lines pulse with beat
- Height variations based on frequency
- Horizon line effects
- Retro synthwave color palette

### 9.2 Visualizer Features

#### Audio Analysis for Visualization
- Real-time FFT (Fast Fourier Transform) for frequency analysis
- Beat detection algorithm
- Onset detection for sudden changes
- RMS level monitoring for overall volume
- Frequency band grouping (bass, mid, treble)

#### User Controls
- Cycle through visualization modes (button press)
- Color scheme selection
- Sensitivity adjustment
- Speed/smoothing controls
- Full-screen toggle
- Show/hide track info overlay

#### Performance Optimization
- Target 30fps minimum on Raspberry Pi
- Efficient pixel buffer operations
- Use of hardware acceleration where available
- Frame skipping if performance drops
- Lower resolution modes for older Pi models

#### Integration with Music Recognition
- Visualization continues during background listening
- When track identified, brief overlay shows track info
- Album art can be integrated into certain visualizers
- Track transitions can trigger special effects
- "Unknown" state uses generic visualizations

### 9.3 Technical Implementation

#### Audio Input Pipeline
```
Microphone → Audio Capture → FFT Analysis → Visualization Engine
                                ↓
                          Beat Detection
                                ↓
                          Feature Extraction
```

#### Visualization Rendering
- Use SDL2 or Pygame for efficient 2D rendering
- Pre-calculated lookup tables for trigonometry
- Pixel buffer manipulation for retro effects
- Color palette system for quick theme switching
- Double buffering for smooth animation

#### Configuration
```yaml
visualizer:
  default_mode: spectrum
  fps_target: 30
  sensitivity: 0.8
  color_scheme: zx_spectrum
  show_fps: false
  
  spectrum:
    bands: 32
    smoothing: 0.7
    peak_hold: true
    
  beat_detection:
    threshold: 1.5
    min_interval_ms: 300
```

### 9.4 Screensaver Integration

The visualizer can activate as a screensaver:
- Triggers after configurable idle time
- Continues to show music recognition when detected
- Lower CPU mode when no music playing
- Smooth transitions in/out

## 10. Implementation Roadmap

### Phase 1: Core Audio System
- [ ] Audio capture from USB microphone
- [ ] Basic audio analysis (silence, energy levels)
- [ ] Chromaprint integration
- [ ] AcoustID API integration
- [ ] Simple command-line test tool

### Phase 2: Background Mode
- [ ] Background service implementation
- [ ] Music vs. non-music classification
- [ ] Change detection algorithm
- [ ] Album art fetching and caching
- [ ] Picture frame integration

### Phase 3: Display Engine
- [ ] Pixelation effects
- [ ] ZX Spectrum palette conversion
- [ ] Transition animations
- [ ] Text rendering for track info
- [ ] Widget/screensaver modes

### Phase 4: Dedicated App
- [ ] Full-screen UI
- [ ] ACRCloud integration
- [ ] Fallback logic implementation
- [ ] Manual lookup controls
- [ ] Confidence indicators
- [ ] History view

### Phase 5: Visualizer
- [ ] Basic spectrum analyzer
- [ ] Waveform oscilloscope
- [ ] Additional visualization modes
- [ ] Mode switching UI
- [ ] Performance optimization
- [ ] Screensaver integration

### Phase 6: Polish & Optimization
- [ ] Performance tuning for Raspberry Pi
- [ ] Memory optimization
- [ ] Error handling and recovery
- [ ] User configuration UI
- [ ] Documentation
- [ ] Testing across different music genres

## 11. Hardware Requirements

### Minimum Specifications
- Raspberry Pi 3B or newer
- 1GB RAM (2GB recommended)
- USB microphone or audio input
- Display output (HDMI)

### Recommended Microphone
- USB powered omnidirectional mic
- Frequency response: 50Hz-15kHz minimum
- Budget: £15-40
- Examples:
  - Desktop conference mic
  - USB boundary microphone
  - Any basic USB mic with decent pickup

### Placement Tips
- Position where it can hear TV/speakers clearly
- Not too close (avoid distortion)
- Avoid direct line to noisy fans/vents
- 1-3 meters from audio source ideal

## 12. Dependencies

```txt
# Core audio
pyaudio>=0.2.11
numpy>=1.19.0

# Fingerprinting
pyacoustid>=1.2.0
acoustid>=1.2.2

# Audio analysis
librosa>=0.9.0
scipy>=1.7.0

# Image processing
Pillow>=9.0.0

# API requests
requests>=2.27.0
aiohttp>=3.8.0  # For async requests

# Display
pygame>=2.1.0  # or SDL2 bindings

# Visualization
matplotlib>=3.5.0  # Optional, for some viz modes

# Configuration
pyyaml>=6.0

# Caching
diskcache>=5.4.0
```

## 13. API Keys Setup

### AcoustID
1. Register at https://acoustid.org/
2. Create an application
3. Get API key
4. Add to `config.yaml`

### ACRCloud (Optional)
1. Register at https://www.acrcloud.com/
2. Create a project (choose "Audio Recognition")
3. Get Access Key and Secret
4. Note your region endpoint
5. Add to `config.yaml`

## 14. Testing Strategy

### Unit Tests
- Audio analysis algorithms
- API response parsing
- Display rendering functions
- Cache management

### Integration Tests
- End-to-end recognition flow
- API fallback behavior
- Multi-mode operation

### Test Audio Samples
- Various music genres
- TV show themes
- Background noise scenarios
- Speech with music
- Silence detection

## 15. Future Enhancements

### Core Features
- Offline mode with local database of frequently heard tracks
- User feedback mechanism to improve recognition
- Integration with music streaming services for fuller metadata
- History/statistics of recognized music
- Multiple language support for metadata
- Export listening history
- Playlist generation from recognized tracks

### Visualizer Enhancements
- Custom visualizer creation toolkit
- Community-shared visualization presets
- MIDI input for music visualization
- Video export of visualizations
- Shader-based effects for Pi 4/5

### Integration
- Smart home integration (dim lights when music plays, etc.)
- Voice control ("What song is this?")
- Notification system for favorite artists
- Social sharing of recognized tracks
- Last.fm scrobbling integration

### Advanced Features
- Multiple mic support for stereo visualization
- Room calibration for better recognition
- Machine learning for improved music classification
- Lyrics display when track identified
- Genre-specific visualization themes

## 16. License & Attribution

- Chromaprint: LGPL 2.1+
- AcoustID: Free for non-commercial use
- ACRCloud: Commercial (check terms)
- This implementation: [Your chosen license]

Remember to respect music copyrights when displaying album art and metadata.

---

**Ready for implementation in PiZXel!** 🎵🎨

This specification provides a complete blueprint for a sophisticated yet resource-conscious music recognition system that perfectly fits the retro aesthetic of your PiZXel project while providing modern functionality.
