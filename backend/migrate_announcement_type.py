import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent / 'college.db'

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check announcements columns
    cols = [c[1] for c in cursor.execute('PRAGMA table_info(announcements)').fetchall()]
    if 'announcement_type' not in cols:
        cursor.execute("ALTER TABLE announcements ADD COLUMN announcement_type TEXT DEFAULT 'event'")
        print('Added announcement_type to announcements')
    else:
        print('announcement_type already exists in announcements')

    # Check teacher_submissions columns
    cols_ts = [c[1] for c in cursor.execute('PRAGMA table_info(teacher_submissions)').fetchall()]
    if 'announcement_type' not in cols_ts:
        cursor.execute("ALTER TABLE teacher_submissions ADD COLUMN announcement_type TEXT DEFAULT 'event'")
        print('Added announcement_type to teacher_submissions')
    else:
        print('announcement_type already exists in teacher_submissions')

    # Update existing records where category is academic/general/exam
    cursor.execute("UPDATE announcements SET announcement_type = 'academic' WHERE LOWER(category) IN ('academic', 'general', 'exam', 'examination')")
    cursor.execute("UPDATE announcements SET announcement_type = 'event' WHERE announcement_type IS NULL OR announcement_type NOT IN ('event', 'academic')")

    cursor.execute("UPDATE teacher_submissions SET announcement_type = 'academic' WHERE LOWER(category) IN ('academic', 'general', 'exam', 'examination')")
    cursor.execute("UPDATE teacher_submissions SET announcement_type = 'event' WHERE announcement_type IS NULL OR announcement_type NOT IN ('event', 'academic')")

    conn.commit()
    print('Migration complete. Current counts in announcements:')
    counts = cursor.execute('SELECT announcement_type, COUNT(*) FROM announcements GROUP BY announcement_type').fetchall()
    for row in counts:
        print(f"  Type '{row[0]}': {row[1]} announcement(s)")

    conn.close()

if __name__ == '__main__':
    migrate()
