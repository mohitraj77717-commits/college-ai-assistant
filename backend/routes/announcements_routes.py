from flask import Blueprint, request, jsonify
from database import query_db

announcements_bp = Blueprint('announcements', __name__, url_prefix='/api/announcements')


@announcements_bp.route('', methods=['GET'])
def get_announcements():
    """
    Fetch published announcements.
    Supports optional filters:
      - ?course=... (matches specific course OR 'All')
      - ?category=... (e.g. 'coding', 'ai-ml', 'robotics', 'cultural', 'academic')
      - ?search=... (matches title or description)
      - ?limit=... (default 50)
    """
    course = request.args.get('course', '').strip()
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip()
    announcement_type = request.args.get('type', '').strip().lower() or request.args.get('announcement_type', '').strip().lower()
    limit = min(int(request.args.get('limit', 50)), 100)

    query = """
        SELECT a.id, a.title, a.description, a.category, a.announcement_type, a.event_date,
               a.deadline, a.registration_link, a.course, a.created_by_role,
               a.created_by_id, a.status, a.created_at
        FROM announcements a
        WHERE a.status = 'published'
    """
    params = []

    if course and course.lower() != 'all':
        query += " AND (a.course = 'All' OR a.course = ?)"
        params.append(course)

    if category and category.lower() != 'all':
        query += " AND LOWER(a.category) = LOWER(?)"
        params.append(category)

    if announcement_type and announcement_type in ('event', 'academic'):
        query += " AND a.announcement_type = ?"
        params.append(announcement_type)

    if search:
        query += " AND (a.title LIKE ? OR a.description LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])

    query += " ORDER BY a.created_at DESC LIMIT ?"
    params.append(limit)

    announcements = query_db(query, params)

    return jsonify({
        'status': 'success',
        'count': len(announcements),
        'announcements': announcements
    }), 200


@announcements_bp.route('/<int:announcement_id>', methods=['GET'])
def get_announcement_by_id(announcement_id: int):
    """Fetch a single announcement by ID."""
    announcement = query_db(
        """
        SELECT id, title, description, category, announcement_type, event_date, deadline,
               registration_link, course, created_by_role, status, created_at
        FROM announcements
        WHERE id = ? AND status = 'published'
        """,
        (announcement_id,),
        one=True
    )
    if not announcement:
        return jsonify({'status': 'error', 'message': 'Announcement not found.'}), 404

    return jsonify({
        'status': 'success',
        'announcement': announcement
    }), 200
