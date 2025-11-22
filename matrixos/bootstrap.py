"""
MatrixOS Bootstrap
Initializes the OS and launches the launcher application
"""

from pathlib import Path
from matrixos.config import parse_matrix_args
from matrixos.app_framework import OSContext
from matrixos.builtin_apps.launcher import Launcher
from matrixos.devices import DeviceManager


def boot(project_root=None):
    """Bootstrap MatrixOS and launch the launcher.
    
    Args:
        project_root: Path to project root (where apps/ folder is located)
                     If None, uses the current directory
    
    Returns:
        Exit code (0 for success)
    """
    args = parse_matrix_args("MatrixOS Launcher")

    print("\n" + "="*64)
    print("MATRIXOS")
    print("="*64)
    print(f"\nResolution: {args.width}x{args.height} ({args.color_mode.upper()})")
    print("\nControls:")
    print("  Arrow Keys - Navigate")
    print("  Enter      - Launch app")
    print("  Backspace  - Go back")
    print("  ESC        - Exit to launcher")
    print("  Tab        - Help")
    print("\n" + "="*64 + "\n")

    # Get project root directory
    if project_root is None:
        project_root = Path.cwd()
    else:
        project_root = Path(project_root)

    # Initialize device manager with auto-detection
    device_manager = DeviceManager()
    
    # Override display config with CLI args
    device_manager.config["display"]["width"] = args.width
    device_manager.config["display"]["height"] = args.height
    
    # Register display drivers
    from matrixos.devices.display.terminal import TerminalDisplayDriver
    device_manager.register_display_driver("terminal", TerminalDisplayDriver)
    
    try:
        from matrixos.devices.display.macos_window import MacOSWindowDriver
        device_manager.register_display_driver("macos_window", MacOSWindowDriver)
    except ImportError:
        pass  # Pygame not available
    
    # Register input drivers
    from matrixos.devices.input.terminal import TerminalInputDriver
    device_manager.register_input_driver("terminal", TerminalInputDriver)
    
    try:
        from matrixos.devices.input.pygame_input import PygameInputDriver
        device_manager.register_input_driver("pygame", PygameInputDriver)
    except ImportError:
        pass  # Pygame not available
    
    # Initialize display (auto-selects best: pygame window on Mac, or terminal fallback)
    if not device_manager.initialize_display():
        print("ERROR: Failed to initialize display!")
        return 1
    
    # Initialize input (auto-selects: pygame keyboard if window active, or terminal)
    if not device_manager.initialize_inputs():
        print("ERROR: Failed to initialize input!")
        return 1
    
    # Wrap the display driver with LED API
    from matrixos.led_api import LEDMatrix
    matrix = LEDMatrix(args.width, args.height, args.color_mode)
    # Replace the internal display with our device driver
    matrix.display = device_manager.active_display
    
    # Override show() to use device driver instead of terminal renderer
    def show_via_driver(*args, **kwargs):
        device_manager.active_display.show()
    matrix.show = show_via_driver
    
    input_handler = device_manager.active_inputs[0]  # Use first input device

    # Run launcher
    try:
        # Create OS context for framework apps
        os_context = OSContext(matrix, input_handler)

        launcher = Launcher(matrix, input_handler, os_context, apps_base_dir=project_root)

        if len(launcher.apps) == 0:
            print("No apps found! Create an app folder with main.py and config.json.")
            return 1

        print(f"Found {len(launcher.apps)} apps:")
        for app in launcher.apps:
            print(f"  - {app.name} (v{app.version}) by {app.author}")
        print()

        launcher.run()
    
    finally:
        # Clean shutdown of all devices
        device_manager.cleanup()

    # Clean exit
    print("\n" + "="*64)
    print("MatrixOS shutdown.")
    print("="*64 + "\n")
    
    return 0
