# MatrixOS Hardware Guide

This guide covers everything you need to build a MatrixOS LED matrix display device, from component selection to assembly and power requirements.

## 🎯 Overview

MatrixOS runs on Raspberry Pi computers connected to RGB LED matrix panels. The system is designed to work with various configurations, from small 64×64 displays to large multi-panel arrays like the ultimate 256×192 ZX Spectrum resolution.

## 📋 Component Requirements

### Essential Components

#### 1. **Raspberry Pi**
The brain of your MatrixOS device.

**Supported Models:**
- **Raspberry Pi Zero / Zero W / Zero 2 W** - Minimum viable, runs MatrixOS at full speed
- **Raspberry Pi 3 Model B/B+** - Better performance, more connectivity
- **Raspberry Pi 4** - Excellent performance, future-proof
- **Raspberry Pi 5** - Maximum performance

**Recommended for MatrixOS:**
- **Pi Zero 2 W** - Best balance of cost, size, and performance
- Built-in WiFi and Bluetooth
- Quad-core CPU handles MatrixOS + apps easily
- Low power consumption

**What You Need:**
- Raspberry Pi with **GPIO headers soldered** (40-pin)
- If headers aren't pre-soldered, you'll need to solder them yourself

#### 2. **RGB LED Matrix Panel(s)**
The display for MatrixOS.

**Specifications:**
- **Interface:** HUB75 (standard for RGB LED matrices)
- **Pitch:** P2.5, P3, P4, or P5 (pixel spacing in mm)
  - P3 is ideal for indoor viewing at 1-2 meters
  - P2.5 is sharper, P4/P5 is cheaper
- **Indoor vs Outdoor:** Indoor panels are fine (and cheaper)
- **Scan Rate:** 1/16 or 1/32 scan (both work)

**Supported Resolutions:**
- **64×64** - Minimum viable (4,096 pixels)
- **128×64** - Good for wide UIs (8,192 pixels)
- **128×128** - Recommended sweet spot (16,384 pixels) ⭐
- **256×192** - Ultimate (ZX Spectrum native resolution, 49,152 pixels)

**Panel Configurations:**

| Configuration | Panels | Arrangement | Use Case |
|--------------|---------|-------------|----------|
| 64×64 | 1 | Single | Testing, minimal apps |
| 128×64 | 1 or 2 | 2×64×64 horizontal | Wide UI, status display |
| 128×128 | 2 | 2×64×64 vertical | **Primary target** ⭐ |
| 256×128 | 4 | 4×64×64 grid | Large display |
| 256×192 | 6 | 2×128×64 or 4×64×64 + 2 | ZX Spectrum emulator |

**Where to Buy:**
- Pimoroni (UK)
- Adafruit (US)
- AliExpress (budget option)
- SparkFun (US)

#### 3. **RGB Matrix HAT/Bonnet**
Interfaces the Pi to the LED panels.

**Purpose:**
- Level shifting (Pi is 3.3V, panels need 5V)
- Proper GPIO pinout for HUB75
- Power distribution
- Some include RTC (real-time clock)

**Recommended Options:**

**A) Adafruit RGB Matrix Bonnet** - Best for Pi Zero
- Designed for Pi Zero form factor
- Powers Pi from panel power supply
- Has power input (barrel jack or screw terminals)
- Supports up to 2 panels (daisy-chained)
- ~£15-20

**B) Adafruit RGB Matrix HAT** - Best for Pi 3/4
- Standard Pi HAT size
- Supports up to 6 panels (chainable)
- Has RTC for timekeeping without WiFi
- ~£20-25

**C) Electrodragon RGB Matrix Panel Driver Board**
- Budget option
- Manual wiring required
- ~£5-10

**Important:** The HAT/Bonnet is **essential** - never connect LED panels directly to Pi GPIO!

#### 4. **Power Supply**
LED matrices draw significant current!

**Power Requirements by Configuration:**

| Resolution | Panels | Max Draw (100%) | Typical (50%) | Recommended PSU |
|-----------|---------|----------------|---------------|-----------------|
| 64×64 | 1 | 2-3A @ 5V | 1-1.5A | 5V 3A |
| 128×64 | 2 | 4-6A @ 5V | 2-3A | 5V 5A |
| 128×128 | 2 | 6-8A @ 5V | 3-4A | 5V 10A |
| 256×192 | 6 | 15-20A @ 5V | 8-10A | 5V 20A |

