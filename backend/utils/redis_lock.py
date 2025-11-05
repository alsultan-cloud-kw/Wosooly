"""
Redis lock implementation for Docker containerized Redis
File: tasks/redis_lock.py or utils/redis_lock.py
"""

import os
from redis import Redis
from typing import Optional

# Get Redis configuration from environment variables
REDIS_URL = os.getenv("REDIS_URL")

# Initialize Redis client using the Docker service name
# The service name 'wc_solutions_redis_backend' or its alias 'redis_backend' 
# acts as the hostname in Docker network
redis_client = Redis.from_url(
    REDIS_URL,
    decode_responses=True,  # Return strings instead of bytes
    socket_connect_timeout=5,
    socket_timeout=5,
    retry_on_timeout=True
)


def acquire_sync_lock(client_id: int, timeout: int = 300) -> bool:
    """
    Acquire a distributed lock for syncing a specific client.
    
    Args:
        client_id: The ID of the client to lock
        timeout: Lock expiration time in seconds (default 5 minutes)
        
    Returns:
        True if lock was acquired, False if already locked
    """
    lock_key = f"sync_lock_client_{client_id}"
    try:
        # SET with NX (only set if not exists) and EX (expiration)
        result = redis_client.set(lock_key, "1", nx=True, ex=timeout)
        return result is not None and result
    except Exception as e:
        print(f"❌ Failed to acquire lock for client {client_id}: {e}")
        # Return False to prevent sync if Redis is down
        return False


def release_sync_lock(client_id: int) -> bool:
    """
    Release the sync lock for a specific client.
    
    Args:
        client_id: The ID of the client to unlock
        
    Returns:
        True if lock was released, False otherwise
    """
    lock_key = f"sync_lock_client_{client_id}"
    try:
        result = redis_client.delete(lock_key)
        return result > 0
    except Exception as e:
        print(f"⚠️ Failed to release lock for client {client_id}: {e}")
        return False


def check_sync_lock(client_id: int) -> bool:
    """
    Check if a sync lock exists for a client without modifying it.
    
    Args:
        client_id: The ID of the client to check
        
    Returns:
        True if lock exists, False otherwise
    """
    lock_key = f"sync_lock_client_{client_id}"
    try:
        return redis_client.exists(lock_key) > 0
    except Exception as e:
        print(f"⚠️ Failed to check lock for client {client_id}: {e}")
        return False


def get_lock_ttl(client_id: int) -> Optional[int]:
    """
    Get remaining TTL (time to live) for a client's sync lock.
    
    Args:
        client_id: The ID of the client
        
    Returns:
        Remaining seconds until lock expires, or None if no lock exists
    """
    lock_key = f"sync_lock_client_{client_id}"
    try:
        ttl = redis_client.ttl(lock_key)
        return ttl if ttl > 0 else None
    except Exception as e:
        print(f"⚠️ Failed to get lock TTL for client {client_id}: {e}")
        return None


# Test Redis connection on import
def test_redis_connection():
    """Test if Redis connection is working"""
    try:
        redis_client.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print(f"   Using REDIS_URL: {REDIS_URL}")
        return False


# Run connection test when module is imported
if __name__ == "__main__":
    test_redis_connection()