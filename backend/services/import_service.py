"""
Student Import Service for College AI Assistant (Phase 6)
Utilizes Pandas to parse, validate, and preview CSV/Excel files of students.
Detects missing fields, syntax errors, and duplicate emails/roll numbers
before batch inserting records and generating initial student preferences.
"""

import io
import re
import json
import logging
from typing import Dict, Any, List, Tuple
from pathlib import Path

import pandas as pd
from database import query_db, execute_db
from auth import hash_password, validate_email

logger = logging.getLogger('campusai.import')

REQUIRED_FIELDS = {'name', 'email', 'roll_number', 'course'}
DEFAULT_STUDENT_PASSWORD = 'StudentPassword2026'


def normalize_column_name(col: str) -> str:
    """Normalize headers: 'Roll Number' -> 'roll_number', 'E-mail' -> 'email'."""
    clean = str(col).strip().lower()
    clean = re.sub(r'[\s\-]+', '_', clean)
    clean = re.sub(r'[^a-z0-9_]', '', clean)
    # Map common aliases
    aliases = {
        'student_name': 'name',
        'full_name': 'name',
        'e_mail': 'email',
        'email_id': 'email',
        'roll_no': 'roll_number',
        'rollno': 'roll_number',
        'enrollment_no': 'roll_number',
        'program': 'course',
        'branch': 'course',
        'pass': 'password'
    }
    return aliases.get(clean, clean)


def parse_and_preview_student_file(file_stream, filename: str) -> Dict[str, Any]:
    """
    Parses a CSV or Excel file, normalizes columns, and validates every row
    against existing SQLite records and duplicate entries within the file.
    """
    ext = Path(filename).suffix.lower()
    if ext not in ('.csv', '.xlsx', '.xls'):
        return {
            'status': 'error',
            'message': f"Unsupported file format '{ext}'. Please upload a .csv, .xlsx, or .xls file.",
            'total_rows': 0,
            'valid_count': 0,
            'invalid_count': 0,
            'valid_rows': [],
            'invalid_rows': []
        }

    try:
        if ext == '.csv':
            # Support both utf-8 and latin-1 fallback
            try:
                df = pd.read_csv(file_stream, encoding='utf-8')
            except UnicodeDecodeError:
                file_stream.seek(0)
                df = pd.read_csv(file_stream, encoding='latin-1')
        else:
            df = pd.read_excel(file_stream)
    except Exception as e:
        logger.error(f"Error parsing student data file: {e}")
        return {
            'status': 'error',
            'message': f"Failed to read file: {str(e)}",
            'total_rows': 0,
            'valid_count': 0,
            'invalid_count': 0,
            'valid_rows': [],
            'invalid_rows': []
        }

    if df.empty:
        return {
            'status': 'error',
            'message': 'The uploaded file is empty.',
            'total_rows': 0,
            'valid_count': 0,
            'invalid_count': 0,
            'valid_rows': [],
            'invalid_rows': []
        }

    # Normalize columns
    renamed_columns = {col: normalize_column_name(col) for col in df.columns}
    df = df.rename(columns=renamed_columns)

    missing_required = REQUIRED_FIELDS - set(df.columns)
    if missing_required:
        return {
            'status': 'error',
            'message': f"Missing required column(s): {', '.join(sorted(missing_required))}. Expected headers: Name, Email, Roll Number, Course.",
            'total_rows': len(df),
            'valid_count': 0,
            'invalid_count': len(df),
            'valid_rows': [],
            'invalid_rows': []
        }

    # Fetch existing emails and roll numbers from SQLite
    existing_students = query_db("SELECT email, roll_number FROM students")
    existing_emails = {s['email'].lower() for s in existing_students}
    existing_rolls = {s['roll_number'].lower() for s in existing_students}

    # Track in-file duplicates
    seen_file_emails = set()
    seen_file_rolls = set()

    valid_rows: List[Dict[str, Any]] = []
    invalid_rows: List[Dict[str, Any]] = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # Excel/CSV 1-based index including header
        name = str(row.get('name', '')).strip() if pd.notna(row.get('name')) else ''
        email = str(row.get('email', '')).strip().lower() if pd.notna(row.get('email')) else ''
        roll = str(row.get('roll_number', '')).strip() if pd.notna(row.get('roll_number')) else ''
        course = str(row.get('course', '')).strip() if pd.notna(row.get('course')) else ''
        password = str(row.get('password', '')).strip() if 'password' in df.columns and pd.notna(row.get('password')) else DEFAULT_STUDENT_PASSWORD
        if not password:
            password = DEFAULT_STUDENT_PASSWORD

        errors = []

        # 1. Check missing fields
        if not name:
            errors.append("Student Name is required.")
        if not email:
            errors.append("Email address is required.")
        elif not validate_email(email):
            errors.append(f"Invalid email format: '{email}'.")

        if not roll:
            errors.append("Roll Number is required.")
        if not course:
            errors.append("Course / Program is required.")

        # 2. Check in-file duplicates
        if email:
            if email in seen_file_emails:
                errors.append(f"Duplicate email in file: '{email}'.")
            else:
                seen_file_emails.add(email)

        if roll:
            roll_lower = roll.lower()
            if roll_lower in seen_file_rolls:
                errors.append(f"Duplicate roll number in file: '{roll}'.")
            else:
                seen_file_rolls.add(roll_lower)

        # 3. Check existing database duplicates
        if email and email in existing_emails:
            errors.append(f"Email '{email}' is already registered in the system.")

        if roll and roll.lower() in existing_rolls:
            errors.append(f"Roll Number '{roll}' is already assigned in the system.")

        record = {
            'row_num': row_num,
            'name': name,
            'email': email,
            'roll_number': roll,
            'course': course,
            'password': password
        }

        if errors:
            record['error_reason'] = '; '.join(errors)
            invalid_rows.append(record)
        else:
            valid_rows.append(record)

    return {
        'status': 'success',
        'message': f"Parsed {len(df)} row(s). {len(valid_rows)} valid records ready to import, {len(invalid_rows)} row(s) with errors.",
        'total_rows': len(df),
        'valid_count': len(valid_rows),
        'invalid_count': len(invalid_rows),
        'valid_rows': valid_rows,
        'invalid_rows': invalid_rows
    }


