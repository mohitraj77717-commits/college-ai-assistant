import os
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from .env file inside backend directory
ENV_FILE = BASE_DIR / '.env'
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    # Also attempt loading from default environment if present
    load_dotenv()


class Config:
    """Application configuration settings."""

    # Secret key for session management and token signing
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Database configuration
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'college.db')
    DATABASE_PATH = str(BASE_DIR / DATABASE_NAME)

    # Uploads folder configuration
    UPLOAD_FOLDER = str(BASE_DIR / os.getenv('UPLOAD_FOLDER', 'uploads'))
    ALLOWED_EXTENSIONS = {'pdf', 'csv', 'xlsx', 'xls'}
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16 MB limit

    # Initial Administrator bootstrap key
    ADMIN_SETUP_KEY = os.getenv('ADMIN_SETUP_KEY', 'university_bootstrap_admin_key_2026')

    # Google Gemini API Key
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()

    @classmethod
    def is_gemini_configured(cls) -> bool:
        """
        Check if a non-placeholder Gemini API key is configured.
        Returns True/False safely without ever exposing or printing the actual key.
        """
        key = cls.GEMINI_API_KEY
        if not key:
            return False
        # Check against common placeholder values
        placeholders = {
            'your_api_key_here',
            'your_gemini_api_key_here',
            'placeholder',
            'change_me',
            'none'
        }
        return key.lower() not in placeholders and len(key) >= 10
