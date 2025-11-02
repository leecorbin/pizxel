"""
Simple key-value storage for MatrixOS apps.

Uses SQLite for persistence. Each app can store settings
and data using simple get/set operations.

Example:
    from matrixos import storage
    
    # Save a setting
    storage.set('weather.city', 'London, UK')
    
    # Load a setting (with default)
    city = storage.get('weather.city', default='Cardiff, UK')
    
    # Store complex data (JSON serialized automatically)
    storage.set('timer.presets', [60, 300, 900])
    presets = storage.get('timer.presets', default=[])
"""

import sqlite3
import json
import os
from pathlib import Path
from typing import Any, Optional


class Storage:
    """Key-value storage backed by SQLite."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize storage.
        
        Args:
            db_path: Path to SQLite database. If None, uses default location.
        """
        if db_path is None:
            # Store in user's home directory
            config_dir = Path.home() / '.matrixos'
            config_dir.mkdir(exist_ok=True)
            db_path = str(config_dir / 'storage.db')
        
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS storage (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                type TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def set(self, key: str, value: Any) -> None:
        """
        Store a value.
        
        Args:
            key: Storage key (use dotted notation: 'app.setting')
            value: Value to store (strings, numbers, lists, dicts supported)
        """
        # Determine type and serialize
        if isinstance(value, str):
            value_type = 'str'
            value_str = value
        elif isinstance(value, bool):
            value_type = 'bool'
            value_str = json.dumps(value)
        elif isinstance(value, int):
            value_type = 'int'
            value_str = str(value)
        elif isinstance(value, float):
            value_type = 'float'
            value_str = str(value)
        elif isinstance(value, (list, dict)):
            value_type = 'json'
            value_str = json.dumps(value)
        else:
            value_type = 'json'
            value_str = json.dumps(value)
        
        # Store in database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO storage (key, value, type)
            VALUES (?, ?, ?)
        ''', (key, value_str, value_type))
        
        conn.commit()
        conn.close()
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Retrieve a value.
        
        Args:
            key: Storage key
            default: Default value if key doesn't exist
            
        Returns:
            Stored value or default
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT value, type FROM storage WHERE key = ?', (key,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row is None:
            return default
        
        value_str, value_type = row
        
        # Deserialize based on type
        if value_type == 'str':
            return value_str
        elif value_type == 'bool':
            return json.loads(value_str)
        elif value_type == 'int':
            return int(value_str)
        elif value_type == 'float':
            return float(value_str)
        elif value_type == 'json':
            return json.loads(value_str)
        else:
            return value_str
    
    def delete(self, key: str) -> bool:
        """
        Delete a key.
        
        Args:
            key: Storage key
            
        Returns:
            True if key was deleted, False if it didn't exist
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM storage WHERE key = ?', (key,))
        deleted = cursor.rowcount > 0
        
        conn.commit()
        conn.close()
        
        return deleted
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists.
        
        Args:
            key: Storage key
            
        Returns:
            True if key exists
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT 1 FROM storage WHERE key = ? LIMIT 1', (key,))
        exists = cursor.fetchone() is not None
        
        conn.close()
        
        return exists
    
    def keys(self, prefix: str = '') -> list:
        """
        List all keys, optionally filtered by prefix.
        
        Args:
            prefix: Only return keys starting with this prefix
            
        Returns:
            List of matching keys
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if prefix:
            cursor.execute(
                'SELECT key FROM storage WHERE key LIKE ? ORDER BY key',
                (f'{prefix}%',)
            )
        else:
            cursor.execute('SELECT key FROM storage ORDER BY key')
        
        keys = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return keys
    
    def clear(self, prefix: str = '') -> int:
        """
        Clear all keys, or keys matching a prefix.
        
        Args:
            prefix: Only clear keys starting with this prefix
            
        Returns:
            Number of keys deleted
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if prefix:
            cursor.execute('DELETE FROM storage WHERE key LIKE ?', (f'{prefix}%',))
        else:
            cursor.execute('DELETE FROM storage')
        
        deleted = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        return deleted


# Global storage instance (singleton)
_storage = None


def get_storage() -> Storage:
    """Get the global storage instance."""
    global _storage
    if _storage is None:
        _storage = Storage()
    return _storage


# Convenience functions for global storage
def set(key: str, value: Any) -> None:
    """Store a value in global storage."""
    get_storage().set(key, value)


def get(key: str, default: Any = None) -> Any:
    """Retrieve a value from global storage."""
    return get_storage().get(key, default)


def delete(key: str) -> bool:
    """Delete a key from global storage."""
    return get_storage().delete(key)


def exists(key: str) -> bool:
    """Check if key exists in global storage."""
    return get_storage().exists(key)


def keys(prefix: str = '') -> list:
    """List all keys in global storage."""
    return get_storage().keys(prefix)


def clear(prefix: str = '') -> int:
    """Clear keys from global storage."""
    return get_storage().clear(prefix)
