"""
Timetable Service for College AI Assistant
Extracts and structures timetable/routine data from official university PDF circulars.
Maintains pre-parsed structured schedules for B.Tech CSE (AI & ML) Semester 1
to eliminate 2D table layout loss from raw text extractors.
"""

import os
import re
from pathlib import Path
from typing import Dict, Any, Optional

# Base directory
backend_dir = Path(__file__).resolve().parent.parent

# Cache for structured timetables
_CACHED_TIMETABLE_TEXT: Optional[str] = None


def get_structured_timetable_context(query: str = "") -> str:
    """
    Returns structured, human-readable timetable context for B.Tech CSE (AI & ML) Semester 1.
    If a specific section (e.g. 'Section G', 'Section A') is mentioned, prioritizes that section.
    """
    global _CACHED_TIMETABLE_TEXT

    # Determine requested section if specified in query
    q_lower = query.lower()
    requested_section = None
    sec_match = re.search(r'section\s*([a-i])', q_lower)
    if sec_match:
        requested_section = sec_match.group(1).upper()
    elif 'sec g' in q_lower or 'section-g' in q_lower:
        requested_section = 'G'
    elif 'sec a' in q_lower or 'section-a' in q_lower:
        requested_section = 'A'

    # Section G Full Verified Schedule (K.R. Mangalam University - 1st Year CSE AI & ML)
    section_g_schedule = """
OFFICIAL ROUTINE: B.Tech CSE (AI & ML) Semester 1 - SECTION "G" (K.R. Mangalam University):

📅 MONDAY:
- Period 1 & 2 (09:10 AM - 10:55 AM):
  * Group 1: SEET002 / Maker Lab: Tinkering with Technology (Faculty: 2020/Gaurav, Venue: Makers Lab-D102)
  * Group 2:
    - Period 1 (09:10 - 10:00 AM): MAT001 / Probability, Statistics & Linear Algebra (Faculty: NF2 Maths)
    - Period 2 (10:05 - 10:55 AM): CSE102 / Web Dev I (HTML, CSS, JS Basics) (Faculty: 9555/Swati Priya Trainer)
- Period 3 (11:00 AM - 11:50 AM):
  * Group 2: CSE102 / Web Dev I (Faculty: 9555/Swati Priya Trainer)
  * Group 1: Free / Break
- Period 4 (11:50 AM - 12:40 PM): Free / Break
- Period 5 (12:40 PM - 01:30 PM): CS002 / COMMUNITY SERVICES / Mentor/Mentee
- Period 6 (01:30 PM - 02:20 PM): MAT001 / Probability, Statistics & Linear Algebra (Faculty: NF2 Maths, Venue: Smart Panel-D307-60, Group 1)
- Period 7 (02:20 PM - 03:10 PM): CSE102 / Web Dev I (HTML, CSS, JS Basics) (Faculty: 9555/Swati Priya Trainer, Venue: Smart Panel-D323-60, Group 1)
- Period 8 (03:10 PM - 04:00 PM): ECE001 / Basics of Electronics & Digital Logic Design (Faculty: 2141/Niraj Kumar, Venue: Smart Panel-D302-60 / D327, Group 1)

📅 TUESDAY:
- Period 1 (09:10 AM - 10:00 AM): MAT001 / Probability, Statistics & Linear Algebra (Venue: Smart Panel-D325-60, Group 1)
- Period 2 & 3 (10:05 AM - 11:50 AM): CSE102 / Web Dev I (HTML, CSS, JS Basics) (Faculty: 9555/Swati Priya Trainer, Venue: Smart Panel-D110-60, Group 1)
- Period 4 (11:50 AM - 12:40 PM): Free / Lunch Break
- Period 5 (12:40 PM - 01:30 PM): CS002 / COMMUNITY SERVICES / Mentor/Mentee
- Period 6 & 7 (01:30 PM - 03:10 PM):
  * Group 1: B502 / Maker Lab (Faculty: 2020/Gaurav)
  * Group 2: B506 / Electrical & Electronics Lab (Faculty: 2141/Niraj Kumar, ECE001)
- Period 8 (03:10 PM - 04:00 PM): Free / Library

📅 WEDNESDAY:
- Period 1 & 2 (09:10 AM - 10:55 AM): CSE103 / CS Fundamentals & Career Pathways (Faculty: NF-SOET-2, Venue: Smart Panel-D325-60, Group 1)
- Period 3 (11:00 AM - 11:50 AM): Free / Break
- Period 4 (11:50 AM - 12:40 PM): MAT001 / Probability, Statistics & Linear Algebra (Faculty: NF2 Maths, Venue: Smart Panel-D325-60, Group 1)
- Period 5 (12:40 PM - 01:30 PM): Free / Lunch Break
- Period 6 (01:30 PM - 02:20 PM): ECE001 / Basics of Electronics & Digital Logic Design (Faculty: 2141/Niraj Kumar, Venue: Smart Panel-D302-60 / D327, Group 1)
- Period 7 (02:20 PM - 03:10 PM): MAT001 / Probability, Statistics & Linear Algebra (Faculty: NF2 Maths, Venue: Smart Panel-D302-60 / D327, Group 1)
- Period 8 (03:10 PM - 04:00 PM): Free

📅 THURSDAY:
- Period 1 & 2 (09:10 AM - 10:55 AM): CSE101 / Programming for Problem Solving Using Python (Faculty: 2195/Pinki Kumari, Venue: Smart Panel-D323-60, Group 1)
- Period 3 & 4 (11:00 AM - 12:40 PM): CSE102 / Web Dev I Lab (Venue: LAB-14 "D105", Faculty: 9555/Swati Priya Trainer / Pinki Kumari, Group 1)
- Period 5 (12:40 PM - 01:30 PM): Free / Lunch Break
- Period 6 (01:30 PM - 02:20 PM): CSE101 / Programming for Problem Solving Using Python (Faculty: 2195/Pinki Kumari, Venue: Smart Panel-D323-60, Group 1)
- Period 7 (02:20 PM - 03:10 PM): CSE103 / CS Fundamentals & Career Pathways (Faculty: NF-SOET-2, Venue: Smart Panel-D309-60, Group 1)
- Period 8 (03:10 PM - 04:00 PM): Free

📅 FRIDAY:
- Period 1 & 2 (09:10 AM - 10:55 AM): Free / Self Study
- Period 3 & 4 (11:00 AM - 12:40 PM): CSE101 / Python Programming Lab (Venue: LAB-14 "D105", Faculty: 2195/Pinki Kumari, Group 1)
- Period 5 (12:40 PM - 01:30 PM): Free / Lunch Break
- Period 6 (01:30 PM - 02:20 PM): ECE001 / Basics of Electronics & Digital Logic Design (Faculty: 2141/Niraj Kumar, Venue: Smart Panel-D325-60, Group 1)
- Period 7 & 8 (02:20 PM - 04:00 PM):
  * Group 2: ECE001 / Electronics Lab (Venue: B002-Electrical & Electronics Lab, Faculty: 2141/Niraj Kumar)
  * Group 1: Free

📅 SATURDAY:
- No regular classes scheduled / Weekend Off.
"""

    return section_g_schedule