**Power Supply Specs:**
- **Voltage:** 5V DC (regulated, stable)
- **Current:** See table above
- **Connector:** Barrel jack (5.5mm×2.1mm) or screw terminals
- **Quality:** Use reputable brands (Mean Well, Adafruit, official Pi PSU)

**⚠️ SAFETY WARNING:**
- Never use cheap unbranded PSUs - fire hazard!
- Always use PSU with over-current protection
- Use proper gauge wire for high-current connections (18 AWG minimum)
- Don't power panels from Pi's GPIO pins - will damage Pi!

**Power Efficiency Notes:**
- Max draw assumes all pixels white at 100% brightness
- Typical usage (UI, games) uses 30-50% of max
- Black pixels consume no power
- Reducing brightness to 50-75% saves massive amounts of power
- MatrixOS can limit max brightness in software

#### 5. **MicroSD Card**
Storage for the OS and apps.

**Specifications:**
- **Capacity:** 16GB minimum, 32GB recommended, 64GB+ for games/media
- **Speed Class:** Class 10 minimum, **A2 rating recommended**
- **Brand:** SanDisk, Samsung, Kingston (avoid cheap no-name cards)

**A2 (Application Performance Class 2) Benefits:**
- Better random read/write performance
- Faster app loading
- Smoother multitasking

**Where to Buy:**
- Any reputable electronics retailer
- Avoid suspiciously cheap cards (often fake/slow)

#### 6. **Cables and Connectors**

**HUB75 Ribbon Cables:**
- Usually included with LED panels
- 16-pin IDC ribbon cable
- Length depends on your enclosure design
- Good to have spares

**Power Cables:**
- Often included with panels
- Red/black wire pairs with spade connectors
- 18 AWG minimum for high current
- May need to add screw terminal connectors

**USB Cable:**
- USB-A to Micro-B for Pi Zero
- USB-A to USB-C for Pi 4/5
- For power if not using HAT power injection

### Optional But Recommended

#### 7. **Audio System** (Optional)
For sound effects, music, and ZX Spectrum beeper emulation.

**Components:**
- **USB Audio Adapter/Amp:** Converts USB to audio out
  - Example: Picade Max USB Audio (3W stereo amp)
  - Or: Simple USB sound card + separate amp
- **Speakers:** 2× 8Ω speakers (0.5W-2W each)
  - Mini speakers work great
  - Consider magnetically shielded (near electronics)
- **Aux Cable:** 3.5mm if using separate amp

**Audio Integration:**
- MatrixOS will have audio support via pygame.mixer
- USB audio avoids Pi's poor built-in audio quality
- Stereo enhances gaming experience

#### 8. **Input Devices**

**For Development:**
- **USB Keyboard:** For initial setup and development
- **USB Hub:** If using Pi Zero (only 1 USB port)

**For Production:**
- **Bluetooth Gamepad/Joypad:** Primary input method
  - Recommended: 8BitDo Zero 2, 8BitDo SN30 Pro
  - Alternative: Xbox, PS4, or generic Bluetooth controllers
  - Maps to MatrixOS universal input system
- **Bluetooth Keyboard:** Optional backup input

**MatrixOS includes on-screen keyboard for text input without physical keyboard!**

#### 9. **Cooling** (Optional but Recommended)

**For Pi Zero:**
- Small aluminum heatsink (14mm×14mm)
- Thermal adhesive pad included
- ~£2-3

**For Pi 3/4:**
- Larger heatsink or small fan
- Pi 4 official case with fan is good option
- Important if running at full load

**Why?**
- Driving LED displays generates heat
- Thermal throttling slows performance
- Heatsinks are cheap insurance

#### 10. **Mounting Hardware**

**M3 Screws and Standoffs:**
- For mounting panels together
- For mounting HAT to Pi
- For mounting Pi to enclosure
- Typical: M3×6mm, M3×10mm screws
- Nylon or metal standoffs (5mm-20mm)

**Panel Mounting:**
- LED panels have M3 holes in corners
- Use standoffs to space panels apart
- Allows airflow and cable routing

