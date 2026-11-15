from flask import Blueprint, request, jsonify, send_file
from database import query_db, execute_db
from auth import token_required, role_required
from services.file_service import save_pdf_upload, resolve_safe_path
from services.gemini_service import index_approved_document, is_gemini_available

documents_bp = Blueprint('documents', __name__, url_prefix='/api/documents')


@documents_bp.route('/admin-upload', methods=['POST'])
@role_required('admin')
def admin_upload_document():
    """
    Administrator uploads official college PDF documents directly.
    Bypasses teacher submissions. Initial status is 'approved' or 'pending' review.
    """
    admin_id = request.current_user['id']
    title = request.form.get('title', '').strip()
    uploaded_file = request.files.get('file') or request.files.get('document')
    auto_approve = request.form.get('auto_approve', 'true').lower() == 'true'

    if not title:
        return jsonify({'status': 'error', 'message': 'Document title is required.'}), 400

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({'status': 'error', 'message': 'PDF document file is required.'}), 400

    try:
        saved = save_pdf_upload(uploaded_file, subfolder='official_docs')
        approval_status = 'approved' if auto_approve else 'pending'

        doc_id = execute_db(
            """
            INSERT INTO documents (
                title, original_filename, stored_path, uploaded_by,
                uploader_role, approval_status, indexing_status
            ) VALUES (?, ?, ?, ?, 'admin', ?, 'not_indexed')
            """,
            (
                title,
                saved['original_filename'],
                saved['stored_path'],
                admin_id,
                approval_status
            )
        )

        return jsonify({
            'status': 'success',
            'message': f"Official college document '{title}' uploaded successfully.",
            'document_id': doc_id,
            'approval_status': approval_status,
            'indexing_status': 'not_indexed'
        }), 201
    except ValueError as ve:
        return jsonify({'status': 'error', 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': f"Upload failed: {str(e)}"}), 500


@documents_bp.route('', methods=['GET'])
@token_required
def get_documents():
    """
    List uploaded documents.
    Admins see all documents with approval and indexing statuses.
    Students and teachers see only approved documents.
    """
    current_user = request.current_user
    is_admin = current_user.get('role') == 'admin'

    if is_admin:
        docs = query_db(
            """
            SELECT id, title, original_filename, uploaded_by, uploader_role,
                   approval_status, indexing_status, gemini_store_reference, created_at
            FROM documents
            ORDER BY created_at DESC
            """
        )
    else:
        # Students & teachers only see approved documents
        docs = query_db(
            """
            SELECT id, title, original_filename, created_at
            FROM documents
            WHERE approval_status = 'approved'
            ORDER BY created_at DESC
            """
        )

    return jsonify({
        'status': 'success',
        'count': len(docs),
        'documents': docs
    }), 200


@documents_bp.route('/<int:doc_id>/approve', methods=['POST'])
@role_required('admin')
def approve_document(doc_id: int):
    """
    Admin approves an uploaded document.
    Sets approval_status to 'approved'. (Gemini indexing is triggered in Phase 5).
    """
    doc = query_db("SELECT id, title, approval_status FROM documents WHERE id = ?", (doc_id,), one=True)
    if not doc:
        return jsonify({'status': 'error', 'message': 'Document not found.'}), 404

    execute_db("UPDATE documents SET approval_status = 'approved' WHERE id = ?", (doc_id,))

    return jsonify({
        'status': 'success',
        'message': f"Document '{doc['title']}' approved.",
        'approval_status': 'approved'
    }), 200


@documents_bp.route('/<int:doc_id>/reject', methods=['POST'])
@role_required('admin')
def reject_document(doc_id: int):
    """
    Admin rejects an uploaded document.
    """
    doc = query_db("SELECT id, title FROM documents WHERE id = ?", (doc_id,), one=True)
    if not doc:
        return jsonify({'status': 'error', 'message': 'Document not found.'}), 404

    execute_db("UPDATE documents SET approval_status = 'rejected' WHERE id = ?", (doc_id,))

    return jsonify({
        'status': 'success',
        'message': f"Document '{doc['title']}' has been rejected.",
        'approval_status': 'rejected'
    }), 200


@documents_bp.route('/<int:doc_id>/view', methods=['GET'])
@token_required
def view_document_file(doc_id: int):
    """
    Secure authenticated viewing of an uploaded PDF.
    Prevents public or unauthenticated scraping of private documents.
    """
    doc = query_db("SELECT id, original_filename, stored_path, approval_status FROM documents WHERE id = ?", (doc_id,), one=True)
    if not doc:
        return jsonify({'status': 'error', 'message': 'Document not found.'}), 404

    # Non-admins can only view approved documents
    if request.current_user.get('role') != 'admin' and doc['approval_status'] != 'approved':
        return jsonify({'status': 'error', 'message': 'Access denied: document is not approved.'}), 403

    try:
        safe_path = resolve_safe_path(doc['stored_path'])
        return send_file(
            str(safe_path),
            mimetype='application/pdf',
            as_attachment=False,
            download_name=doc['original_filename']
        )
    except FileNotFoundError:
        return jsonify({'status': 'error', 'message': 'File not found on server.'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@documents_bp.route('/<int:doc_id>/index', methods=['POST'])
@role_required('admin')
def index_document(doc_id: int):
    """
    Administrator triggers Gemini File Search indexing for an approved document.
    Maintains decoupled lifecycle: if indexing fails, approval status is preserved.
    """
    result = index_approved_document(doc_id)
    status_code = 200 if result.get('status') in ('success', 'warning') else 400
    return jsonify(result), status_code

