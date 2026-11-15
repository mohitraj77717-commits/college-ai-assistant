"""
Chatbot Routes for College AI Assistant (Phase 5)
Provides student, teacher, and administrator access to the Gemini File Search RAG system.
"""

from flask import Blueprint, request, jsonify
from auth import token_required
from services.gemini_service import (
    get_chatbot_status,
    query_college_chatbot,
    is_gemini_available
)

chatbot_bp = Blueprint('chatbot', __name__, url_prefix='/api/chatbot')


@chatbot_bp.route('/status', methods=['GET'])
@token_required
def chatbot_status():
    """
    Returns the current operational readiness of the Gemini RAG chatbot,
    including configuration state and indexed document counts.
    """
    status_data = get_chatbot_status()
    return jsonify(status_data), 200


@chatbot_bp.route('/ask', methods=['POST'])
@token_required
def ask_chatbot():
    """
    Processes a natural language question from an authenticated user.
    Answers strictly using approved and indexed college documents.
    """
    data = request.get_json() or {}
    message = data.get('message', '').strip()

    if not message:
        return jsonify({
            'status': 'error',
            'message': 'Question message is required.',
            'answer': 'Please enter a valid question.',
            'sources': [],
            'gemini_configured': is_gemini_available(),
            'ready': False
        }), 400

    user_role = request.current_user.get('role', 'student')
    result = query_college_chatbot(message=message, user_role=user_role)

    status_code = 200 if result.get('status') == 'success' else 400
    return jsonify(result), status_code
