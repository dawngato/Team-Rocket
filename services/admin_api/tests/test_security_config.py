import pytest

from src.config import Settings


def test_production_cannot_disable_established_engine_gate():
    with pytest.raises(RuntimeError, match="cannot disable the established-engine tally verification gate"):
        Settings(
            environment="production",
            admin_db_url="postgresql://admin:secret@db/himvote",
            identity_service_url="https://identity.invalid",
            require_established_engine_tally=False,
        )


def test_established_engine_verification_is_never_environment_asserted(monkeypatch):
    monkeypatch.setenv("ESTABLISHED_ENGINE_TALLY_VERIFIED", "true")
    settings = Settings()
    assert settings.established_engine_tally_verified is False
