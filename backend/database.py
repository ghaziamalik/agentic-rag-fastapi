import sqlite3

DB_NAME = "chat_history.db"


# ═════════════════════════════════════════════════════════
# INIT
# ═════════════════════════════════════════════════════════
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  email TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  name TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')

    c.execute('''CREATE TABLE IF NOT EXISTS sessions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  title TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY(user_id) REFERENCES users(id))''')

    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  session_id INTEGER,
                  role TEXT,
                  content TEXT,
                  FOREIGN KEY(session_id) REFERENCES sessions(id))''')

    c.execute('''CREATE TABLE IF NOT EXISTS session_documents
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  session_id INTEGER,
                  doc_name TEXT,
                  UNIQUE(session_id, doc_name),
                  FOREIGN KEY(session_id) REFERENCES sessions(id))''')

    c.execute('''CREATE TABLE IF NOT EXISTS user_documents
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  doc_name TEXT,
                  UNIQUE(user_id, doc_name),
                  FOREIGN KEY(user_id) REFERENCES users(id))''')

    # ✅ Password reset tokens
    c.execute('''CREATE TABLE IF NOT EXISTS password_resets
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  token TEXT UNIQUE,
                  expires_at DATETIME,
                  used INTEGER DEFAULT 0,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY(user_id) REFERENCES users(id))''')

    # ─── Safe migrations for existing DBs ───
    c.execute("PRAGMA table_info(password_resets)")
    pr_cols = [row[1] for row in c.fetchall()]
    if "expires_at" not in pr_cols:
        c.execute("ALTER TABLE password_resets ADD COLUMN expires_at DATETIME")
    if "used" not in pr_cols:
        c.execute("ALTER TABLE password_resets ADD COLUMN used INTEGER DEFAULT 0")

    c.execute("PRAGMA table_info(sessions)")
    sess_cols = [row[1] for row in c.fetchall()]
    if "user_id" not in sess_cols:
        c.execute("ALTER TABLE sessions ADD COLUMN user_id INTEGER")

    conn.commit()
    conn.close()


# ═════════════════════════════════════════════════════════
# USERS
# ═════════════════════════════════════════════════════════
def create_user(email: str, password_hash: str, name: str = ""):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute(
            "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
            (email.lower().strip(), password_hash, name)
        )
        user_id = c.lastrowid
        conn.commit()
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        conn.close()
        return None


def get_user_by_email(email: str):
    """Returns (id, email, password_hash, name) or None."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "SELECT id, email, password_hash, name FROM users WHERE email = ?",
        (email.lower().strip(),)
    )
    row = c.fetchone()
    conn.close()
    return row


def get_user_by_id(user_id: int):
    """Returns (id, email, name) or None."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT id, email, name FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return row


# ═════════════════════════════════════════════════════════
# PASSWORD RESET
# ═════════════════════════════════════════════════════════
def update_user_password(user_id: int, new_password_hash: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (new_password_hash, user_id)
    )
    conn.commit()
    conn.close()


def create_reset_token(user_id: int, token: str, expires_at_iso: str):
    """Deletes any existing tokens for this user first."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM password_resets WHERE user_id = ?", (user_id,))
    c.execute(
        "INSERT INTO password_resets (user_id, token, expires_at, used) "
        "VALUES (?, ?, ?, 0)",
        (user_id, token, expires_at_iso)
    )
    conn.commit()
    conn.close()


def get_reset_token_row(token: str):
    """Returns dict {user_id, expires_at, used} or None."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "SELECT user_id, expires_at, used FROM password_resets WHERE token = ?",
        (token,)
    )
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return {"user_id": row[0], "expires_at": row[1], "used": row[2]}


def mark_reset_token_used(token: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE password_resets SET used = 1 WHERE token = ?", (token,))
    conn.commit()
    conn.close()


def delete_reset_token(token: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM password_resets WHERE token = ?", (token,))
    conn.commit()
    conn.close()


# ═════════════════════════════════════════════════════════
# SESSIONS
# ═════════════════════════════════════════════════════════
def create_session(user_id: int, title="New Chat"):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO sessions (user_id, title) VALUES (?, ?)", (user_id, title))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id


def get_all_sessions(user_id: int):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "SELECT id, title FROM sessions WHERE user_id = ? ORDER BY timestamp DESC",
        (user_id,)
    )
    sessions = c.fetchall()
    conn.close()
    return sessions


def add_message(session_id, role, content):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
        (session_id, role, content)
    )
    conn.commit()
    conn.close()


def get_chat_history(session_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC",
        (session_id,)
    )
    history = c.fetchall()
    conn.close()
    return history


def session_belongs_to_user(session_id: int, user_id: int) -> bool:
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT 1 FROM sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
    row = c.fetchone()
    conn.close()
    return row is not None


def delete_session(session_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    c.execute("DELETE FROM session_documents WHERE session_id = ?", (session_id,))
    c.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()


def delete_all_sessions(user_id: int):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT id FROM sessions WHERE user_id = ?", (user_id,))
    session_ids = [r[0] for r in c.fetchall()]
    for sid in session_ids:
        c.execute("DELETE FROM messages WHERE session_id = ?", (sid,))
        c.execute("DELETE FROM session_documents WHERE session_id = ?", (sid,))
        c.execute("DELETE FROM sessions WHERE id = ?", (sid,))
    conn.commit()
    conn.close()


def update_session_title(session_id, title):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE sessions SET title = ? WHERE id = ?", (title, session_id))
    conn.commit()
    conn.close()


# ═════════════════════════════════════════════════════════
# CROSS-CHAT SUMMARY
# ═════════════════════════════════════════════════════════
def get_all_chats_summary(user_id: int,
                          exclude_session_id=None,
                          max_messages_per_chat=5,
                          max_sessions=5,
                          max_chars_per_message=300):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    if exclude_session_id:
        c.execute(
            "SELECT id, title FROM sessions WHERE user_id = ? AND id != ? "
            "ORDER BY timestamp DESC LIMIT ?",
            (user_id, exclude_session_id, max_sessions)
        )
    else:
        c.execute(
            "SELECT id, title FROM sessions WHERE user_id = ? "
            "ORDER BY timestamp DESC LIMIT ?",
            (user_id, max_sessions)
        )

    sessions = c.fetchall()
    if not sessions:
        conn.close()
        return "No other chat sessions exist."

    blocks = []
    for sess_id, title in sessions:
        c.execute(
            "SELECT role, content FROM messages WHERE session_id = ? "
            "ORDER BY id ASC LIMIT ?",
            (sess_id, max_messages_per_chat)
        )
        messages = c.fetchall()
        if not messages:
            continue
        block = f"=== Chat: '{title}' ===\n"
        for role, content in messages:
            short = content.replace("\n", " ").strip()
            if len(short) > max_chars_per_message:
                short = short[:max_chars_per_message] + "..."
            block += f"{role.upper()}: {short}\n"
        blocks.append(block)

    conn.close()
    if not blocks:
        return "No other chat sessions have content."
    return "\n\n".join(blocks)


# ═════════════════════════════════════════════════════════
# USER DOCUMENTS
# ═════════════════════════════════════════════════════════
def link_user_document(user_id: int, doc_name: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute(
            "INSERT OR IGNORE INTO user_documents (user_id, doc_name) VALUES (?, ?)",
            (user_id, doc_name)
        )
        conn.commit()
    except Exception as e:
        print(f"link_user_document error: {e}")
    conn.close()


def get_user_documents(user_id: int):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "SELECT doc_name FROM user_documents WHERE user_id = ? ORDER BY doc_name",
        (user_id,)
    )
    rows = c.fetchall()
    conn.close()
    return [r[0] for r in rows]


def remove_user_document(user_id: int, doc_name: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "DELETE FROM user_documents WHERE user_id = ? AND doc_name = ?",
        (user_id, doc_name)
    )
    conn.commit()
    conn.close()


def clear_user_documents(user_id: int):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM user_documents WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()


# ═════════════════════════════════════════════════════════
# DOCUMENT ↔ SESSION CASCADE
# ═════════════════════════════════════════════════════════
def link_document_to_session(session_id: int, doc_name: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute(
            "INSERT OR IGNORE INTO session_documents (session_id, doc_name) VALUES (?, ?)",
            (session_id, doc_name)
        )
        conn.commit()
    except Exception as e:
        print(f"link_document_to_session error: {e}")
    conn.close()


def get_sessions_using_document(doc_name: str):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute(
        "SELECT DISTINCT session_id FROM session_documents WHERE doc_name = ?",
        (doc_name,)
    )
    rows = c.fetchall()
    conn.close()
    return [r[0] for r in rows]


def delete_sessions_by_document(doc_name: str):
    session_ids = get_sessions_using_document(doc_name)
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    for sid in session_ids:
        c.execute("DELETE FROM messages WHERE session_id = ?", (sid,))
        c.execute("DELETE FROM session_documents WHERE session_id = ?", (sid,))
        c.execute("DELETE FROM sessions WHERE id = ?", (sid,))
    conn.commit()
    conn.close()
    return session_ids

# ═════════════════════════════════════════════════════════
# ADMIN DASHBOARD QUERIES
# ═════════════════════════════════════════════════════════
def get_all_users_with_stats():
    """Return every user with their doc/session/message counts."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT
            u.id,
            u.email,
            u.name,
            u.created_at,
            COALESCE((SELECT COUNT(*) FROM user_documents WHERE user_id = u.id), 0) AS doc_count,
            COALESCE((SELECT COUNT(*) FROM sessions WHERE user_id = u.id), 0) AS session_count,
            COALESCE((
                SELECT COUNT(*) FROM messages m
                JOIN sessions s ON m.session_id = s.id
                WHERE s.user_id = u.id
            ), 0) AS message_count
        FROM users u
        ORDER BY u.created_at DESC
    """)

    rows = c.fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "email": r[1],
            "name": r[2] or r[1].split("@")[0],
            "created_at": r[3],
            "doc_count": r[4],
            "session_count": r[5],
            "message_count": r[6],
        }
        for r in rows
    ]


def get_all_documents_with_owners():
    """Return every uploaded document with owner info."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT
            ud.id,
            ud.doc_name,
            ud.user_id,
            u.email,
            u.name
        FROM user_documents ud
        JOIN users u ON ud.user_id = u.id
        ORDER BY ud.id DESC
    """)

    rows = c.fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "doc_name": r[1],
            "user_id": r[2],
            "user_email": r[3],
            "user_name": r[4] or r[3].split("@")[0],
        }
        for r in rows
    ]


def get_all_sessions_global():
    """Return every session across all users."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT
            s.id,
            s.title,
            s.user_id,
            s.timestamp,
            u.email,
            COALESCE((SELECT COUNT(*) FROM messages WHERE session_id = s.id), 0) AS msg_count
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.timestamp DESC
        LIMIT 100
    """)

    rows = c.fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "title": r[1],
            "user_id": r[2],
            "timestamp": r[3],
            "user_email": r[4],
            "message_count": r[5],
        }
        for r in rows
    ]


init_db()