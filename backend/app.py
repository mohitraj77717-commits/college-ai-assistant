import os
import sys
from pathlib import Path

# Ensure backend directory is in Python module search path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import init_db, check_database_status
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp
from routes.announcements_routes import announcements_bp
from routes.teacher_routes import teacher_bp
from routes.documents_routes import documents_bp
from routes.notifications_routes import notifications_bp
from routes.student_routes import student_bp
from routes.chatbot_routes import chatbot_bp

def create_app():
    """
    Application factory pattern for the College AI Assistant Flask backend.
    """
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure uploads directory exists
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # Enable Cross-Origin Resource Sharing (CORS) for React frontend
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(announcements_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(chatbot_bp)

    # Initialize SQLite database on startup
    with app.app_context():
        try:
            init_db()
        except Exception as e:
            app.logger.error(f"Failed to initialize database: {e}")

    # =================================================================
    # System & Health Endpoints
    # =================================================================
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """
        System health check endpoint.
        Returns system status, database health, and Gemini API configuration state
        without exposing secrets.
        """
        db_status = check_database_status()
        gemini_configured = Config.is_gemini_configured()

        return jsonify({
            "status": "healthy",
            "service": "College AI Assistant Backend",
            "version": "1.0.0",
            "gemini_api": {
                "configured": gemini_configured,
                "status": "Ready" if gemini_configured else "API key missing or placeholder in backend/.env"
            },
            "database": {
                "status": "connected" if db_status.get("connected") else "disconnected",
                "tables_count": db_status.get("tables_count", 0),
                "database_name": Config.DATABASE_NAME
            }
        }), 200

    @app.route('/api/db-test', methods=['GET'])
    def db_test():
        """
        Database connectivity verification endpoint.
        Returns the list of verified SQLite tables and their record counts.
        """
        db_status = check_database_status()
        if not db_status.get("connected"):
            return jsonify({
                "status": "error",
                "message": "Database connection failed",
                "details": db_status.get("error")
            }), 500

        return jsonify({
            "status": "success",
            "message": "SQLite database connection verified successfully",
            "database_info": db_status
        }), 200

    # =================================================================
    # Error Handlers
    # =================================================================
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "status": "error",
            "error": "Not Found",
            "message": "The requested API endpoint does not exist."
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "status": "error",
            "error": "Internal Server Error",
            "message": "An unexpected server error occurred."
        }), 500

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Starting College AI Assistant Backend on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
