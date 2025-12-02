# PiZXel Music Recognition - Implementation Plan

**Date**: November 30, 2025  
**Status**: In Development  
**Parent Spec**: `music-recognition-spec.md`

## Implementation Decisions

### Architecture Choices

1. **Audio Drivers**: Virtual driver architecture matching display system

   - `CanvasAudioInputDriver` for web development
   - `PiAudioInputDriver` for hardware (future)
   - Located in `pizxel/drivers/audio/`

2. **Primary Language**: TypeScript with Python fallback

   - Start with Python HTTP microservice for audio processing (NumPy/SciPy mature)
   - Migrate to TypeScript if needed later
   - Clean abstraction allows swapping implementation

3. **Chromaprint**: External dependency management

   - Clone to `pizxel/external/` on first use (like JSSpeccy3)
   - Graceful fallback if unavailable
   - Python bindings: `pyacoustid`

4. **API Strategy**: AcoustID free tier only initially
   - ACRCloud support added later if needed
   - Focus on caching and smart duplicate detection

### Flexible Standby/Screensaver System

**Core Concept**: Any app can become the "standby app" with time-based scheduling.

#### Standby Manager (`pizxel/standby-manager.ts`)

```typescript
interface StandbySchedule {
  app: string; // App ID
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  daysOfWeek: number[]; // [1,2,3,4,5] = Mon-Fri
  priority: number; // Higher priority wins conflicts
}

class StandbyManager {
  private schedules: StandbySchedule[] = [];
  private idleTimeout: number = 120000; // 2 minutes default
  private currentStandbyApp: App | null = null;

  // Determines which app should be active for current time
  getActiveStandbyApp(): string | null;

  // Activates standby mode
  activate();

  // Deactivates on user input
  deactivate();
}
```

**Example Schedules**:

```json
[
  {
    "app": "standby",
    "startTime": "00:00",
    "endTime": "08:00",
    "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
    "priority": 1
  },
  {
    "app": "work-dashboard",
    "startTime": "09:00",
    "endTime": "17:00",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "priority": 10
  },
  {
    "app": "picture-frame",
    "startTime": "17:00",
    "endTime": "23:00",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "priority": 5
  }
]
```

#### Standby-Capable Apps

Apps can opt-in to standby mode:

```typescript
class StandbyApp extends App {
  canBeStandby: boolean = true;

  // Called when entering standby mode
  onStandbyActivate() {
    this.dimBrightness();
  }

  // Called when user interacts (before deactivate)
  onStandbyDeactivate() {
    this.restoreBrightness();
  }
}
```

### Default Standby App

**Purpose**: Low-brightness ambient display with music-reactive mode

**States**:

1. **Idle** (no music): Subtle pixel animations + clock
2. **Music Detected**: Gentle visualizer + track info
3. **Brightness**: Configurable, default very dim (10-20%)

**Visual Styles** (user selectable):

- Starfield (slow moving stars)
- Flowing Pixels (gentle wave patterns)
- Geometric Drift (slowly rotating shapes)
- Particle Field (ambient particle effects)

### Shared Visualizer Service

**Location**: `pizxel/services/visualizer-service.ts`

**Purpose**: Reusable visualization engine with brightness/intensity modes

```typescript
enum VisualizerMode {
  STANDBY = "standby", // Dim, subtle
  ACTIVE = "active", // Bright, full energy
  AMBIENT = "ambient", // Medium, background
}

class VisualizerService {
  // Render visualizer with mode-appropriate brightness
  render(matrix: MatrixAPI, audioData: AudioData, mode: VisualizerMode);

  // Available visualizer types
  getAvailableVisualizers(): string[];

  // Switch active visualizer
  setVisualizer(name: string);
}
```

### Music App vs Standby App

**Music App** (`data/default-user/apps/music/`):

- User-launched, always-on-top
- Full brightness visualizers
- Manual controls (lookup now, change viz, history)
- Shows confidence scores
- Interactive UI

**Standby App** (`data/default-user/apps/standby/`):

- Auto-activates on idle
- Dim, ambient visuals when no music
- Transitions to music display when detected
- No user controls (exits on any input)
- Always listening in background

## Directory Structure

