import os
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
from config import Config

ALLOWED_EXTENSIONS = {'pdf'}
MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024  # 16 MB


def is_allowed_file(filename: str, allowed_extensions=None) -> bool:
    """Check if file extension is permitted."""
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_EXTENSIONS
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def save_pdf_upload(file_storage, subfolder: str = '') -> dict:
    """
    Validate, sanitize, and save an uploaded PDF file.
    Uses UUID prefixes to prevent filename collisions and path traversal attacks.
    Returns metadata dictionary or raises ValueError.
    """
    if not file_storage or not file_storage.filename:
        raise ValueError("No file provided for upload.")

    original_filename = file_storage.filename.strip()
    if not is_allowed_file(original_filename, {'pdf'}):
        raise ValueError("Only PDF documents (.pdf) are permitted for official notices.")

    # Secure the original filename and create unique stored name
    cleaned_name = secure_filename(original_filename)
    unique_prefix = uuid.uuid4().hex[:12]
    stored_filename = f"{unique_prefix}_{cleaned_name}"

    target_dir = Path(Config.UPLOAD_FOLDER)
    if subfolder:
        target_dir = target_dir / subfolder
    target_dir.mkdir(parents=True, exist_ok=True)

    destination_path = target_dir / stored_filename

    # Save file to destination
    file_storage.save(str(destination_path))
    file_size = destination_path.stat().st_size

    if file_size > MAX_FILE_SIZE_BYTES:
        destination_path.unlink(missing_ok=True)
        raise ValueError(f"Uploaded file exceeds maximum size limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.")

    return {
        'original_filename': original_filename,
        'stored_filename': stored_filename,
        'stored_path': str(destination_path),
        'file_size': file_size
    }


def resolve_safe_path(stored_path: str) -> Path:
    """
    Ensure the path is strictly within the UPLOAD_FOLDER to prevent directory traversal.
    """
    resolved = Path(stored_path).resolve()
    base_upload = Path(Config.UPLOAD_FOLDER).resolve()

    if not str(resolved).startswith(str(base_upload)):
        raise PermissionError("Access denied: File path traversal detected.")

    if not resolved.exists():
        raise FileNotFoundError("The requested document does not exist on disk.")

    return resolved
