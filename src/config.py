"""
Configuration helpers for LED matrix applications.
Provides command-line argument parsing for common settings.
"""

import argparse


def parse_matrix_args(description=None):
    """
    Parse command-line arguments for matrix configuration.

    Args:
        description: Program description for help text

    Returns:
        Namespace with width, height, color_mode attributes
    """
    parser = argparse.ArgumentParser(
        description=description or "LED Matrix Application"
    )

    parser.add_argument(
        '--width',
        type=int,
        default=64,
        help='Matrix width in pixels (default: 64, typically multiples of 16)'
    )

    parser.add_argument(
        '--height',
        type=int,
        default=64,
        help='Matrix height in pixels (default: 64, typically multiples of 16)'
    )

    parser.add_argument(
        '--resolution',
        type=str,
        choices=['64x64', '128x64', '128x128', '256x192'],
        help='Shortcut for common resolutions (overrides --width and --height)'
    )

    parser.add_argument(
        '--mono',
        action='store_true',
        help='Use monochrome mode instead of RGB'
    )

    args = parser.parse_args()

    # Handle resolution shortcut
    if args.resolution:
        if args.resolution == '64x64':
            args.width = 64
            args.height = 64
        elif args.resolution == '128x64':
            args.width = 128
            args.height = 64
        elif args.resolution == '128x128':
            args.width = 128
            args.height = 128
        elif args.resolution == '256x192':
            args.width = 256
            args.height = 192

    # Set color mode
    args.color_mode = 'mono' if args.mono else 'rgb'

    return args


def get_matrix_config():
    """
    Get matrix configuration with defaults.
    Simple version without argparse for when you just want defaults.

    Returns:
        dict with width, height, color_mode
    """
    return {
        'width': 64,
        'height': 64,
        'color_mode': 'rgb'
    }
