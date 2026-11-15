import json
from flask import Blueprint, request, jsonify
from database import query_db, execute_db
from auth import role_required

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


@student_bp.route('/preferences', methods=['GET'])
@role_required('student')
def get_preferences():
    """
    Retrieve notification delivery toggles and campus interests for the current student.
    """
    student_id = request.current_user['id']
    prefs = query_db(
        """
        SELECT interests, event_notifications_enabled, academic_notifications_enabled
        FROM student_preferences
        WHERE student_id = ?
        """,
        (student_id,),
        one=True
    )

    if not prefs:
        # Default fallback
        return jsonify({
            'status': 'success',
            'preferences': {
                'interests': [],
                'event_notifications_enabled': True,
                'academic_notifications_enabled': True
            }
        }), 200

    try:
        interests = json.loads(prefs['interests']) if prefs['interests'] else []
    except Exception:
        interests = []

    return jsonify({
        'status': 'success',
        'preferences': {
            'interests': interests,
            'event_notifications_enabled': bool(prefs['event_notifications_enabled']),
            'academic_notifications_enabled': bool(prefs['academic_notifications_enabled'])
        }
    }), 200


@student_bp.route('/preferences', methods=['PUT'])
@role_required('student')
def update_preferences():
    """
    Update student notification toggles (events/academic) and interest tags.
    """
    student_id = request.current_user['id']
    data = request.get_json() or {}

    # Fetch existing preferences
    existing = query_db(
        "SELECT * FROM student_preferences WHERE student_id = ?",
        (student_id,),
        one=True
    )

    interests = data.get('interests')
    event_enabled = data.get('event_notifications_enabled')
    academic_enabled = data.get('academic_notifications_enabled')

    if interests is not None and isinstance(interests, list):
        interests_json = json.dumps(interests)
    elif existing and existing['interests']:
        interests_json = existing['interests']
    else:
        interests_json = '[]'

    if event_enabled is not None:
        event_val = 1 if bool(event_enabled) else 0
    elif existing:
        event_val = existing['event_notifications_enabled']
    else:
        event_val = 1

    if academic_enabled is not None:
        academic_val = 1 if bool(academic_enabled) else 0
    elif existing:
        academic_val = existing['academic_notifications_enabled']
    else:
        academic_val = 1

    if existing:
        execute_db(
            """
            UPDATE student_preferences
            SET interests = ?, event_notifications_enabled = ?, academic_notifications_enabled = ?, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = ?
            """,
            (interests_json, event_val, academic_val, student_id)
        )
    else:
        execute_db(
            """
            INSERT INTO student_preferences (student_id, interests, event_notifications_enabled, academic_notifications_enabled)
            VALUES (?, ?, ?, ?)
            """,
            (student_id, interests_json, event_val, academic_val)
        )

    try:
        updated_interests = json.loads(interests_json)
    except Exception:
        updated_interests = []

    return jsonify({
        'status': 'success',
        'message': 'Preferences updated successfully.',
        'preferences': {
            'interests': updated_interests,
            'event_notifications_enabled': bool(event_val),
            'academic_notifications_enabled': bool(academic_val)
        }
    }), 200
