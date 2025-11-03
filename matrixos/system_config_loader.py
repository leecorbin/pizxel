"""
MatrixOS System Configuration

Manages system-wide configuration set by installer/admin.
Separate from user settings which are managed in the Settings app.

Configuration strategy:
- Template in repo: matrixos/system_config.json (tracked, updated on git pull)
- Runtime config: settings/config/system_config.json or ~/settings/config/system_config.json (ignored)
- On first run: copies template to runtime location
- On updates: merges template with user config (user values win)
"""

import os
import json
import shutil
from pathlib import Path


_config_cache = None


def get_project_root():
    """Get project root directory."""
    return Path(__file__).parent.parent


def get_template_config_path():
    """Get path to template system config in repo."""
    return get_project_root() / "matrixos" / "system_config.json"


def get_runtime_config_path():
    """Get path to runtime system config (user's actual config).
    
    Tries in order:
    1. PROJECT_ROOT/settings/config/system_config.json (local to project)
    2. ~/settings/config/system_config.json (user's home directory)
    """
    # Try local settings first
    local_settings = get_project_root() / "settings" / "config" / "system_config.json"
    if local_settings.parent.exists() or not Path.home().exists():
        return local_settings
    
    # Fall back to home directory
    return Path.home() / "settings" / "config" / "system_config.json"


def deep_merge(template, user):
    """Deep merge user config into template config.
    
    User values override template, but new keys from template are added.
    
    Args:
        template: Default configuration dict
        user: User's configuration dict
        
    Returns:
        Merged configuration dict
    """
    result = template.copy()
    
    for key, value in user.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # Recursively merge nested dicts
            result[key] = deep_merge(result[key], value)
        else:
            # User value wins
            result[key] = value
    
    return result


def load_system_config():
    """Load system configuration with defaults.
    
    Strategy:
    1. Load template from repo (matrixos/system_config.json)
    2. Check if runtime config exists
    3. If not: copy template to runtime location (first run)
    4. If yes: merge template with runtime (picks up new settings from updates)
    5. Save merged config back to runtime location
    
    Returns:
        dict: System configuration
    """
    global _config_cache
    
    if _config_cache is not None:
        return _config_cache
    
    template_path = get_template_config_path()
    runtime_path = get_runtime_config_path()
    
    # Load template
    try:
        with open(template_path, 'r') as f:
            template_config = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load template config: {e}")
        template_config = _get_default_config()
    
    # First run - copy template to runtime
    if not runtime_path.exists():
        runtime_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copy(template_path, runtime_path)
            print(f"✅ Created runtime config: {runtime_path}")
        except Exception as e:
            print(f"Warning: Could not create runtime config: {e}")
        
        _config_cache = template_config
        return template_config
    
    # Load existing runtime config
    try:
        with open(runtime_path, 'r') as f:
            runtime_config = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load runtime config: {e}")
        runtime_config = {}
    
    # Merge template with runtime (user values win, new keys added)
    merged_config = deep_merge(template_config, runtime_config)
    
    # Save merged config back (picks up new settings from updates)
    try:
        with open(runtime_path, 'w') as f:
            json.dump(merged_config, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save merged config: {e}")
    
    _config_cache = merged_config
    return merged_config


def _get_default_config():
    """Get hardcoded default configuration (fallback)."""
    return {
        "version": "1.0",
        "system": {
            "emoji_download_enabled": True,
            "emoji_cache_dir": "settings/cache"
        },
        "display": {
            "default_width": 128,
            "default_height": 128,
            "default_brightness": 80
        },
        "apps": {
            "auto_install_dependencies": False,
            "allow_background_apps": True
        }
    }


def save_system_config(config):
    """Save system configuration to runtime location.
    
    Args:
        config: Configuration dict to save
    """
    global _config_cache
    
    runtime_path = get_runtime_config_path()
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(runtime_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        _config_cache = config
        return True
    except Exception as e:
        print(f"Error saving system config: {e}")
        return False


def get_setting(path, default=None):
    """Get a setting by dot-separated path.
    
    Args:
        path: Setting path like "system.emoji_download_enabled"
        default: Default value if not found
        
    Returns:
        Setting value or default
    """
    config = load_system_config()
    
    parts = path.split('.')
    value = config
    
    for part in parts:
        if isinstance(value, dict) and part in value:
            value = value[part]
        else:
            return default
    
    return value


def set_setting(path, value):
    """Set a setting by dot-separated path.
    
    Args:
        path: Setting path like "system.emoji_download_enabled"
        value: Value to set
        
    Returns:
        True if successful
    """
    config = load_system_config()
    
    parts = path.split('.')
    current = config
    
    # Navigate to parent
    for part in parts[:-1]:
        if part not in current:
            current[part] = {}
        current = current[part]
    
    # Set value
    current[parts[-1]] = value
    
    return save_system_config(config)


# Convenience functions
def is_emoji_download_enabled():
    """Check if on-demand emoji downloads are enabled."""
    return get_setting('system.emoji_download_enabled', True)


def set_emoji_download_enabled(enabled):
    """Enable or disable on-demand emoji downloads."""
    return set_setting('system.emoji_download_enabled', enabled)


def get_emoji_cache_dir():
    """Get emoji cache directory path."""
    cache_dir = get_setting('system.emoji_cache_dir', 'settings/cache')
    cache_path = Path(cache_dir)
    
    # If relative path, make it relative to project root
    if not cache_path.is_absolute():
        cache_path = get_project_root() / cache_path
    
    return cache_path


if __name__ == '__main__':
    # Test
    print("System Config Test")
    print("=" * 60)
    
    config = load_system_config()
    print(f"Emoji downloads enabled: {is_emoji_download_enabled()}")
    print(f"Emoji cache dir: {get_emoji_cache_dir()}")
    
    print("\nFull config:")
    print(json.dumps(config, indent=2))
