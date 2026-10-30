# Admin API migrations

Production startup requires a row in `schema_migrations` with
`service = 'admin_api'` and the exact `ADMIN_SCHEMA_VERSION` configured for
the release. The development and test profiles may use SQLAlchemy metadata
creation; production may not.

The deployment pipeline must apply the versioned admin migration bundle in a
transaction, record the row only after the migration commits, and run the
admin API readiness check before routing traffic.