def commit_student_batch(students_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Batch inserts validated student records into SQLite and initializes
    their student_preferences.
    """
    if not students_list:
        return {
            'status': 'error',
            'message': 'No valid student records provided to import.',
            'imported_count': 0
        }

    imported_count = 0
    errors = []

    for student in students_list:
        try:
            name = student['name'].strip()
            email = student['email'].strip().lower()
            roll = student['roll_number'].strip()
            course = student['course'].strip()
            raw_password = student.get('password') or DEFAULT_STUDENT_PASSWORD
            hashed = hash_password(raw_password)

            # Insert student
            student_id = execute_db(
                """
                INSERT INTO students (name, email, roll_number, course, password_hash)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, email, roll, course, hashed)
            )

            # Automatically initialize student preferences
            default_interests = json.dumps(["General", "AI/ML"])
            execute_db(
                """
                INSERT INTO student_preferences (student_id, interests, event_notifications_enabled, academic_notifications_enabled)
                VALUES (?, ?, 1, 1)
                """,
                (student_id, default_interests)
            )

            imported_count += 1
        except Exception as e:
            logger.error(f"Failed inserting student {student.get('email')}: {e}")
            errors.append(f"{student.get('email')}: {str(e)}")

    return {
        'status': 'success' if imported_count > 0 else 'error',
        'message': f"Successfully imported {imported_count} student account(s) into the database.",
        'imported_count': imported_count,
        'failed_count': len(errors),
        'errors': errors
    }
