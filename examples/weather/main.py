#!/usr/bin/env python3
"""
Weather App - Displays weather with background updates

Demonstrates:
- Background data fetching (updates every 5 minutes)
- Real weather API (Open-Meteo - free, no API key!)
- On-screen keyboard for city input
- Persistent storage for settings
- Async data loading
"""

import sys
import os
import time
import random
import urllib.request
import urllib.parse
import json

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from matrixos.app_framework import App
from matrixos.input import InputEvent
from matrixos.async_tasks import schedule_task, TaskResult
from matrixos import network, layout, storage, keyboard


class WeatherApp(App):
    """Weather display with background updates."""

    def __init__(self):
        super().__init__("Weather")
        
        # Load saved city or use default
        self.location = storage.get('weather.city', default='Cardiff, UK')
        self.latitude = storage.get('weather.latitude', default=51.48)
        self.longitude = storage.get('weather.longitude', default=-3.18)
        
        self.temperature = 20
        self.condition = "sunny"
        self.last_fetch = 0
        self.fetch_interval = 300  # Fetch every 5 minutes
        self.loading = False
        self.update_count = 0
        self.last_condition = None
        
        # Use real API by default (Open-Meteo is free!)
        self.use_demo_mode = storage.get('weather.demo_mode', default=False)

        # Weather conditions
        self.conditions = [
            ("sunny", (255, 255, 0)),
            ("cloudy", (150, 150, 150)),
            ("rainy", (100, 100, 255)),
            ("stormy", (128, 0, 128)),
        ]

    def get_help_text(self):
        """Return app-specific help."""
        return [("R", "Refresh"), ("C", "Change city")]

    def on_activate(self):
        """App becomes active."""
        # Trigger immediate fetch when activated
        self.fetch_weather()

    def on_background_tick(self):
        """Update in background."""
        current_time = time.time()

        # Fetch weather periodically
        if current_time - self.last_fetch >= self.fetch_interval:
            old_condition = self.condition
            self.fetch_weather()

            # Only request attention for severe weather (storms)
            # Rainy weather in Cardiff is too common to interrupt!
            if old_condition != self.condition and not self.active:
                if self.condition == "stormy":
                    self.request_attention(priority='normal')

    def fetch_weather(self):
        """Fetch weather data using async network (non-blocking!).

        Uses Open-Meteo API (free, no API key required!)
        https://open-meteo.com/
        """
        if self.loading:
            return  # Already fetching
        
        self.loading = True
        self.last_fetch = time.time()
        
        if self.use_demo_mode:
            # Demo mode: Simulate network fetch
            def fetch_in_background():
                """This runs in a background thread - doesn't block UI!"""
                time.sleep(0.5)  # Simulate network delay
                
                # Generate random weather (for demo)
                weather_choices = ["rainy"] * 4 + ["cloudy"] * 3 + ["sunny"] * 2 + ["stormy"] * 1
                condition = random.choice(weather_choices)
                temperature = random.randint(8, 18)
                
                return {
                    'condition': condition,
                    'temperature': temperature
                }
            
            def on_fetch_complete(result: TaskResult):
                """This runs on main thread when fetch completes."""
                self.loading = False
                
                if result.success:
                    data = result.result
                    old_condition = self.condition
                    
                    self.condition = data['condition']
                    self.temperature = data['temperature']
                    self.update_count += 1
                    self.dirty = True
                    
                    # Request attention for severe weather (storms)
                    if old_condition != self.condition and not self.active:
                        if self.condition == "stormy":
                            self.request_attention(priority='normal')
                else:
                    print(f"Weather fetch failed: {result.error}")
            
            schedule_task(fetch_in_background, on_fetch_complete, self.name)
        else:
            # Real API mode using Open-Meteo (free!)
            def fetch_in_background():
                """Fetch from Open-Meteo API."""
                try:
                    # Open-Meteo API endpoint
                    url = f"https://api.open-meteo.com/v1/forecast?latitude={self.latitude}&longitude={self.longitude}&current=temperature_2m,weathercode&timezone=auto"
                    
                    req = urllib.request.Request(url)
                    req.add_header('User-Agent', 'MatrixOS/1.0')
                    
                    with urllib.request.urlopen(req, timeout=10) as response:
                        data = json.loads(response.read().decode())
                    
                    # Parse response
                    current = data.get('current', {})
                    temp = current.get('temperature_2m', 20)
                    weather_code = current.get('weathercode', 0)
                    
                    # Map WMO weather codes to our conditions
                    # https://open-meteo.com/en/docs
                    if weather_code in [0, 1]:  # Clear/mainly clear
                        condition = 'sunny'
                    elif weather_code in [2, 3]:  # Partly cloudy/overcast
                        condition = 'cloudy'
                    elif weather_code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:  # Rain
                        condition = 'rainy'
                    elif weather_code in [95, 96, 99]:  # Thunderstorm
                        condition = 'stormy'
                    else:
                        condition = 'cloudy'
                    
                    return {
                        'temperature': int(temp),
                        'condition': condition
                    }
                
                except Exception as e:
                    raise Exception(f"Weather API error: {e}")
            
            def on_fetch_complete(result: TaskResult):
                """Called when API response arrives."""
                self.loading = False
                
                if result.success:
                    data = result.result
                    old_condition = self.condition
                    
                    self.temperature = data['temperature']
                    self.condition = data['condition']
                    self.update_count += 1
                    self.dirty = True
                    
                    # Request attention for severe weather
                    if old_condition != self.condition and not self.active:
                        if self.condition == "stormy":
                            self.request_attention(priority='normal')
                else:
                    print(f"Weather fetch failed: {result.error}")
                    # Fall back to demo mode if API fails
                    self.use_demo_mode = True
            
            schedule_task(fetch_in_background, on_fetch_complete, self.name)

    def on_event(self, event):
        """Handle input."""
        if event.key == 'r' or event.key == 'R':
            # Manual refresh
            self.fetch_weather()
            return True
        elif event.key == 'c' or event.key == 'C':
            # Change city
            self.change_city()
            return True
        return False
    
    def change_city(self):
        """Open keyboard to change city."""
        # This needs to be called from the main event loop
        # We'll set a flag that the OS can check
        self.needs_keyboard = True
        self.dirty = True
    
    def handle_city_input(self, matrix, input_handler):
        """Handle city input with keyboard (called by OS if needed)."""
        new_city = keyboard.show_keyboard(
            matrix, input_handler,
            prompt="Enter city:",
            initial=self.location
        )
        
        if new_city and new_city != self.location:
            # Geocode the city to get coordinates
            self.geocode_city(new_city)
        
        self.needs_keyboard = False
        self.dirty = True
    
    def geocode_city(self, city_name: str):
        """Convert city name to coordinates using geocoding."""
        def geocode_in_background():
            """Geocode city name."""
            try:
                # Use Open-Meteo geocoding API (free!)
                query = urllib.parse.quote(city_name)
                url = f"https://geocoding-api.open-meteo.com/v1/search?name={query}&count=1&language=en&format=json"
                
                req = urllib.request.Request(url)
                req.add_header('User-Agent', 'MatrixOS/1.0')
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = json.loads(response.read().decode())
                
                if 'results' in data and len(data['results']) > 0:
                    result = data['results'][0]
                    return {
                        'name': result.get('name', city_name),
                        'country': result.get('country', ''),
                        'latitude': result.get('latitude'),
                        'longitude': result.get('longitude')
                    }
                else:
                    raise Exception("City not found")
            
            except Exception as e:
                raise Exception(f"Geocoding error: {e}")
        
        def on_geocode_complete(result: TaskResult):
            """Update location when geocoding completes."""
            if result.success:
                data = result.result
                self.location = f"{data['name']}, {data['country']}"
                self.latitude = data['latitude']
                self.longitude = data['longitude']
                
                # Save to storage
                storage.set('weather.city', self.location)
                storage.set('weather.latitude', self.latitude)
                storage.set('weather.longitude', self.longitude)
                
                # Fetch weather for new location
                self.fetch_weather()
            else:
                print(f"Geocoding failed: {result.error}")
            
            self.dirty = True
        
        schedule_task(geocode_in_background, on_geocode_complete, self.name)

    def render(self, matrix):
        """Draw weather UI - responsive to screen size!"""
        width = matrix.width
        height = matrix.height
        icon_size = layout.get_icon_size(matrix)  # 16px for 64×64, 32px for 128×128

        # Title with location
        matrix.text("WEATHER", 2, 2, (0, 255, 255))
        matrix.text(self.location.upper(), 2, 10, (100, 100, 100))

        if self.loading:
            layout.center_text(matrix, "LOADING...", color=(150, 150, 150))
            return

        # Weather icon (centered at top, size depends on resolution)
        icon_y = 20 if width < 100 else 30
        icon_color = next(c[1] for c in self.conditions if c[0] == self.condition)
        scale = icon_size / 16  # Scale factor for larger displays

        if self.condition == "sunny":
            # Sun
            radius = int(8 * scale)
            matrix.circle(width // 2, icon_y, radius, icon_color, fill=True)
            # Rays
            for angle in range(0, 360, 45):
                import math
                rad = math.radians(angle)
                x1 = int(width // 2 + (10 * scale) * math.cos(rad))
                y1 = int(icon_y + (10 * scale) * math.sin(rad))
                x2 = int(width // 2 + (14 * scale) * math.cos(rad))
                y2 = int(icon_y + (14 * scale) * math.sin(rad))
                matrix.line(x1, y1, x2, y2, icon_color)

        elif self.condition == "cloudy":
            # Cloud (scaled for resolution)
            r1, r2, r3 = int(4 * scale), int(5 * scale), int(4 * scale)
            matrix.circle(width // 2 - int(4 * scale), icon_y, r1, icon_color, fill=True)
            matrix.circle(width // 2, icon_y - int(2 * scale), r2, icon_color, fill=True)
            matrix.circle(width // 2 + int(4 * scale), icon_y, r3, icon_color, fill=True)
            matrix.rect(width // 2 - int(8 * scale), icon_y, int(16 * scale), int(4 * scale), icon_color, fill=True)

        elif self.condition == "rainy":
            # Cloud + rain (scaled)
            r1, r2, r3 = int(3 * scale), int(4 * scale), int(3 * scale)
            matrix.circle(width // 2 - int(3 * scale), icon_y - int(4 * scale), r1, (150, 150, 150), fill=True)
            matrix.circle(width // 2, icon_y - int(6 * scale), r2, (150, 150, 150), fill=True)
            matrix.circle(width // 2 + int(3 * scale), icon_y - int(4 * scale), r3, (150, 150, 150), fill=True)
            # Rain drops
            for i in range(int(3 * scale)):
                x = width // 2 - int(4 * scale) + i * int(4 * scale / 3)
                matrix.line(x, icon_y + int(2 * scale), x, icon_y + int(6 * scale), icon_color)

        elif self.condition == "stormy":
            # Cloud + lightning (scaled)
            r1, r2, r3 = int(3 * scale), int(4 * scale), int(3 * scale)
            matrix.circle(width // 2 - int(3 * scale), icon_y - int(4 * scale), r1, (100, 100, 100), fill=True)
            matrix.circle(width // 2, icon_y - int(6 * scale), r2, (100, 100, 100), fill=True)
            matrix.circle(width // 2 + int(3 * scale), icon_y - int(4 * scale), r3, (100, 100, 100), fill=True)
            # Lightning bolt
            cx = width // 2
            matrix.line(cx, icon_y, cx - int(2 * scale), icon_y + int(4 * scale), (255, 255, 0))
            matrix.line(cx - int(2 * scale), icon_y + int(4 * scale), cx + int(1 * scale), icon_y + int(4 * scale), (255, 255, 0))
            matrix.line(cx + int(1 * scale), icon_y + int(4 * scale), cx - int(1 * scale), icon_y + int(8 * scale), (255, 255, 0))

        # Temperature (large, centered)
        temp_text = f"{self.temperature}C"
        temp_y = height // 2 + int(8 * scale)
        layout.center_text(matrix, temp_text, temp_y, (255, 255, 255))

        # Condition text
        cond_y = temp_y + 10
        layout.center_text(matrix, self.condition.upper(), cond_y, icon_color)

        # Update info at bottom
        time_since = int(time.time() - self.last_fetch)
        mins = time_since // 60
        if mins > 0:
            status_text = f"{mins}m ago"
        else:
            status_text = f"{time_since}s ago"
        layout.center_text(matrix, status_text, height - 10, (80, 80, 80))


def run(os_context):
    """Entry point called by OS."""
    app = WeatherApp()
    os_context.register_app(app)
    os_context.switch_to_app(app)
    os_context.run()  # Start the OS event loop


def main():
    """Standalone testing mode."""
    from matrixos.led_api import create_matrix
    from matrixos.input import KeyboardInput
    from matrixos.config import parse_matrix_args
    from matrixos.app_framework import OSContext

    args = parse_matrix_args("Weather App")
    matrix = create_matrix(args.width, args.height, args.color_mode)

    print("\n" + "="*64)
    print("WEATHER APP - Standalone Mode")
    print("="*64)
    print("\nControls:")
    print("  R     - Refresh weather")
    print("  ESC   - Quit")
    print("\nNote: Weather updates automatically every 5 seconds,")
    print("      even when running in background!")
    print("\n" + "="*64 + "\n")

    with KeyboardInput() as input_handler:
        os = OSContext(matrix, input_handler)
        app = WeatherApp()
        os.register_app(app)
        os.switch_to_app(app)
        os.run()

    print("\nWeather app closed.")


# App instance for launcher
app = WeatherApp()


if __name__ == '__main__':
    main()
