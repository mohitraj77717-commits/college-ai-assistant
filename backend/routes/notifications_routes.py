from flask import Blueprint, request, jsonify
from database import query_db, execute_db
from auth import role_required

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@role_required('student')
def get_student_notifications():
    """
    Fetch all notifications for the currently logged-in student.
    Joins announcement metadata (event_date, registration_link).
    """
    student_id = request.current_user['id']
    notifications = query_db(
        """
        SELECT n.id, n.announcement_id, n.title, n.message,
               n.notification_type, n.is_read, n.created_at,
               a.category, a.event_date, a.deadline, a.registration_link
        FROM notifications n
        LEFT JOIN announcements a ON n.announcement_id = a.id
        WHERE n.student_id = ?
        ORDER BY n.created_at DESC
        """,
        (student_id,)
    )

    unread_count = sum(1 for n in notifications if not n['is_read'])

    return jsonify({
        'status': 'success',
        'count': len(notifications),
        'unread_count': unread_count,
        'notifications': notifications
    }), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@role_required('student')
def get_unread_count():
    """
    Fast lightweight endpoint to retrieve unread notification badge count.
    """
    student_id = request.current_user['id']
    row = query_db(
        "SELECT COUNT(*) AS count FROM notifications WHERE student_id = ? AND is_read = 0",
        (student_id,),
        one=True
    )
    return jsonify({
        'status': 'success',
        'unread_count': row['count'] if row else 0
    }), 200


@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@role_required('student')
def mark_notification_read(notification_id: int):
    """
    Mark a single notification as read.
    """
    student_id = request.current_user['id']
    notif = query_db(
        "SELECT id FROM notifications WHERE id = ? AND student_id = ?",
        (notification_id, student_id),
        one=True
    )
    if not notif:
        return jsonify({'status': 'error', 'message': 'Notification not found.'}), 404

    execute_db(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND student_id = ?",
        (notification_id, student_id)
    )

    return jsonify({
        'status': 'success',
        'message': 'Notification marked as read.',
        'notification_id': notification_id
    }), 200


@notifications_bp.route('/mark-all-read', methods=['PUT'])
@role_required('student')
def mark_all_read():
    """
    Mark all unread notifications as read for the logged-in student.
    """
    student_id = request.current_user['id']
    execute_db(
        "UPDATE notifications SET is_read = 1 WHERE student_id = ?",
        (student_id,)
    )
    return jsonify({
        'status': 'success',
        'message': 'All notifications marked as read.'
    }), 200


@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@role_required('student')
def delete_notification(notification_id: int):
    """
    Dismiss / delete a notification.
    """
    student_id = request.current_user['id']
    notif = query_db(
        "SELECT id FROM notifications WHERE id = ? AND student_id = ?",
        (notification_id, student_id),
        one=True
    )
    if not notif:
        return jsonify({'status': 'error', 'message': 'Notification not found.'}), 404

    execute_db(
        "DELETE FROM notifications WHERE id = ? AND student_id = ?",
        (notification_id, student_id)
    )

    return jsonify({
        'status': 'success',
        'message': 'Notification dismissed.'
    }), 200
