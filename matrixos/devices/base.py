"""
Base classes for MatrixOS device drivers

All display and input drivers inherit from these abstract base classes.
"""

from abc import ABC, abstractmethod
from typing import Tuple, List, Optional


class DisplayDriver(ABC):
    """Abstract base class for all display drivers"""
    
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.color_mode = "rgb"  # Always RGB for new drivers
        self.name = "Generic Display"
        self.platform = None  # "macos", "linux", "raspberry-pi", etc.
    
    @abstractmethod
    def initialize(self) -> bool:
        """
        Initialize hardware/connection.
        
        Returns:
            bool: True if initialization successful
        """
        pass
    
    @abstractmethod
    def set_pixel(self, x: int, y: int, color: Tuple[int, int, int]):
        """Set a single pixel to the given RGB color"""
        pass
    
    @abstractmethod
    def get_pixel(self, x: int, y: int) -> Tuple[int, int, int]:
        """Get pixel color at position"""
        pass
    
    @abstractmethod
    def clear(self):
        """Clear the entire display"""
        pass
    
    def fill(self, color: Tuple[int, int, int] = (0, 0, 0)):
        """Fill entire display with color (default implementation)"""
        for y in range(self.height):
            for x in range(self.width):
                self.set_pixel(x, y, color)
    
    @abstractmethod
    def show(self):
        """Push buffer to actual display hardware"""
        pass
    
    @abstractmethod
    def cleanup(self):
        """Release resources and cleanup"""
        pass
    
    @classmethod
    def is_available(cls) -> bool:
        """
        Check if this driver can run on current platform.
        
        Returns:
            bool: True if driver dependencies are met
        """
        return True
    
    @classmethod
    def get_priority(cls) -> int:
        """
        Priority for auto-selection (higher = preferred).
        
        Returns:
            int: Priority value (0-100)
        """
        return 0
    
    @classmethod
    def get_platform_preference(cls) -> Optional[str]:
        """
        Preferred platform for this driver.
        
        Returns:
            str: Platform name or None for all platforms
        """
        return None


class InputDriver(ABC):
    """Abstract base class for all input drivers"""
    
    def __init__(self):
        self.name = "Generic Input"
        self.device_id = None
        self.connected = False
    
    @abstractmethod
    def initialize(self) -> bool:
        """
        Initialize hardware/connection.
        
        Returns:
            bool: True if initialization successful
        """
        pass
    
    @abstractmethod
    def poll(self) -> List:
        """
        Poll for input events.
        
        Returns:
            list: List of InputEvent objects
        """
        pass
    
    def get_key(self, timeout: float = 0.0):
        """
        Get next key event (compatibility method for old API).
        
        Args:
            timeout: Timeout in seconds (0 = non-blocking)
            
        Returns:
            InputEvent or None
        """
        events = self.poll()
        return events[0] if events else None
    
    @abstractmethod
    def cleanup(self):
        """Release resources and cleanup"""
        pass
    
    @classmethod
    def is_available(cls) -> bool:
        """
        Check if this driver can run on current platform.
        
        Returns:
            bool: True if driver dependencies are met
        """
        return True
    
    @classmethod
    def requires_pairing(cls) -> bool:
        """
        Does this driver need Bluetooth pairing?
        
        Returns:
            bool: True if Bluetooth pairing required
        """
        return False
    
    @classmethod
    def get_device_class(cls) -> str:
        """
        Device class identifier.
        
        Returns:
            str: 'keyboard', 'remote', 'gamepad', 'generic'
        """
        return "generic"
    
    @classmethod
    def get_priority(cls) -> int:
        """
        Priority for auto-selection (higher = preferred).
        
        Returns:
            int: Priority value (0-100)
        """
        return 0
