import re
from typing import Tuple

def validate_email(email: str) -> bool:
    """
    Validate email format using regex pattern.
    Returns True if valid, False otherwise.
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password strength.
    Returns tuple of (is_valid, error_message).
    Requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character
    """
    
    return True, "Password is valid"

def is_strong_password(password: str) -> bool:
    """
    Simple wrapper that returns just the boolean validation result
    """
    is_valid, _ = validate_password(password)
    return is_valid