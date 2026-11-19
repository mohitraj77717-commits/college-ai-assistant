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

        # Real-time clock and date integration
        from datetime import datetime
        now = datetime.now()
        current_time_str = now.strftime('%I:%M %p')
        current_date_str = now.strftime('%A, %d %B %Y')
        current_iso_date = now.strftime('%Y-%m-%d')
        current_day_name = now.strftime('%A')
        current_year = now.strftime('%Y')

        # Fetch active published announcements from SQLite
        announcements = query_db(
            """
            SELECT id, title, description, category, event_date, deadline, registration_link, course, created_at
            FROM announcements
            WHERE status = 'published'
            ORDER BY created_at DESC
            """
        ) or []

        # Segregate into Current/Upcoming (High Priority) vs Past/Archive
        current_announcements = []
        past_announcements = []

        for a in announcements:
            ev_date = (a.get('event_date') or '').strip()
            deadline = (a.get('deadline') or '').strip()
            is_past = False

            if ev_date:
                try:
                    if len(ev_date) >= 10 and ev_date[:10] < current_iso_date:
                        is_past = True
                except Exception:
                    pass
            elif deadline:
                try:
                    if len(deadline) >= 10 and deadline[:10] < current_iso_date:
                        is_past = True
                except Exception:
                    pass

            if is_past:
                past_announcements.append(a)
            else:
                current_announcements.append(a)

        announcements_context = f"""
LIVE REAL-TIME SYSTEM CLOCK & CALENDAR:
• Current Date & Year: {current_date_str} (Year: {current_year})
• Current Day of Week: {current_day_name}
• Current Local Time: {current_time_str}
• Reference Date (ISO): {current_iso_date}

📢 CURRENT & UPCOMING ANNOUNCEMENTS (HIGH PRIORITY - SHOW FIRST):
"""
        if current_announcements:
            for a in current_announcements:
                announcements_context += (
                    f"- [CURRENT] Title: {a['title']}\n"
                    f"  Category: {a['category']}\n"
                    f"  Course: {a['course']}\n"
                    f"  Event Date: {a['event_date'] or 'Active / Ongoing Notice'}\n"
                    f"  Deadline: {a['deadline'] or 'None'}\n"
                    f"  Registration Link: {a['registration_link'] or 'None'}\n"
                    f"  Details: {a['description']}\n\n"
                )
        else:
            announcements_context += "No new active announcements scheduled right now.\n\n"

        announcements_context += "📜 PAST & ARCHIVED ANNOUNCEMENTS (CONCLUDED / PREVIOUS NOTICES):\n"
        if past_announcements:
            for a in past_announcements:
                announcements_context += (
                    f"- [PAST] Title: {a['title']}\n"
                    f"  Category: {a['category']}\n"
                    f"  Course: {a['course']}\n"
                    f"  Date Held: {a['event_date'] or 'Concluded'}\n"
                    f"  Details: {a['description']}\n\n"
                )
        else:
            announcements_context += "No past announcements in archive.\n\n"

        # Smart Query Routing:
        q_lower = clean_message.lower().strip()

        # Check for simple greetings
        greetings_list = [
            'hi', 'hello', 'hey', 'heyy', 'hiya', 'sup', 'yo',
            'good morning', 'good afternoon', 'good evening',
            'who are you', 'what can you do', 'help', 'help me',
            'thanks', 'thank you', 'bye', 'goodbye', 'ok', 'okay'
        ]
        is_greeting = q_lower in greetings_list or any(q_lower.startswith(g + ' ') for g in ['hi', 'hello', 'hey', 'yo'])

        # Real-time / Clock queries
        time_keywords = [
            'what is the time', 'what time', 'current time', 'what is the date',
            'today date', "today's date", 'what day is today', 'what day is it',
            'current date', 'kya time', 'kya date', 'what year', 'current year',
            'time and date', 'date and time', 'time now'
        ]
        is_time_query = any(k in q_lower for k in time_keywords)

        # Campus events & announcements
        event_keywords = [
            'announcement', 'announcements', 'event', 'events', 'notice', 'notices',
            'today', 'todays', "today's", 'tomorrow', 'class', 'classes', 'stambh',
            'bollywood', 'fest', 'workshop', 'workshops', 'hackathon', 'hackathons',
            'cultural', 'register', 'registration', 'club', 'clubs',
            'aaj', 'kal', 'kab', 'session', 'seminar',
            'past announcement', 'past announcements', 'previous announcement',
            'previous notices', 'past event', 'past events', 'archive', 'history'
        ]
        is_event_query = any(k in q_lower for k in event_keywords) or is_time_query

        # Timetable / Routine queries
        timetable_keywords = [
            'time table', 'timetable', 'routine', 'class routine', 'class schedule',
            'periods', 'period', 'section g', 'sec g', 'monday routine', 'tuesday routine',
            'wednesday routine', 'thursday routine', 'friday routine', 'schedule',
            'my classes', 'classes today', "today's classes", 'today class', "today's class",
            'what classes', 'which class', 'which classes', 'class timing', 'class timings',
            'lecture', 'lectures'
        ]
        is_timetable_query = any(k in q_lower for k in timetable_keywords)

        # Academic documents, syllabus, rules, exams
        academic_keywords = [
            'syllabus', 'syallbus', 'syllubus', 'subject', 'course', 'curriculum',
            'unit', 'units', 'chapter', 'chapters', 'credit', 'credits', 'math', 'maths',
            'mathematics', 'physics', 'chemistry', 'exam', 'exams', 'examination',
            'marks', 'grading', 'grade', 'passed', 'passing', 'attendance', 'policy',
            'rules', 'rule', 'regulation', 'regulations', 'circular', 'circulars',
            'document', 'documents', 'pdf', 'file', 'sem', 'semester', 'module',
            'modules', 'lab', 'practical', 'fee', 'fees', 'curricula', 'ordinance',
            'prerequisite', 'ai & ml', 'cse'
        ]
        is_academic_query = any(k in q_lower for k in academic_keywords)

        # Timetable context injection for 100% precision without 2D table scrambling
        timetable_context = ""
        if is_timetable_query:
            try:
                from services.timetable_service import get_structured_timetable_context
                timetable_context = "\nOFFICIAL VERIFIED TIMETABLE / CLASS ROUTINE (STRUCTURED GROUNDING):\n" + get_structured_timetable_context(clean_message)
            except Exception as tt_err:
                logger.warning(f"Failed to load structured timetable: {tt_err}")

        system_instruction = (
            "You are 'Campus Buddy AI' 🎓✨, a super friendly, energetic, and helpful college senior and campus guide. "
            "You help your fellow students and faculty navigate college life using official college knowledge:\n"
            "1. LIVE CAMPUS ANNOUNCEMENTS & EVENTS (provided in context below).\n"
            "2. OFFICIAL CLASS ROUTINE & TIMETABLE (provided in structured context below).\n"
            "3. APPROVED COLLEGE DOCUMENTS & SYLLABI (retrieved via the File Search tool if attached).\n\n"
            f"{announcements_context}\n"
            f"{timetable_context}\n"
            "PERSONALITY & TONE GUIDELINES:\n"
            "• Tone: Warm, approachable, engaging, and enthusiastic like a helpful college senior/mentor. Use relevant emojis naturally (🎓, 📚, ✨, 🚀, 📢, 💡, 🎬).\n"
            "• Real-Time & Date Awareness: You ALWAYS know the exact live system date, day of week, time, and year provided in the clock context above. State the real date/time directly if asked.\n"
            "• 'Today' & 'Tomorrow' Routine Queries: When a student asks 'what classes do I have today?' or 'today schedule', automatically use the current day of the week from the live clock (e.g. if today is Thursday, provide Thursday's classes). When asked about 'tomorrow', provide the next day's classes.\n"
            "• Announcement Prioritization: Always prioritize CURRENT & UPCOMING announcements first. When asked generally about announcements, showcase the active notices first. If asked specifically about 'past announcements', 'archives', or 'previous notices', display the concluded notices clearly labeled with past event status.\n"
            "• Language & Style: Fluent English with full natural understanding of Hinglish (e.g., if a student asks 'aaj class hai kya?' or 'Bollywood day kab hai?', reply helpfully in natural friendly English or easy Hinglish).\n"
            "• Formatting: Keep answers ultra-clean, structured with bold highlights and bullet points. Never dump giant walls of text.\n"
            "• Timetable & Routine Queries: Use the structured timetable above to provide exact period timings, subjects, faculty names, room numbers, and group divisions (Group 1 vs Group 2). Never clip or confuse periods.\n"
            "• Event Queries: For notices, class updates, fests, or club events, refer to the live announcements feed above.\n"
            "• Academic & Circular Queries: For syllabus, units, exam rules, or guidelines, refer to the File Search documents.\n"
            "• Accuracy & Grounding: Stick strictly to verified facts from the announcements, routine, and documents. Never fabricate dates or rules.\n"
            "• If Not Found: Say nicely: 'Oops! I couldn’t find info about that in our official circulars or event notices yet. 🏫 Best to check with your department coordinator or admin!'"
        )

        # Decide whether to attach FileSearch tool:
        # Timetables and events are already structured in context. Use FileSearch only for deep document/syllabus search.
        use_file_search = (is_academic_query and not is_timetable_query) or (not is_greeting and not is_event_query and not is_timetable_query)

        tools = None
        if use_file_search and store_name:
            tools = [
                types.Tool(
                    file_search=types.FileSearch(
                        file_search_store_names=[store_name]
                    )
                )
            ]

        # Prioritize ultra-fast flash-lite models to avoid busy queue delays
        model_candidates = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"]
        response = None
        last_error = None

        for model_name in model_candidates:
            try:
                gen_config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2
                )
                if tools:
                    gen_config.tools = tools

                response = client.models.generate_content(
                    model=model_name,
                    contents=clean_message,
                    config=gen_config
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
        if is_timetable_query:
            sources.append({
                'id': 'routine-doc',
                'title': 'B teach 1st year Routine (Section G)',
                'filename': '1ST YEAR routine.PDF'
            })
        elif use_file_search:
            for doc in indexed_docs:
                sources.append({
                    'id': doc['id'],
                    'title': doc['title'],
                    'filename': doc['original_filename']
                })
        elif is_event_query and announcements:
            sources.append({
                'id': 'live-feed',
                'title': 'Live Campus Announcements & Events',
                'filename': 'Campus DB Feed'
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
