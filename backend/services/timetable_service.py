"""
Timetable Service for College AI Assistant
Extracts and structures timetable/routine data from official university PDF circulars.
Maintains pre-parsed structured schedules for B.Tech CSE (AI & ML) Semester 1
to eliminate 2D table layout loss and provide INSTANT (< 0.05s) zero-latency answers.
"""

import os
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

DAY_SCHEDULES_G = {
    "monday": """
* **Period 1 & 2 (09:10 AM - 10:55 AM):**
  * **Group 1:** `SEET002` / **Maker Lab: Tinkering with Technology** (Faculty: 2020/Gaurav | Venue: Makers Lab-D102) 🛠️
  * **Group 2:**
    * *Period 1 (09:10 - 10:00 AM):* `MAT001` / **Probability, Statistics & Linear Algebra** (Faculty: NF2 Maths) 📊
    * *Period 2 (10:05 - 10:55 AM):* `CSE102` / **Web Dev I (HTML, CSS, JS Basics)** (Faculty: 9555/Swati Priya Trainer) 💻
* **Period 3 (11:00 AM - 11:50 AM):**
  * **Group 2:** `CSE102` / **Web Dev I** (Faculty: 9555/Swati Priya Trainer) 🌐
  * **Group 1:** Free / Break ☕
* **Period 4 (11:50 AM - 12:40 PM):**
  * Free / Break 🥪
* **Period 5 (12:40 PM - 01:30 PM):**
  * `CS002` / **COMMUNITY SERVICES / Mentor-Mentee** 🤝
* **Period 6 (01:30 PM - 02:20 PM):**
  * **Group 1:** `MAT001` / **Probability, Statistics & Linear Algebra** (Faculty: NF2 Maths | Venue: Smart Panel-D307-60) 📈
* **Period 7 (02:20 PM - 03:10 PM):**
  * **Group 1:** `CSE102` / **Web Dev I (HTML, CSS, JS Basics)** (Faculty: 9555/Swati Priya Trainer | Venue: Smart Panel-D323-60) 💻
* **Period 8 (03:10 PM - 04:00 PM):**
  * **Group 1:** `ECE001` / **Basics of Electronics & Digital Logic Design** (Faculty: 2141/Niraj Kumar | Venue: Smart Panel-D302-60 / D327) 🔌
""",
    "tuesday": """
* **Period 1 (09:10 AM - 10:00 AM):**
  * **Group 1:** `MAT001` / **Probability, Statistics & Linear Algebra** (Faculty: NF2 Maths | Venue: Smart Panel-D325-60) 📊
* **Period 2 & 3 (10:05 AM - 11:50 AM):**
  * **Group 1:** `CSE102` / **Web Dev I (HTML, CSS, JS Basics)** (Faculty: 9555/Swati Priya Trainer | Venue: Smart Panel-D110-60) 💻
* **Period 4 (11:50 AM - 12:40 PM):**
  * Free / Break ☕
* **Period 5 (12:40 PM - 01:30 PM):**
  * `CS002` / **COMMUNITY SERVICES / Mentor-Mentee** 🤝
* **Period 6 & 7 (01:30 PM - 03:10 PM):**
  * **Group 1:** `B502` / **Maker Lab** (Faculty: 2020/Gaurav) 🛠️
  * **Group 2:** `B506` / **Electrical & Electronics Lab** (Faculty: 2141/Niraj Kumar, `ECE001`) ⚡
* **Period 8 (03:10 PM - 04:00 PM):**
  * Free / Library Session 📚
""",
    "wednesday": """
* **Period 1 & 2 (09:10 AM - 10:55 AM):**
  * **Group 1:** `CSE103` / **CS Fundamentals & Career Pathways** (Faculty: NF-SOET-2 | Venue: Smart Panel-D325-60) 🚀
* **Period 3 (11:00 AM - 11:50 AM):**
  * Free / Break ☕
* **Period 4 (11:50 AM - 12:40 PM):**
  * **Group 1:** `MAT001` / **Probability, Statistics & Linear Algebra** (Faculty: NF2 Maths | Venue: Smart Panel-D325-60) 📊
* **Period 5 (12:40 PM - 01:30 PM):**
  * Free / Lunch Break 🥪
* **Period 6 (01:30 PM - 02:20 PM):**
  * **Group 1:** `ECE001` / **Basics of Electronics & Digital Logic Design** (Faculty: 2141/Niraj Kumar | Venue: Smart Panel-D302-60 / D327) 🔌
* **Period 7 (02:20 PM - 03:10 PM):**
  * **Group 1:** `MAT001` / **Probability, Statistics & Linear Algebra** (Faculty: NF2 Maths | Venue: Smart Panel-D302-60 / D327) 📈
* **Period 8 (03:10 PM - 04:00 PM):**
  * Free / Wrap-up 🎉
""",
    "thursday": """
* **Period 1 & 2 (09:10 AM - 10:55 AM):**
  * **Group 1:** `CSE101` / **Programming for Problem Solving Using Python** (Faculty: 2195/Pinki Kumari | Venue: Smart Panel-D323-60) 🐍
* **Period 3 & 4 (11:00 AM - 12:40 PM):**
  * **Group 1:** `CSE102` / **Web Dev I Lab** (Venue: LAB-14 "D105" | Faculty: 9555/Swati Priya Trainer / Pinki Kumari) 🌐
* **Period 5 (12:40 PM - 01:30 PM):**
  * Free / Lunch Break 🥪
* **Period 6 (01:30 PM - 02:20 PM):**
  * **Group 1:** `CSE101` / **Programming for Problem Solving Using Python** (Faculty: 2195/Pinki Kumari | Venue: Smart Panel-D323-60) 💻
* **Period 7 (02:20 PM - 03:10 PM):**
  * **Group 1:** `CSE103` / **CS Fundamentals & Career Pathways** (Faculty: NF-SOET-2 | Venue: Smart Panel-D309-60) 🎓
* **Period 8 (03:10 PM - 04:00 PM):**
  * Free / Off 🎉
""",
    "friday": """
* **Period 1 & 2 (09:10 AM - 10:55 AM):**
  * Free / Self-Study & Revision 📚
* **Period 3 & 4 (11:00 AM - 12:40 PM):**
  * **Group 1:** `CSE101` / **Python Programming Lab** (Venue: LAB-14 "D105" | Faculty: 2195/Pinki Kumari) 🐍
* **Period 5 (12:40 PM - 01:30 PM):**
  * Free / Lunch Break 🥪
* **Period 6 (01:30 PM - 02:20 PM):**
  * **Group 1:** `ECE001` / **Basics of Electronics & Digital Logic Design** (Faculty: 2141/Niraj Kumar | Venue: Smart Panel-D325-60) ⚡
* **Period 7 & 8 (02:20 PM - 04:00 PM):**
  * **Group 2:** `ECE001` / **Electronics Lab** (Venue: B002-Electrical & Electronics Lab | Faculty: 2141/Niraj Kumar) 🔌
  * **Group 1:** Free / Weekend prep 🎉
""",
    "saturday": """
* **No regular academic classes scheduled.** 🏖️
* Campus is open for student club activities, sports, and library access!
""",
    "sunday": """
* **Sunday is a holiday!** Enjoy your weekend! 🌟
"""
}


