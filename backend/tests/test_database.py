"""Tests for database operations."""
import pytest
import sqlite3
import tempfile
import os
from unittest.mock import patch


class TestDatabaseInit:
    """Tests for database initialization."""

    def test_init_db_creates_table(self):
        """Test that init_db creates the waitlist table."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = f.name

        try:
            with patch("database.DB_PATH", db_path):
                import database
                database.DB_PATH = db_path
                database.init_db()

                # Verify table exists
                conn = sqlite3.connect(db_path)
                cursor = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='waitlist'"
                )
                result = cursor.fetchone()
                conn.close()

                assert result is not None
                assert result[0] == "waitlist"
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)

    def test_init_db_creates_correct_schema(self):
        """Test that the table has the correct columns."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = f.name

        try:
            with patch("database.DB_PATH", db_path):
                import database
                database.DB_PATH = db_path
                database.init_db()

                conn = sqlite3.connect(db_path)
                cursor = conn.execute("PRAGMA table_info(waitlist)")
                columns = {row[1]: row[2] for row in cursor.fetchall()}
                conn.close()

                assert "id" in columns
                assert "email" in columns
                assert "user_goal" in columns
                assert "created_at" in columns
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)

    def test_init_db_idempotent(self):
        """Test that calling init_db multiple times is safe."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = f.name

        try:
            with patch("database.DB_PATH", db_path):
                import database
                database.DB_PATH = db_path

                # Call init_db multiple times
                database.init_db()
                database.init_db()
                database.init_db()

                # Should still work
                conn = sqlite3.connect(db_path)
                cursor = conn.execute("SELECT COUNT(*) FROM waitlist")
                count = cursor.fetchone()[0]
                conn.close()

                assert count == 0
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)


class TestSaveEmail:
    """Tests for save_email function."""

    def test_save_email_new(self, test_db):
        """Test saving a new email."""
        import database
        database.DB_PATH = test_db

        result = database.save_email("test@example.com", "Get fit")
        assert result is True

    def test_save_email_duplicate(self, test_db):
        """Test saving a duplicate email."""
        import database
        database.DB_PATH = test_db

        database.save_email("duplicate@example.com", "Goal 1")
        result = database.save_email("duplicate@example.com", "Goal 2")
        assert result is False

    def test_save_email_none_goal(self, test_db):
        """Test saving an email with no goal."""
        import database
        database.DB_PATH = test_db

        result = database.save_email("nogoal@example.com", None)
        assert result is True

        # Verify it was saved correctly
        conn = sqlite3.connect(test_db)
        cursor = conn.execute("SELECT user_goal FROM waitlist WHERE email = ?", ("nogoal@example.com",))
        row = cursor.fetchone()
        conn.close()

        assert row is not None
        assert row[0] is None

    def test_save_email_stores_created_at(self, test_db):
        """Test that created_at timestamp is stored."""
        import database
        database.DB_PATH = test_db

        database.save_email("timestamp@example.com", "Goal")

        conn = sqlite3.connect(test_db)
        cursor = conn.execute("SELECT created_at FROM waitlist WHERE email = ?", ("timestamp@example.com",))
        row = cursor.fetchone()
        conn.close()

        assert row is not None
        assert row[0] is not None
        # Should be ISO format
        assert "T" in row[0]


class TestGetCount:
    """Tests for get_count function."""

    def test_get_count_empty(self, test_db):
        """Test count on empty database."""
        import database
        database.DB_PATH = test_db

        count = database.get_count()
        assert count == 0

    def test_get_count_single(self, test_db):
        """Test count after one insert."""
        import database
        database.DB_PATH = test_db

        database.save_email("one@example.com", "Goal")
        count = database.get_count()
        assert count == 1

    def test_get_count_multiple(self, test_db):
        """Test count after multiple inserts."""
        import database
        database.DB_PATH = test_db

        for i in range(5):
            database.save_email(f"user{i}@example.com", f"Goal {i}")

        count = database.get_count()
        assert count == 5

    def test_get_count_excludes_duplicates(self, test_db):
        """Test that duplicates don't increase count."""
        import database
        database.DB_PATH = test_db

        database.save_email("same@example.com", "Goal 1")
        database.save_email("same@example.com", "Goal 2")
        database.save_email("same@example.com", "Goal 3")

        count = database.get_count()
        assert count == 1