#### 11. **Enclosure** (Optional)

**Options:**
- **3D Printed:** Custom design for your build
- **Off-the-Shelf:** Picture frame, shadow box
- **DIY:** Laser-cut acrylic, wood frame

**Design Considerations:**
- Ventilation (panels and Pi generate heat)
- Cable routing (HUB75 cables, power)
- Access to Pi ports (USB, HDMI for setup)
- Mounting for joypad (magnetic, velcro)
- Diffuser (optional, softens pixel look)

## 🔧 Example Configurations

### Configuration 1: "Minimal Dev Setup" (64×64)

**Purpose:** Learning, development, testing apps

**Components:**
- Raspberry Pi Zero 2 W - £15
- 64×64 RGB LED Panel (P3, indoor) - £25
- Adafruit RGB Matrix Bonnet - £18
- 5V 3A Power Supply - £8
- 16GB MicroSD Card (Class 10) - £6
- HUB75 cable (included with panel)
- Power cable (included with panel)

**Total: ~£72**

**Power Draw:**
- Max: 2-3A @ 5V (full white)
- Typical: 1-1.5A @ 5V
- 3A PSU is adequate

**Resolution:** 64×64 (sufficient for basic apps)

---

### Configuration 2: "MatrixOS Standard" (128×128) ⭐

**Purpose:** Primary MatrixOS target, ideal balance

**Components:**
- Raspberry Pi Zero 2 W - £15
- 2× 64×64 RGB LED Panel (P3, indoor) - £50
- Adafruit RGB Matrix Bonnet - £18
- 5V 10A Power Supply (Mean Well) - £30
- 32GB MicroSD Card (A2) - £10
- Bluetooth Gamepad (8BitDo Zero 2) - £25
- 2× Mini Speakers 8Ω 1W - £10
- Picade Max USB Audio - £20
- Heatsink for Pi Zero - £3
- M3 mounting hardware - £5

**Total: ~£186**

**Power Draw:**
- Max: 6-8A @ 5V (full white)
- Typical: 3-4A @ 5V (50% brightness)
- 10A PSU handles peaks comfortably

**Resolution:** 128×128 (perfect for MatrixOS UI)

**Notes:**
- This is the configuration we're building! ✨
- Panels can be stacked vertically for square display
- Audio adds immersion for games and emulators
- Bluetooth gamepad makes it feel like a console

---

### Configuration 3: "Picture Frame Computer" (128×128)

**Purpose:** Home display, living room centerpiece

**Same as Config 2, plus:**
- Picture frame enclosure - £15-30
- Diffuser film (optional) - £5
- Wall mount brackets - £5

**Total: ~£211**

**Enhancements:**
- Looks like art on the wall
- Diffuser softens pixels for better viewing distance
- Can display clock, weather, photos, and run games!

---

### Configuration 4: "ZX Spectrum Ultimate" (256×192)

**Purpose:** Full ZX Spectrum emulation, retro gaming heaven

**Components:**
- Raspberry Pi 4 (4GB) - £55
- 6× 128×64 RGB LED Panel or 4× 64×64 + 2× 128×64 - £150-200
- Adafruit RGB Matrix HAT - £22
- 5V 20A Power Supply (Mean Well) - £50
- 64GB MicroSD Card (A2) - £15
- Bluetooth Gamepad - £25
- USB Audio + Speakers - £30
- Heatsinks/Fan - £10
- M3 mounting hardware - £10
- Custom 3D printed frame - £20 (filament cost)

**Total: ~£387-437**

**Power Draw:**
- Max: 15-20A @ 5V (all panels full white)
- Typical: 8-10A @ 5V (Spectrum gaming)
- 20A PSU required for safety margin

**Resolution:** 256×192 (native ZX Spectrum!)

**Notes:**
- This is the ultimate MatrixOS vision!
- Pi 4 recommended for full-speed emulation
- Perfect pixel-perfect Spectrum rendering
- Your existing ZX Spectrum font already matches!
- Supports thousands of classic games

---

### Configuration 5: "Budget Build" (64×64)

**Purpose:** Minimal cost entry point