```
pizxel/
  drivers/
    audio/
      audio-input-driver.ts        # Abstract base
      canvas-audio-input.ts        # Web Audio API
      pi-audio-input.ts            # Future: ALSA/PortAudio
  services/
    audio-service.ts               # TypeScript client for Python service
    visualizer-service.ts          # Shared visualization engine
    music-recognition-service.ts   # API manager, caching
  standby-manager.ts               # Standby scheduling & activation
  external/
    chromaprint/                   # Cloned on first use

audio-service/                     # Python HTTP microservice
  main.py                          # FastAPI server
  audio_capture.py                 # Microphone input
  audio_analysis.py                # FFT, beat detection
  fingerprint.py                   # Chromaprint wrapper
  api_client.py                    # AcoustID integration
  requirements.txt

data/default-user/apps/
  standby/
    main.ts                        # Default standby app
    config.json
    icon.json
  music/
    main.ts                        # Dedicated music app
    config.json
    icon.json
```

## Python Audio Service API

**Endpoints** (FastAPI running on `localhost:5000`):

```python
# Start audio capture and analysis
POST /audio/start
Response: { "status": "listening" }

# Stop audio capture
POST /audio/stop
Response: { "status": "stopped" }

# Get current audio analysis (FFT, beat, levels)
GET /audio/analysis
Response: {
  "fft": [array of frequency magnitudes],
  "beat_detected": true,
  "rms_level": 0.45,
  "is_music": true,
  "timestamp": 1234567890
}

# Identify current audio (fingerprint + lookup)
POST /audio/identify
Response: {
  "track": {
    "title": "Song Name",
    "artist": "Artist",
    "album": "Album",
    "year": 2020,
    "confidence": 0.95,
    "album_art_url": "https://..."
  },
  "source": "acoustid"
}

# Get visualizer data stream
GET /audio/visualizer (SSE stream)
Event: {
  "spectrum": [32 frequency bands],
  "waveform": [100 samples],
  "beat": true,
  "energy": 0.7
}

# Health check
GET /health
Response: { "status": "ok", "chromaprint_available": true }
```

## Implementation Phases

### Phase 1: Standby System Foundation ✅ START HERE

**Goal**: Flexible standby/screensaver architecture

1. Create `StandbyManager` class
2. Add idle detection to input system
3. Create standby schedule configuration
4. Implement time-based app switching
5. Create basic `StandbyApp` with clock + simple animation
6. Test auto-activation after idle timeout

**Files to create**:

- `pizxel/standby-manager.ts`
- `pizxel/standby-config.json`
- `data/default-user/apps/standby/main.ts`
- `data/default-user/apps/standby/config.json`

### Phase 2: Audio Driver Infrastructure

**Goal**: Virtual audio input system

1. Create `AudioInputDriver` abstract base
2. Implement `CanvasAudioInputDriver` (Web Audio API)
3. Add audio input to driver registry
4. Test microphone permission flow
5. Create mock audio generator for testing

**Files to create**:

- `pizxel/drivers/audio/audio-input-driver.ts`
- `pizxel/drivers/audio/canvas-audio-input.ts`
- `pizxel/drivers/audio/mock-audio-input.ts`

### Phase 3: Python Audio Service

**Goal**: Audio analysis backend

1. Set up FastAPI project structure
2. Implement audio capture (PyAudio)
3. Add FFT analysis (NumPy)
4. Add beat detection
5. Create HTTP endpoints
6. Test with synthetic audio

**Files to create**:

- `audio-service/main.py`
- `audio-service/audio_capture.py`
- `audio-service/audio_analysis.py`
- `audio-service/requirements.txt`

### Phase 4: Visualizer Service

**Goal**: Reusable visualization engine

1. Create `VisualizerService` class
2. Implement spectrum analyzer
3. Implement waveform display
4. Add brightness/intensity modes
5. Create visualizer registry
6. Test with mock audio data

**Files to create**:

- `pizxel/services/visualizer-service.ts`
- `pizxel/services/visualizers/spectrum.ts`
- `pizxel/services/visualizers/waveform.ts`

### Phase 5: Enhanced Standby App

**Goal**: Music-reactive standby