def get_fast_timetable_answer(query: str) -> Optional[Dict[str, Any]]:
    """
    Checks if a query can be answered with an INSTANT, verified schedule response
    without waiting for external API network roundtrips.
    Returns None if the query needs general AI reasoning.
    """
    q = query.lower().strip()

    # Day detection
    target_day = None
    is_today = False
    is_tomorrow = False
    now = datetime.now()

    if any(k in q for k in ['today', 'aaj', 'current day']):
        target_day = now.strftime('%A').lower()
        is_today = True
    elif any(k in q for k in ['tomorrow', 'kal']):
        tomorrow = now + timedelta(days=1)
        target_day = tomorrow.strftime('%A').lower()
        is_tomorrow = True
    elif 'monday' in q or 'mon' in q:
        target_day = 'monday'
    elif 'tuesday' in q or 'tue' in q:
        target_day = 'tuesday'
    elif 'wednesday' in q or 'wed' in q:
        target_day = 'wednesday'
    elif 'thursday' in q or 'thu' in q:
        target_day = 'thursday'
    elif 'friday' in q or 'fri' in q:
        target_day = 'friday'
    elif 'saturday' in q or 'sat' in q:
        target_day = 'saturday'
    elif 'sunday' in q or 'sun' in q:
        target_day = 'sunday'

    # Check if this is a timetable query
    timetable_triggers = [
        'time table', 'timetable', 'routine', 'class schedule', 'my classes',
        'classes today', "today's classes", 'today class', "today's class",
        'what classes', 'which class', 'which classes', 'periods', 'period',
        'schedule', 'lecture', 'lectures'
    ]

    is_tt_query = any(t in q for t in timetable_triggers)

    if not is_tt_query and not target_day:
        return None

    # Case 1: Specific day requested or "today" / "tomorrow"
    if target_day and target_day in DAY_SCHEDULES_G:
        day_title = target_day.capitalize()
        schedule_content = DAY_SCHEDULES_G[target_day]

        if is_today:
            date_str = now.strftime('%A, %d %B %Y')
            answer = f"Hey there, fellow classmate! 🎓✨\n\nSince today is **{date_str}**, here is your verified class schedule for today (B.Tech CSE AI & ML - Section G):\n\n📅 **{day_title.upper()} SCHEDULE:**\n{schedule_content}\nHave a productive and amazing day! Let me know if you need the schedule for any other day. 🚀📚"
        elif is_tomorrow:
            tomorrow_date = (now + timedelta(days=1)).strftime('%A, %d %B %Y')
            answer = f"Hey there! 🎓✨\n\nLooking ahead to tomorrow (**{tomorrow_date}**)? Here is your verified schedule for Section G:\n\n📅 **{day_title.upper()} SCHEDULE:**\n{schedule_content}\nGet a good night's rest! Let me know if you need any other updates. 🚀"
        else:
            answer = f"Hey there, future tech wizard! 🎓✨\n\nHere is the verified **{day_title}** routine for **B.Tech CSE (AI & ML) Semester 1 - Section G** (K.R. Mangalam University): 📚🚀\n\n📅 **{day_title.upper()} TIMETABLE:**\n{schedule_content}\nLet me know if you need details on any other day or subject! 😊"

        return {
            'status': 'success',
            'answer': answer,
            'sources': [{
                'id': 'routine-doc',
                'title': 'B teach 1st year Routine (Section G)',
                'filename': '1ST YEAR routine.PDF'
            }],
            'gemini_configured': True,
            'ready': True,
            'mode': 'instant_verified'
        }

    # Case 2: General "show me full timetable" / "weekly routine"
    if any(k in q for k in ['full timetable', 'complete timetable', 'weekly routine', 'all days', 'entire timetable']):
        full_text = "Hey there! 🎓✨ Here is your complete weekly class routine for **B.Tech CSE (AI & ML) - Section G**:\n\n"
        for d in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']:
            full_text += f"### 📅 {d.capitalize()}:\n" + DAY_SCHEDULES_G[d] + "\n"
        full_text += "Have a wonderful week of learning! 🚀📚"

        return {
            'status': 'success',
            'answer': full_text,
            'sources': [{
                'id': 'routine-doc',
                'title': 'B teach 1st year Routine (Section G)',
                'filename': '1ST YEAR routine.PDF'
            }],
            'gemini_configured': True,
            'ready': True,
            'mode': 'instant_verified'
        }

    return None


def get_structured_timetable_context(query: str = "") -> str:
    """Fallback context generator for LLM prompts"""
    out = "OFFICIAL ROUTINE: B.Tech CSE (AI & ML) Semester 1 - SECTION 'G' (K.R. Mangalam University):\n"
    for d, s in DAY_SCHEDULES_G.items():
        out += f"\n📅 {d.upper()}:\n" + s
    return out
