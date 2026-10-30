"""
Unit tests for configuration loading and URL generation.
"""

from checkpoint_worker.config import Settings


def test_settings_database_url_default():
    """
    Default PostgreSQL URL must be constructed when DATABASE_URL is not set.
    """
    s = Settings(
        DATABASE_URL=None,
        CASTING_DB_USER="usr",
        CASTING_DB_PASSWORD="pwd",
        CASTING_DB_HOST="dbhost",
        CASTING_DB_PORT=5432,
        CASTING_DB_NAME="casting_test",
        CASTING_DB_SSL_MODE="disable",
    )
    url = s.get_database_url()
    assert "postgresql://usr:pwd@dbhost:5432/casting_test" in url


def test_settings_database_url_override():
    """
    Explicit DATABASE_URL must override component parameters.
    """
    custom = "sqlite:///custom.db"
    s = Settings(DATABASE_URL=custom)
    assert s.get_database_url() == custom


def test_settings_database_url_ssl():
    """
    SSL mode require must be appended to database URL.
    """
    s = Settings(
        DATABASE_URL=None,
        CASTING_DB_USER="usr",
        CASTING_DB_PASSWORD="pwd",
        CASTING_DB_HOST="dbhost",
        CASTING_DB_PORT=5432,
        CASTING_DB_NAME="casting_test",
        CASTING_DB_SSL_MODE="require",
    )
    url = s.get_database_url()
    assert "sslmode=require" in url
