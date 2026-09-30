# PiZXel Hardware

Plans for a dedicated PiZXel display: a small, low-power, wall- or
desk-mountable screen showing PiZXel's 256×192 at something like 1 mm per
pixel.

**Status:** plan only. Nothing here is built yet; the engine work it needs
is listed under [Engine work](#engine-work-needed). Last updated 30 Sep 2026.

## What we want

- Emissive: only lit pixels give off light, with no backlight, so blacks are
  truly black and power is low
- 256×192 (256×256 would also be usable), at a pixel pitch close to 1 mm:
  big enough to see across a room, not so big it dominates it
- Runs from a Raspberry Pi Zero 2 W, framed, possibly on a wall
- Local PiZXel as it already is (the framebuffer driver): no pizxel.uk needed

## The main plan: an OLED screen with integer scaling

Show each PiZXel pixel as an exact N×N block of screen pixels on a
higher-resolution OLED, and leave the rest black. On an OLED a black pixel is
off, so the unused border gives off no light and a frame can cover it.
Whole-number scaling keeps every pixel crisp.

### Screen: Intehill F13NA (already owned)

[Intehill F13NA](https://www.intehill.com/products/13-3-1080p-oled-portable-monitor):
13.3" OLED, 1920×1080, 60 Hz, 400 nits; 305 × 190 × 4–8 mm, 450 g; two
USB-C ports (full function), one mini HDMI, 2 W speaker; no VESA mount, no
touch; needs a 10 W USB-C PD supply when used over HDMI.

At 1920×1080 (0.153 mm per screen pixel):

| PiZXel size | Scale | Screen pixels | Image size | PiZXel pixel pitch | Unused border |
|---|---|---|---|---|---|
| **256×192** | 5× | 1280×960 | **196 × 147 mm** (≈9.6") | 0.77 mm | ~49 mm each side, ~9 mm top and bottom |
| 256×256 | 4× | 1024×1024 | 157 × 157 mm | 0.61 mm | wide sides, ~4 mm top and bottom |

256×192 at 5× is the one to use. 6× is too tall for 1080 lines.

### Other screens that would work

| Screen | 256×192 | Notes |
|---|---|---|
| 15.6" 4K OLED portable, e.g. [ViewSonic VX1655-4K-OLED](https://www.viewsonic.com/us/vx1655-4k-oled-15-6-uhd-oled-portable-monitor-with-60w-usb-c-and-mini-hdmi.html) (~$300–500) | 11× → 252 × 189 mm, **0.99 mm** pitch | The closest match to "1 mm pitch, 256×192". Needs a Pi 4 (4K at 30 Hz) or Pi 5 (4K at 60 Hz); a Zero 2 W only outputs 1080p |
| 15.6" 1080p OLED portable | 5× → 229 × 172 mm, 0.9 mm | Same Pi needs as the F13NA |
| 27" 4K OLED monitor | 11× → 437 × 328 mm, 1.7 mm | Pi 4/5 |
| 42" 4K OLED TV | 11× → 681 × 511 mm, 2.7 mm | A wall piece; Pi 4/5 |
| [Waveshare 5.5" HDMI AMOLED](https://www.waveshare.com/5.5inch-hdmi-amoled.htm) (1080×1920, ~$120) | 5× → 81 × 61 mm | Made for Pis, but too small for this |

### Burn-in

OLEDs can wear unevenly under static images, and PiZXel has static parts
(the launcher's bars and clock). The F13NA doesn't list any burn-in
protection of its own, so PiZXel should provide it:

- **Pixel shift:** move the whole image by a physical pixel or two every few
  minutes, within the black border. At 5× that's a fifth of a PiZXel pixel
  (0.15 mm), invisible at any normal distance. It spreads the wear along the
  edges of static things (text, icons, bar edges).
- **Dimming:** dim static UI after a while, and use the standby screensaver.
  These cover what pixel shift can't: the middle of large, unchanging bright
  areas.

### Optional: the LED look

- **In software:** draw each PiZXel pixel as a round dot with a dark gap.
  At 5× that's coarse but works; at 11× (4K) it's very convincing.
- **Physically:** a laser-cut black mask, or printed film, with a 256×192
  grid of holes at the PiZXel pixel pitch, held just in front of the screen.
  It gives the depth and "individual LEDs" look no flat screen has. Each
  PiZXel pixel is 5 screen pixels wide, so alignment is forgiving.

## The Pi: Raspberry Pi Zero 2 W (with headers)

A good match for a 1080p screen, but not yet tried with PiZXel. These are
estimates from measurements on a Mac (phase 3 of the performance work):

- **CPU:** a frame costs 0.05–0.4 ms on the Mac; a Zero 2 W is roughly
  20–30× slower, so about 2–10 ms. That's fine at 30 fps for most apps, and
  often 60. Cap the frame rate at about 30 fps; full-screen animations (the
  standby screensaver) are the heaviest case.
- **Memory:** PiZXel uses about 80–150 MB (mostly node-canvas and the emoji
  sheet) of the Zero 2 W's 512 MB.
- **OS:** 64-bit Raspberry Pi OS, so that Node 22 and node-canvas install as
  ready-built binaries.
- **Start-up:** perhaps 20–40 s while `tsx` compiles the TypeScript. Fine
  for a wall display.
- **Video:** mini HDMI (Pi) to mini HDMI (F13NA). 1080p is exactly what the
  Zero 2 W outputs.

## Power

About 1 W for the Pi plus about 5–8 W for the OLED showing mostly black:
comfortably under 10 W for the whole frame.

- **Two supplies, or one charger with two ports:** the F13NA needs 10 W over
  USB-C when used over HDMI; the Pi takes micro USB (5 V, 2.5 A recommended).
- **One plug, through the monitor (to test):** power the F13NA from a 20–30 W
  or larger USB-C PD charger, and power the Pi from the monitor's other
  USB-C port (USB-C to micro USB cable). The monitor passes power through to
  connected devices, which is how it charges a laptop. Check with a USB power
  meter:
  - that the port supplies 5 V to the Pi, and enough current;
  - that it keeps supplying power when there's no picture, e.g. before the
    Pi has booted, or if the monitor sleeps on "no signal". If it doesn't,
    the Pi can't start, and this option is out.

## Mounting

- No VESA mount: hold the F13NA in a shallow frame by a lip or clamps (it's
  only 4–8 mm thick).
- The mask covers everything outside the 196 × 147 mm image.
- Leave access to the ports, and space and airflow for the Pi behind.

## Input and sound

- A wall-mounted PiZXel runs as a background service with no terminal, so
  the current keyboard driver (which reads the terminal) gets no keys. It
  needs a new input driver: see below.
- Controls could be a USB or Bluetooth keyboard or game controller, buttons
  or a rotary encoder on the GPIO headers, or a phone remote.
- Sound can go down the HDMI cable to the F13NA's speaker.

## Engine work needed

None of this is started. Everything fits the existing design as new drivers
and options, and local modes keep working as they are.

1. **Framebuffer driver:**
   - 32-bit colour: recent Raspberry Pi OS uses a 32-bit framebuffer and the
     driver only writes 16-bit (RGB565), so today the image would be garbled
   - pixel shift (see [Burn-in](#burn-in))
   - optional dot mask
   - a scale setting, and centring within the screen
2. **Input driver** for keyboards and game controllers through Linux input
   devices (`/dev/input`), so PiZXel gets keys without a terminal. Later,
   GPIO buttons or a rotary encoder, or a phone remote.
3. **Audio over HDMI** in framebuffer mode (there's no audio there yet).
4. **Running on the Pi:** a systemd service to start on boot, a local frame
   rate cap (about 30 fps), and a measurement run on the Zero 2 W before
   anything goes on the wall.

## Alternatives considered

### Real LED panels, 1.25 mm pitch (P1.25)

The route with genuine LEDs. P1.25 indoor video-wall modules come in
320 × 160 mm with 256 × 128 pixels
([Unit LED](https://www.unit-led.com/p1-25-indoor-led-module),
[Colorlit](https://www.colorlitled.com/p1-25-indoor-led-module/)): two
stacked give 256×256 at 320 × 320 mm. 256×192 at P1.25 would be
320 × 240 mm.

- They scan 64 rows at a time with video-wall driver chips, so a Pi can't
  drive them directly. Use a
  [Colorlight 5A-75B](https://www.colorlight.net/colorlight-5a-75b-led-receiving-card/)
  receiver card (about £15–25): the Pi sends frames over Ethernet, and the
  card drives the panels at high refresh. There are open-source senders
  ([haraldkubota/colorlight](https://github.com/haraldkubota/colorlight),
  [kostaman/LED_Matrix-1](https://github.com/kostaman/LED_Matrix-1)). The
  card is configured once for the modules' chips, with Colorlight's Windows
  software.
- In PiZXel it would be a new display driver sending frames over Ethernet.
- Very bright (600–1,000 nits, so run dimmed), needs a 5 V supply of 20 A or
  more, and comes mostly from Chinese LED suppliers.

### 2 mm hobby panels (P2)

[Waveshare 64×64 P2 panels](https://www.waveshare.com/rgb-matrix-p2-64x64.htm)
(128 × 128 mm, ~$29 each). 12 make 256×192, driven from a Pi 4 or 5 with
the [Adafruit Triple LED Matrix Bonnet](https://www.adafruit.com/product/6358)
(three chains of four) and
[rpi-rgb-led-matrix](https://github.com/hzeller/rpi-rgb-led-matrix). Easy
and well supported, but 512 × 384 mm: bigger than we want.

### A small CRT

The Spectrum's own display, and emissive, but it doesn't meet the
low-power goal.