1. Connect standby app to audio service
2. Add ambient animations (no music)
3. Integrate visualizer service (dim mode)
4. Detect music and switch to viz mode
5. Show clock overlay
6. Test transition smoothness

### Phase 6: Music Recognition

**Goal**: Track identification

1. Set up Chromaprint in `external/`
2. Implement fingerprinting in Python service
3. Add AcoustID API client
4. Implement caching layer
5. Add album art fetching
6. Test with known songs

**Files to create**:

- `audio-service/fingerprint.py`
- `audio-service/api_client.py`
- `pizxel/services/music-recognition-service.ts`

### Phase 7: Dedicated Music App

**Goal**: Full-featured music identification app

1. Create music app structure
2. Implement UI (track info, album art)
3. Add manual lookup button
4. Integrate visualizer service (full brightness)
5. Add visualizer mode switching
6. Add history view
7. Test end-to-end flow

**Files to create**:

- `data/default-user/apps/music/main.ts`
- `data/default-user/apps/music/config.json`

## Configuration Files

### `pizxel/standby-config.json`

```json
{
  "enabled": true,
  "idleTimeout": 120000,
  "schedules": [
    {
      "app": "standby",
      "startTime": "00:00",
      "endTime": "23:59",
      "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
      "priority": 1
    }
  ],
  "defaultApp": "standby"
}
```

### `audio-service/config.yaml`

```yaml
audio:
  device: "default"
  sample_rate: 44100
  buffer_size: 2048
  channels: 1

analysis:
  fft_size: 2048
  hop_size: 512
  beat_threshold: 1.5
  music_threshold: 0.6

apis:
  acoustid:
    api_key: "${ACOUSTID_API_KEY}"
    enabled: true

cache:
  max_tracks: 100
  duplicate_window: 300
```

## Testing Strategy

### Unit Tests

- Standby manager time calculations
- Audio driver abstraction
- Visualizer rendering
- API response parsing

### Integration Tests

- Idle timeout → standby activation
- Standby schedule switching
- Audio capture → analysis pipeline
- Music recognition → display flow

### Manual Testing Checklist

- [ ] Standby activates after 2 minutes idle
- [ ] Any keypress exits standby
- [ ] Clock displays correctly
- [ ] Ambient animation runs smoothly
- [ ] Music detection triggers visualizer
- [ ] Track info displays when identified
- [ ] Multiple visualizers work
- [ ] Brightness modes function correctly
- [ ] App switching preserves state
- [ ] History persists across sessions

## Performance Targets

- **Standby idle**: < 5% CPU, < 50MB RAM
- **Standby with music**: < 15% CPU, < 100MB RAM
- **Music app**: < 25% CPU, < 150MB RAM
- **Frame rate**: 30fps minimum for visualizers
- **Latency**: < 50ms audio → visual response

## External Dependencies

### Python Service

```txt
fastapi==0.104.0
uvicorn==0.24.0
pyaudio==0.2.14
numpy==1.24.0
scipy==1.11.0
pyacoustid==1.3.0
requests==2.31.0
pyyaml==6.0.1
```

### TypeScript (package.json additions)

```json
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

## Success Criteria

### Phase 1 Complete When:

- ✅ Standby activates automatically after idle
- ✅ Time-based app scheduling works
- ✅ Clock + simple animation displays
- ✅ Any input exits standby instantly

### Phase 4 Complete When:

- ✅ Visualizers respond to audio in real-time
- ✅ Brightness modes work correctly
- ✅ Multiple visualizer types available
- ✅ 30fps maintained on target hardware

### Phase 7 Complete When:

- ✅ Music is identified with high accuracy
- ✅ Album art displays correctly
- ✅ Track info is readable and attractive
- ✅ Manual lookup works reliably
- ✅ History persists and is browseable
- ✅ Standby and Music app work independently

## Notes

- Keep Python service optional - PiZXel should run without it (just no music recognition)
- All audio features gracefully degrade if microphone unavailable
- Chromaprint download should be silent and automatic
- Settings UI for standby schedule coming in Phase 8
- ACRCloud integration deferred to Phase 9
- Lyrics display deferred to Phase 10

---

**Ready to implement!** Starting with Phase 1: Standby System Foundation.
