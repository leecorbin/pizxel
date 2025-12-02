#!/bin/bash
# Run PiZXel with automatic display cleanup on exit

cd "$(dirname "$0")"

# Trap exit to clear display
cleanup() {
    # Turn off backlight (set brightness to 0)
    echo 0 | sudo tee /sys/class/backlight/10-0045/brightness > /dev/null 2>&1
    
    # Clear framebuffer
    dd if=/dev/zero of=/dev/fb0 bs=768000 count=1 2>/dev/null
    
    # Clear console
    clear
    setterm -cursor on
}

trap cleanup EXIT INT TERM

# Run PiZXel
npm start "$@"
