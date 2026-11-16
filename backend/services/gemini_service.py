"""
Gemini Service for College AI Assistant (Phase 5)
Encapsulates Google Gen AI SDK (v1.5.0) interactions, File Search Store RAG,
and grounded chatbot Q&A.

Decoupled Document Lifecycle:
- Approval status ('pending', 'approved', 'rejected') is independent of
  Indexing status ('not_indexed', 'indexing', 'indexed', 'failed').
- Indexing failures never revoke document approval.
- Standby mode when GEMINI_API_KEY is not configured or offline.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import Config
from database import query_db, execute_db
from services.file_service import resolve_safe_path

# Configure logger
logger = logging.getLogger('campusai.gemini')

# Global cache for the active Gemini File Search Store name
_ACTIVE_STORE_NAME: Optional[str] = None
STORE_DISPLAY_NAME = "college_assistant_docs"


def is_gemini_available() -> bool:
    """
    Safely checks whether a valid Gemini API key is configured.
    Never exposes or logs the actual key.
    """
    return Config.is_gemini_configured()


def get_gemini_client():
    """
    Initializes and returns the Google Gen AI Client if configured.
    Returns None if the API key is missing or placeholder.
    """
    if not is_gemini_available():
        return None

    try:
        # Keep SDK keys synced with backend/.env
        os.environ['GOOGLE_API_KEY'] = Config.GEMINI_API_KEY
        os.environ['GEMINI_API_KEY'] = Config.GEMINI_API_KEY
        from google import genai
        return genai.Client(api_key=Config.GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Google Gen AI Client: {e}")
        return None


def get_or_create_store(client) -> Optional[str]:
    """
    Finds or creates a Gemini File Search Store for college documents.
    Caches the store name in memory for subsequent operations.
    """
    global _ACTIVE_STORE_NAME

    if _ACTIVE_STORE_NAME:
        return _ACTIVE_STORE_NAME

    # Check if a store reference is already persisted in any indexed document
    existing_ref = query_db(
        "SELECT gemini_store_reference FROM documents WHERE gemini_store_reference IS NOT NULL AND gemini_store_reference != '' LIMIT 1",
        one=True
    )
    if existing_ref and existing_ref['gemini_store_reference']:
        _ACTIVE_STORE_NAME = existing_ref['gemini_store_reference']
        return _ACTIVE_STORE_NAME

    try:
        # Search existing stores in Gemini account
        stores_pager = client.file_search_stores.list()
        for store in stores_pager:
            # Check if store has matching display name
            display_name = getattr(store, 'display_name', '')
            if display_name == STORE_DISPLAY_NAME:
                _ACTIVE_STORE_NAME = store.name
                return _ACTIVE_STORE_NAME

        # If not found, create a new File Search Store
        new_store = client.file_search_stores.create(
            config={'display_name': STORE_DISPLAY_NAME}
        )
        _ACTIVE_STORE_NAME = new_store.name
        logger.info(f"Created new Gemini File Search Store: {_ACTIVE_STORE_NAME}")
        return _ACTIVE_STORE_NAME
    except Exception as e:
        logger.error(f"Error accessing Gemini File Search Stores: {e}")
        return None


def index_approved_document(doc_id: int) -> Dict[str, Any]:
    """
    Indexes an approved college document into the Gemini File Search store.
    
    Decoupled Lifecycle:
    - If document is not approved, indexing is rejected.
    - If Gemini is not configured, returns warning without affecting approval status.
    - If upload fails, sets indexing_status = 'failed' while approval_status remains 'approved'.
    """
    doc = query_db(
        "SELECT id, title, original_filename, stored_path, approval_status, indexing_status, gemini_store_reference FROM documents WHERE id = ?",
        (doc_id,),
        one=True
    )

    if not doc:
        return {
            'status': 'error',
            'message': 'Document not found.',
            'indexing_status': 'not_indexed'
        }

    if doc['approval_status'] != 'approved':
        return {
            'status': 'error',
            'message': f"Document must be approved before indexing (current status: {doc['approval_status']}).",
            'indexing_status': doc['indexing_status']
        }

    # If Gemini is not configured, inform safely
    if not is_gemini_available():
        return {
            'status': 'warning',
            'message': 'Gemini API key is not configured in backend/.env. Document is approved, but indexing is on standby.',
            'indexing_status': doc['indexing_status'],
            'gemini_configured': False
        }

    # Mark as indexing in progress
    execute_db("UPDATE documents SET indexing_status = 'indexing' WHERE id = ?", (doc_id,))

    try:
        abs_path = resolve_safe_path(doc['stored_path'])
        if not abs_path.exists():
            execute_db("UPDATE documents SET indexing_status = 'failed' WHERE id = ?", (doc_id,))
            return {
                'status': 'error',
                'message': f"Document file not found on disk at {doc['stored_path']}.",
                'indexing_status': 'failed'
            }

        client = get_gemini_client()
        if not client:
            execute_db("UPDATE documents SET indexing_status = 'failed' WHERE id = ?", (doc_id,))
            return {
                'status': 'error',
                'message': 'Could not initialize Gemini Client.',
                'indexing_status': 'failed'
            }

        store_name = get_or_create_store(client)
        if not store_name:
            execute_db("UPDATE documents SET indexing_status = 'failed' WHERE id = ?", (doc_id,))
            return {
                'status': 'error',
                'message': 'Could not initialize or access Gemini File Search Store.',
                'indexing_status': 'failed'
            }

        # Upload file to Gemini File Search Store
        operation = client.file_search_stores.upload_to_file_search_store(
            file_search_store_name=store_name,
            file=str(abs_path)
        )

        # Update database with indexed status and store reference
        execute_db(
            "UPDATE documents SET indexing_status = 'indexed', gemini_store_reference = ? WHERE id = ?",
            (store_name, doc_id)
        )

        logger.info(f"Document {doc_id} ('{doc['title']}') successfully indexed in Gemini store {store_name}.")
        return {
            'status': 'success',
            'message': f"Document '{doc['title']}' successfully indexed into Gemini File Search.",
            'indexing_status': 'indexed',
            'store_reference': store_name,
            'gemini_configured': True
        }

    except Exception as e:
        logger.error(f"Gemini indexing error for document {doc_id}: {e}")
        # Failure does NOT revoke approval - decoupled lifecycle
        execute_db("UPDATE documents SET indexing_status = 'failed' WHERE id = ?", (doc_id,))
        return {
            'status': 'error',
            'message': f"Indexing failed: {str(e)}",
            'indexing_status': 'failed',
            'gemini_configured': True
        }


def query_college_chatbot(message: str, user_role: str = 'student') -> Dict[str, Any]:
    """
    Processes a natural language query from a student, teacher, or administrator.
    
    RAG Grounding:
    - Queries Gemini 2.5 Flash using File Search tool attached to approved college documents.
    - Strictly grounded in official documents; states clearly when information is missing.
    - Never hallucinates dates, policies, or faculty names.
    - Gracefully handles standby mode when GEMINI_API_KEY is not configured.
    """
    clean_message = (message or '').strip()
    if not clean_message:
        return {
            'status': 'error',
            'answer': 'Please enter a valid question or topic.',
            'sources': [],
            'gemini_configured': is_gemini_available(),
            'ready': False,
            'mode': 'empty'
        }

    # Case 1: Gemini API key is not configured
    if not is_gemini_available():
        return {
            'status': 'success',
            'answer': (
                "The College AI Chatbot is currently in Standby Mode because GEMINI_API_KEY "
                "is not configured in backend/.env.\n\n"
                "To activate live Gemini File Search document retrieval:\n"
                "1. Generate an API key from Google AI Studio (https://aistudio.google.com/)\n"
                "2. Set `GEMINI_API_KEY=your_key` in `backend/.env`\n"
                "3. Restart the Flask backend server."
            ),
            'sources': [],
            'gemini_configured': False,
            'ready': False,
            'mode': 'standby'
        }

    # Case 2: Check approved and indexed documents in SQLite
    indexed_docs = query_db(
        """
        SELECT id, title, original_filename, gemini_store_reference, created_at
        FROM documents
        WHERE approval_status = 'approved' AND indexing_status = 'indexed'
        ORDER BY created_at DESC
        """
    )

    if not indexed_docs:
        # Also check if there are approved documents waiting to be indexed
        approved_unindexed = query_db(
            "SELECT COUNT(*) AS count FROM documents WHERE approval_status = 'approved' AND indexing_status != 'indexed'",
            one=True
        )
        unindexed_count = approved_unindexed['count'] if approved_unindexed else 0

        hint = ""
        if unindexed_count > 0:
            hint = f"\n\nNote: There are {unindexed_count} approved document(s) in the database. An administrator can click 'Index Document' in the Admin Portal to make them searchable."

        return {
            'status': 'success',
            'answer': (
                "No college circulars, notices, or documents have been indexed into the AI knowledge base yet."
                + hint +
                "\n\nOnce documents like examination rules, academic calendars, or course schedules are indexed, I can answer your questions with verified citations."
            ),
            'sources': [],
            'gemini_configured': True,
            'ready': False,
            'mode': 'no_documents'
        }

    # Case 3: Live RAG query with Gemini File Search
    try:
        from google.genai import types
        client = get_gemini_client()
        if not client:
            return {
                'status': 'error',
                'answer': 'Could not initialize Google Gen AI client. Please check server logs.',
                'sources': [],
                'gemini_configured': True,
                'ready': False,
                'mode': 'error'
            }

        # Determine store name
        store_name = indexed_docs[0].get('gemini_store_reference') or get_or_create_store(client)
        if not store_name:
            return {
                'status': 'error',
                'answer': 'No active Gemini File Search Store found. Please re-index documents.',
                'sources': [],
                'gemini_configured': True,
                'ready': False,
                'mode': 'error'
            }

        # Fetch active published announcements from SQLite to ground event queries
        announcements = query_db(
            """
            SELECT id, title, description, category, event_date, deadline, registration_link, course
            FROM announcements
            WHERE status = 'published'
            ORDER BY created_at DESC
            LIMIT 15
            """
        ) or []

        announcements_context = ""
        if announcements:
            announcements_context = "\nCURRENT PUBLISHED CAMPUS ANNOUNCEMENTS & EVENTS (LIVE SYSTEM FEED):\n"
            for a in announcements:
                announcements_context += (
                    f"- Title: {a['title']}\n"
                    f"  Category: {a['category']}\n"
                    f"  Course: {a['course']}\n"
                    f"  Event Date: {a['event_date'] or 'Not specified'}\n"
                    f"  Deadline: {a['deadline'] or 'None'}\n"
                    f"  Registration Link: {a['registration_link'] or 'None'}\n"
                    f"  Details: {a['description']}\n\n"
                )

        system_instruction = (
            "You are the official College Student Assistant AI for a university campus. "
            "Your role is to answer questions from students and faculty using TWO official sources of knowledge:\n"
            "1. LIVE PUBLISHED CAMPUS ANNOUNCEMENTS & EVENTS (provided in context below).\n"
            "2. APPROVED COLLEGE DOCUMENTS & CIRCULARS (retrieved via the File Search tool).\n\n"
            f"{announcements_context}\n"
            "RULES FOR YOUR RESPONSES:\n"
            "1. If the user asks about today's announcements, upcoming events, club activities, class schedules, or campus notices, answer using the published announcements feed above.\n"
            "2. If the user asks about course syllabus, academic subjects, examination rules, or official guidelines, answer using the File Search tool.\n"
            "3. If information cannot be found in either the announcements or the documents, state clearly: "
            "'I could not find information about that in the approved college announcements or documents. Please consult your department coordinator or administrator.'\n"
            "4. Never fabricate or guess dates, policies, or faculty names.\n"
            "5. Keep responses concise, well-structured, professional, and friendly."
        )

        # Try active production models (primary: gemini-3.5-flash, fallback: gemini-3.8-flash)
        model_candidates = ["gemini-3.5-flash", "gemini-3.8-flash"]
        response = None
        last_error = None

        for model_name in model_candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=clean_message,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,  # Low temperature for factual consistency
                        tools=[
                            types.Tool(
                                file_search=types.FileSearch(
                                    file_search_store_names=[store_name]
                                )
                            )
                        ]
                    )
                )
                if response:
                    break
            except Exception as model_err:
                last_error = model_err
                logger.warning(f"Model {model_name} failed: {model_err}. Trying fallback...")

        if not response:
            raise last_error or Exception("Could not generate response with available Gemini models.")

        # Extract answer text
        answer_text = response.text or "No textual response generated by the model."

        # Extract source references
        sources = []
        # Add titles of indexed documents as active knowledge sources
        for doc in indexed_docs:
            sources.append({
                'id': doc['id'],
                'title': doc['title'],
                'filename': doc['original_filename']
            })

        return {
            'status': 'success',
            'answer': answer_text,
            'sources': sources,
            'gemini_configured': True,
            'ready': True,
            'mode': 'live_rag'
        }

    except Exception as e:
        logger.error(f"Error querying Gemini chatbot: {e}")
        return {
            'status': 'error',
            'answer': (
                f"We encountered an issue communicating with Google Gemini: {str(e)}\n\n"
                "Please verify your network connection and Gemini API key quota."
            ),
            'sources': [],
            'gemini_configured': True,
            'ready': False,
            'mode': 'error'
        }


def get_chatbot_status() -> Dict[str, Any]:
    """
    Returns the operational status of the Gemini File Search RAG system.
    """
    configured = is_gemini_available()

    # Query document counts
    stats = query_db(
        """
        SELECT
            COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) AS approved_count,
            COUNT(CASE WHEN approval_status = 'approved' AND indexing_status = 'indexed' THEN 1 END) AS indexed_count,
            COUNT(CASE WHEN indexing_status = 'failed' THEN 1 END) AS failed_count
        FROM documents
        """,
        one=True
    ) or {'approved_count': 0, 'indexed_count': 0, 'failed_count': 0}

    indexed_docs = query_db(
        "SELECT id, title, original_filename FROM documents WHERE approval_status = 'approved' AND indexing_status = 'indexed' ORDER BY id DESC"
    )

    ready = configured and stats['indexed_count'] > 0

    return {
        'status': 'success',
        'gemini_configured': configured,
        'ready': ready,
        'approved_documents_count': stats['approved_count'],
        'indexed_documents_count': stats['indexed_count'],
        'failed_indexing_count': stats['failed_count'],
        'indexed_documents': indexed_docs
    }
