"""
MatrixOS Device Manager

Central registry and lifecycle manager for all device drivers.
Handles platform detection, driver selection, and device initialization.
"""

import json
import os
import platform as platform_module
from typing import Dict, List, Optional, Type
from .base import DisplayDriver, InputDriver


class DeviceManager:
    """Manages device drivers throughout MatrixOS lifecycle"""
    
    def __init__(self, config_path: str = None):
        self.display_drivers: Dict[str, Type[DisplayDriver]] = {}
        self.input_drivers: Dict[str, Type[InputDriver]] = {}
        self.active_display: Optional[DisplayDriver] = None
        self.active_inputs: List[InputDriver] = []
        
        # Load configuration
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), '..', 'system_config.json'
            )
        self.config_path = config_path
        self.config = self.load_config()
        
        # Detect platform
        self.platform = self.auto_detect_platform()
    
    def load_config(self) -> dict:
        """Load system configuration"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self.get_default_config()
    
    def save_config(self):
        """Save system configuration"""
        with open(self.config_path, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def get_default_config(self) -> dict:
        """Default configuration"""
        return {
            "display": {
                "width": 256,
                "height": 192,
                "driver": "auto",
                "scale": 4,  # Increased from 3 for better visibility
                "pixel_gap": 0  # 0 = full pixels, 1+ = LED matrix look with gaps
            },
            "input_devices": [],
            "bluetooth": {
                "auto_discover_on_boot": True
            },
            "boot": {
                "show_logo": True,
                "logo_duration": 2.0
            }
        }
    
    def register_display_driver(self, name: str, driver_class: Type[DisplayDriver]):
        """Register a display driver"""
        self.display_drivers[name] = driver_class
    
    def register_input_driver(self, name: str, driver_class: Type[InputDriver]):
        """Register an input driver"""
        self.input_drivers[name] = driver_class
    
    def auto_detect_platform(self) -> str:
        """
        Detect current platform.
        
        Returns:
            str: 'macos', 'linux', 'raspberry-pi', or 'windows'
        """
        system = platform_module.system().lower()
        
        if system == "darwin":
            return "macos"
        elif system == "linux":
            # Check if Raspberry Pi
            try:
                with open("/proc/cpuinfo", 'r') as f:
                    if "Raspberry Pi" in f.read():
                        return "raspberry-pi"
            except:
                pass
            return "linux"
        elif system == "windows":
            return "windows"
        
        return "unknown"
    
    def select_best_display(self, width: int, height: int, **kwargs) -> DisplayDriver:
        """
        Auto-select best display driver for current platform.
        
        Args:
            width: Display width in pixels
            height: Display height in pixels
            **kwargs: Additional driver-specific settings
            
        Returns:
            DisplayDriver: Instantiated driver
        """
        available = []
        
        for name, driver_class in self.display_drivers.items():
            if not driver_class.is_available():
                continue
            
            priority = driver_class.get_priority()
            
            # Boost priority if driver prefers this platform
            preferred_platform = driver_class.get_platform_preference()
            if preferred_platform == self.platform:
                priority += 50
            
            available.append((priority, name, driver_class))
        
        if not available:
            raise RuntimeError("No display driver available!")
        
        # Sort by priority (highest first)
        available.sort(reverse=True, key=lambda x: x[0])
        
        priority, name, driver_class = available[0]
        print(f"[DeviceManager] Selected display driver: {name} (priority: {priority})")
        
        return driver_class(width=width, height=height, **kwargs)
    
    def initialize_display(self, driver_name: str = None) -> bool:
        """
        Initialize display driver.
        
        Args:
            driver_name: Specific driver to use, or None for auto-select
            
        Returns:
            bool: True if successful
        """
        config = self.config.get("display", {})
        width = config.get("width", 256)
        height = config.get("height", 192)
        scale = config.get("scale", 3)
        pixel_gap = config.get("pixel_gap", 0)
        
        print(f"[DeviceManager] Config display section: {config}")
        print(f"[DeviceManager] Extracted: width={width}, height={height}, scale={scale}, pixel_gap={pixel_gap}")
        
        # Check for override in config
        if driver_name is None:
            driver_name = config.get("driver", "auto")
        
        if driver_name == "auto" or driver_name not in self.display_drivers:
            # Auto-select best driver with settings
            self.active_display = self.select_best_display(
                width, height, scale=scale, pixel_gap=pixel_gap
            )
        else:
            # Use specified driver with settings
            driver_class = self.display_drivers[driver_name]
            self.active_display = driver_class(
                width=width, height=height, scale=scale, pixel_gap=pixel_gap
            )
        
        success = self.active_display.initialize()
        
        if success:
            print(f"[DeviceManager] Display initialized: {self.active_display.name}")
        else:
            print(f"[DeviceManager] Display initialization failed!")
        
        return success
    
    def initialize_inputs(self) -> bool:
        """
        Initialize input drivers.
        
        Returns:
            bool: True if at least one input available
        """
        configured_inputs = self.config.get("input_devices", [])
        
        if not configured_inputs:
            print("[DeviceManager] No input devices configured")
            # Auto-detect best input for current display
            return self.initialize_auto_input()
        
        # Initialize configured inputs
        success_count = 0
        for input_config in configured_inputs:
            driver_name = input_config.get("driver")
            if driver_name in self.input_drivers:
                driver_class = self.input_drivers[driver_name]
                driver = driver_class()
                if driver.initialize():
                    self.active_inputs.append(driver)
                    success_count += 1
                    print(f"[DeviceManager] Input initialized: {driver.name}")
        
        # Fallback to auto-detect if no inputs worked
        if success_count == 0:
            return self.initialize_auto_input()
        
        return True
    
    def initialize_auto_input(self) -> bool:
        """Auto-detect best input driver for current display"""
        # If Pygame display is active, try Pygame input first
        if self.active_display and "pygame" in self.active_display.name.lower():
            if "pygame" in self.input_drivers:
                driver_class = self.input_drivers["pygame"]
                if driver_class.is_available():
                    driver = driver_class()
                    if driver.initialize():
                        self.active_inputs.append(driver)
                        print(f"[DeviceManager] Auto-selected: {driver.name}")
                        return True
        
        # Fallback to terminal
        return self.initialize_terminal_input()
    
    def initialize_terminal_input(self) -> bool:
        """Fallback to terminal input"""
        if "terminal" in self.input_drivers:
            driver_class = self.input_drivers["terminal"]
            driver = driver_class()
            if driver.initialize():
                self.active_inputs.append(driver)
                print(f"[DeviceManager] Using fallback: {driver.name}")
                return True
        return False
    
    def poll_inputs(self) -> List:
        """
        Poll all active input devices.
        
        Returns:
            list: Combined list of InputEvent objects
        """
        events = []
        for driver in self.active_inputs:
            events.extend(driver.poll())
        return events
    
    def cleanup(self):
        """Cleanup all active drivers"""
        if self.active_display:
            self.active_display.cleanup()
        
        for driver in self.active_inputs:
            driver.cleanup()
        
        print("[DeviceManager] All devices cleaned up")


# Global instance
_device_manager = None

def get_device_manager() -> DeviceManager:
    """Get the global DeviceManager instance"""
    global _device_manager
    if _device_manager is None:
        _device_manager = DeviceManager()
    return _device_manager
