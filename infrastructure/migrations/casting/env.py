import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def get_url():
    url = os.getenv("CASTING_DB_URL")
    if url:
        return url
    host = os.getenv("CASTING_DB_HOST", "localhost")
    port = os.getenv("CASTING_DB_PORT", "5432")
    user = os.getenv("CASTING_DB_USER", "himvote_casting")
    password = os.getenv("CASTING_DB_PASSWORD", "himvote_casting")
    dbname = os.getenv("CASTING_DB_NAME", "himvote_casting")
    return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    if configuration is None:
        configuration = {}
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