**Components:**
- Raspberry Pi Zero W (v1.1) - £10 (if available)
- 64×64 RGB LED Panel (P4, from AliExpress) - £15
- DIY level shifter circuit (74HCT245) - £5
- 5V 3A USB Power Supply (repurposed) - £0
- 8GB MicroSD Card (recycled) - £0
- USB Keyboard - £5 (or reuse)

**Total: ~£35**

**Trade-offs:**
- Slower Pi Zero (single core)
- Manual wiring (no HAT)
- Lower resolution
- No audio
- No Bluetooth

**Good for:** Learning electronics, extreme budget builds

## 🔌 Assembly Instructions

### Step 1: Prepare the Raspberry Pi

1. **Flash MatrixOS to MicroSD:**
   - Download latest MatrixOS image (when available)
   - Or: Flash Raspberry Pi OS Lite and install MatrixOS manually
   - Use Raspberry Pi Imager
   - Configure WiFi and SSH in imager settings

2. **Solder GPIO Headers (if needed):**
   - Pi Zero often comes without headers
   - Solder 2×20 male header pins
   - Ensure pins are straight and flush

3. **Attach Heatsink:**
   - Clean CPU with isopropyl alcohol
   - Peel thermal pad backing
   - Press heatsink firmly onto CPU
   - Let cure for 1 hour

### Step 2: Connect RGB Matrix HAT/Bonnet

1. **Power Off Pi:**
   - Never connect HAT with power on!

2. **Align HAT:**
   - Line up HAT GPIO with Pi GPIO
   - All 40 pins must align perfectly

3. **Press Firmly:**
   - Push HAT down until fully seated
   - Pins should not be visible

4. **Secure with Standoffs (optional):**
   - Use M2.5 standoffs between Pi and HAT
   - Prevents flexing and damage

### Step 3: Connect LED Panels

1. **HUB75 Connection:**
   - Locate output port on HAT (usually labeled "OUTPUT")
   - Plug HUB75 ribbon cable into HAT
   - Plug other end into panel INPUT port
   
2. **Daisy-Chain (if using multiple panels):**
   - Panel 1 OUTPUT → Panel 2 INPUT
   - Panel 2 OUTPUT → Panel 3 INPUT (etc.)
   - Keep cables short and tidy

3. **Verify Orientation:**
   - Panels have arrow showing data flow direction
   - INPUT on first panel, OUTPUT used for chaining
   - Test orientation before permanent mounting

### Step 4: Power Wiring

**⚠️ CRITICAL SAFETY SECTION ⚠️**

**NEVER:**
- Mix up polarity (red = +5V, black = GND)
- Connect power while working on wiring
- Use undersized wire for high current
- Skip fuse/over-current protection

**Power Supply → HAT Bonnet:**
1. Turn off and unplug power supply
2. Connect PSU positive (+) to HAT power input (+)
3. Connect PSU negative (-/GND) to HAT power input (-)
4. Use screw terminals or barrel jack (check HAT specs)
5. Ensure tight connections (tug test)
6. Double-check polarity before powering on!

**Power Supply → LED Panels:**
- If using HAT with power pass-through: PSU → HAT → Panels (automatic)
- If direct power: Use distribution board or power injection
  - Connect PSU + to all panel + terminals
  - Connect PSU - to all panel - terminals
  - Use appropriate gauge wire (18 AWG for 5A+)

**Power Injection (for 3+ panels):**
- Voltage drops over long daisy-chains
- Inject power at both ends of panel chain
- Connect PSU to first AND last panel
- Keeps brightness even across all panels

### Step 5: Audio Setup (Optional)

1. **Connect USB Audio:**
   - Plug USB audio adapter into Pi USB port
   - If Pi Zero: Use OTG adapter + hub

2. **Connect Speakers:**
   - Red wire → positive terminal
   - Black wire → negative terminal
   - Verify polarity (matters for stereo imaging)

3. **Test Audio:**
   ```bash
   speaker-test -t wav -c 2
   ```

### Step 6: Bluetooth Pairing (Optional)

1. **Boot Pi with MatrixOS**

2. **Put Gamepad in Pairing Mode:**
   - Usually: Hold Start+Select or Home button

3. **Pair via Settings App:**
   - MatrixOS Settings → Bluetooth → Scan
   - Select gamepad → Pair
   - Test buttons in MatrixOS input test

