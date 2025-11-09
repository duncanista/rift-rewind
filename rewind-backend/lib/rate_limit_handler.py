'''
Rate limit handling utilities for Riot API requests.
'''

import time
import requests
from typing import Callable, Any, Optional


def make_request_with_retry(
    request_func: Callable[[], requests.Response],
    max_retries: int = 10,
    retry_delay_ms: int = 100
) -> requests.Response:
    """
    Make an HTTP request with automatic retry on 429 (rate limit) errors.
    Uses exponential backoff for retries.
    
    Args:
        request_func: A function that makes the HTTP request and returns a Response
        max_retries: Maximum number of retries (default: 10)
        retry_delay_ms: Initial delay between retries in milliseconds (default: 100ms)
    
    Returns:
        The Response object from the successful request
    
    Raises:
        requests.HTTPError: If the request fails after all retries
    """
    retry_count = 0
    base_delay = retry_delay_ms / 1000.0
    
    while retry_count <= max_retries:
        try:
            response = request_func()
            
            # If successful, return immediately
            if response.status_code == 200:
                return response
            
            # Handle 429 rate limit
            if response.status_code == 429:
                if retry_count < max_retries:
                    retry_after = response.headers.get('Retry-After')
                    if retry_after:
                        # Use Retry-After header if provided (in seconds)
                        delay = int(retry_after)
                    else:
                        # Use exponential backoff: base_delay * 2^retry_count
                        delay = min(base_delay * (2 ** retry_count), 60)  # Cap at 60 seconds
                    
                    print(f"Rate limit hit (429). Retrying in {delay}s (attempt {retry_count + 1}/{max_retries})")
                    time.sleep(delay)
                    retry_count += 1
                    continue
                else:
                    # Max retries reached
                    response.raise_for_status()
                    return response
            
            # For other errors, raise immediately
            response.raise_for_status()
            return response
                
        except requests.HTTPError as e:
            # If it's not a 429, raise immediately
            if e.response and e.response.status_code != 429:
                raise
            
            # If we've exhausted retries, raise
            if retry_count >= max_retries:
                raise
            
            # Handle 429
            retry_after = e.response.headers.get('Retry-After') if e.response else None
            if retry_after:
                delay = int(retry_after)
            else:
                # Use exponential backoff
                delay = min(base_delay * (2 ** retry_count), 60)  # Cap at 60 seconds
            
            print(f"Rate limit hit (429). Retrying in {delay}s (attempt {retry_count + 1}/{max_retries})")
            time.sleep(delay)
            retry_count += 1
    
    # Should never reach here, but just in case
    raise requests.HTTPError("Max retries exceeded for rate limit")