4. **Alternative: Command Line:**
   ```bash
   bluetoothctl
   scan on
   pair [MAC_ADDRESS]
   trust [MAC_ADDRESS]
   connect [MAC_ADDRESS]
   ```

### Step 7: First Boot

1. **Triple-Check Wiring:**
   - All connections tight
   - Polarity correct
   - No loose cables

2. **Power Supply Last:**
   - Connect everything first
   - Plug in PSU last
   - Watch for magic smoke (there shouldn't be any!)

3. **Expected Behavior:**
   - Pi green LED flashes (reading SD card)
   - Panel shows boot sequence or demo
   - MatrixOS launcher appears

4. **Troubleshooting:**
   - **No display:** Check HUB75 cable, power, HAT connection
   - **Corrupted display:** Wrong panel configuration in software
   - **Dim display:** Insufficient power, reduce brightness
   - **Pi won't boot:** Check SD card, re-flash image

## ⚡ Power Management

### Software Brightness Control

MatrixOS can limit brightness in software:

```python
# matrixos/config.py
DEFAULT_BRIGHTNESS = 75  # Percent (100 = max)
MIN_BRIGHTNESS = 10
MAX_BRIGHTNESS = 100

# Settings app lets users adjust this
# Brightness affects ALL pixels simultaneously
```

**Power Savings by Brightness:**
- 100% brightness → Full power draw
- 75% brightness → ~56% power draw
- 50% brightness → ~25% power draw
- 25% brightness → ~6% power draw

**Recommendation:** 50-75% brightness is perfect for indoor viewing and saves tons of power!

### Typical Power Consumption

**128×128 Configuration Examples:**

| Scenario | Brightness | Colors | Power Draw |
|----------|-----------|---------|------------|
| All white (max) | 100% | #FFFFFF | 8A @ 5V (40W) |
| All white | 50% | #FFFFFF | 4A @ 5V (20W) |
| MatrixOS UI | 75% | Mixed | 3-4A @ 5V (15-20W) |
| Dark theme UI | 50% | Mixed | 1-2A @ 5V (5-10W) |
| Screensaver (dim) | 25% | Minimal | 0.5-1A @ 5V (2.5-5W) |
| Sleep mode | 10% | Clock only | 0.3A @ 5V (1.5W) |

### Power Efficiency Tips

1. **Use Dark Themes:**
   - Black pixels = 0 power
   - Dark blue/purple uses less than bright white/yellow

2. **Limit Brightness:**
   - 75% is barely noticeable vs 100%
   - Huge power savings

3. **Screen Timeout:**
   - Dim or turn off after inactivity
   - MatrixOS can implement screen saver

4. **Smart Pixel Design:**
   - Apps should avoid large white areas
   - Use colored text on black background
   - Status displays can be minimal

5. **Dynamic Brightness:**
   - Bright during day
   - Dim at night
   - Use RTC or WiFi time

## 🛡️ Safety Considerations

### Electrical Safety

- ✅ Use properly rated power supplies
- ✅ Check polarity before connecting
- ✅ Use appropriate wire gauge (18 AWG minimum for 5A+)
- ✅ Secure all connections (tug test)
- ✅ Insulate exposed terminals
- ❌ Never work on powered circuits
- ❌ Don't exceed PSU ratings
- ❌ Don't use damaged cables

### Fire Safety

- ✅ Use quality components
- ✅ Ensure adequate ventilation
- ✅ Don't cover vents or heatsinks
- ✅ Monitor temperatures during testing
- ❌ Don't use cheap unbranded PSUs
- ❌ Don't run at 100% PSU capacity continuously
- ❌ Don't leave unattended until proven stable

### Component Safety

- ✅ Add heatsinks to Pi
- ✅ Ensure airflow in enclosure
- ✅ Use ESD protection when handling components
- ✅ Keep liquids away
- ❌ Never connect/disconnect while powered
- ❌ Don't force connectors

## 🔧 Troubleshooting

### Display Issues

**Problem:** No display
- Check power supply voltage and current
- Verify HUB75 cable connected correctly
- Check HAT is seated properly on Pi GPIO
- Verify MatrixOS panel configuration matches hardware

**Problem:** Corrupted/garbled display
- Panel scan rate mismatch (set in software)
- Wrong panel chain configuration
- Insufficient power supply
- Bad HUB75 cable

**Problem:** Colors wrong
- RGB pin mapping incorrect (set in software)
- Panel type configuration wrong
- Cable not fully seated

**Problem:** Flickering
- Insufficient power supply
- Loose connections
- Interference from other devices

### Power Issues

**Problem:** Pi won't boot
- Insufficient power supply
- Check voltage at panel power terminals (should be 4.8-5.2V)
- SD card corrupted
- Short circuit (check for loose wires)

**Problem:** Panels dim or turn off randomly
- Insufficient power supply amperage
- Voltage drop (use thicker wires or power injection)
- Over-current protection tripping

**Problem:** Different panel brightness
- Voltage drop over daisy-chain
- Add power injection at far end
- Reduce brightness or cable length

### Performance Issues

**Problem:** Low frame rate
- Pi under-powered (thermal throttling)
- Add heatsink/cooling
- Reduce software brightness limit
- Close background apps

**Problem:** Input lag
- Bluetooth interference
- Too many background processes
- Use faster Pi model

## 📚 Additional Resources

### Hardware Documentation
- [Adafruit RGB Matrix HAT Guide](https://learn.adafruit.com/adafruit-rgb-matrix-bonnet-for-raspberry-pi)
- [HUB75 LED Panel Specification](https://learn.adafruit.com/32x16-32x32-rgb-led-matrix)
- [Raspberry Pi GPIO Pinout](https://pinout.xyz/)

### Software Libraries
- [rpi-rgb-led-matrix](https://github.com/hzeller/rpi-rgb-led-matrix) - C++ library for driving panels
- MatrixOS uses terminal emulation for development, will integrate hardware library later

### Community
- [Adafruit Forums](https://forums.adafruit.com/) - Hardware help
- MatrixOS GitHub Discussions - Software and project help

### Suppliers (UK)
- [Pimoroni](https://shop.pimoroni.com/) - Pi, HATs, panels, accessories
- [The Pi Hut](https://thepihut.com/) - Complete Pi range
- [CPC Farnell](https://cpc.farnell.com/) - Electronic components

### Suppliers (US)
- [Adafruit](https://www.adafruit.com/) - Excellent quality, great docs
- [SparkFun](https://www.sparkfun.com/) - Wide selection
- [Amazon](https://www.amazon.com/) - Quick shipping

### Suppliers (Budget)
- [AliExpress](https://www.aliexpress.com/) - Cheap panels (long shipping)
- eBay - Used/surplus components

## 🎯 Recommended Build Path

**For Beginners:**
1. Start with 64×64 single panel
2. Use Pi Zero 2 W or Pi 3
3. Use Adafruit HAT/Bonnet (well documented)
4. Get hardware working before software
5. Upgrade to larger display later

**For This Project (MatrixOS):**
1. Build 128×128 configuration (2× 64×64 panels)
2. Use quality components (safety first!)
3. Add audio for full experience
4. 3D print custom enclosure
5. Mount on wall as picture frame computer

**For Ultimate Build (ZX Spectrum):**
1. Master 128×128 first
2. Upgrade to 256×192 (6 panels)
3. Use Pi 4 for performance headroom
4. Implement proper cooling
5. Build custom enclosure with ventilation

## ✨ Your Build: "MatrixOS Standard"

Based on your order, you'll have:
- ✅ 2× 128×64 RGB LED panels (for 128×128 stacked)
- ✅ RGB Matrix Bonnet
- ✅ 2× Mini speakers
- ✅ USB audio amp
- ✅ Heatsink
- ✅ Cables included
- ⏳ Still need: 5V 10A PSU, Bluetooth gamepad, MicroSD card

**This is the perfect MatrixOS build!** You'll have:
- 128×128 display (excellent for UI and games)
- Full stereo audio (immersive gaming)
- Bluetooth gamepad (console experience)
- Efficient power usage (50-75% brightness)
- Room to grow (can add more panels later)

**Estimated Build Time:** 2-3 hours for first build

**Difficulty:** Moderate (mostly plug-and-play with HAT)

Have fun building! 🚀🎮✨

---

*Last Updated: November 2025*  
*For MatrixOS version: In Development*  
*Feedback and contributions welcome!*
