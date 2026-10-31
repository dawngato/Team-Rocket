# Profile Editing API Contract

This contract describes the identity service endpoints consumed by the iOS client. Profile editing is for synthetic educational accounts. It does not change voting eligibility, the institutional roster, authentication identifiers, or ballot records.

## Authentication

The caller must have an active identity-service session. Send either:

```http
Authorization: Bearer <session_token>
```

or the existing `session_id` cookie. Cookie-authenticated mutations must satisfy the identity service's same-site Origin / Fetch Metadata checks. The server derives ownership from the session; the request has no user ID field.

## Read current profile

```http
GET /v1/profile/me
```

`200 OK` response:

```json
{
  "id": "account-id",
  "display_name": "Ada Student",
  "phone_number": "+14155552671",
  "updated_at": "2026-10-31T08:30:00Z"
}
```

Both editable values may be `null`. The response deliberately omits email, external/student ID, role, department, eligibility, password data, MFA data, session tokens, and election data.

## Update current profile

```http
PATCH /v1/profile/me
Content-Type: application/json
```

Request fields are optional individually, but at least one must be present. Unknown properties are rejected.

```json
{
  "display_name": "Ada Student",
  "phone_number": "+14155552671"
}
```

Successful response is `200 OK` and has the same shape as `GET /v1/profile/me`, containing the saved values and the account's updated timestamp.

### Editable fields and validation

| Field | Rules | Clearing |
|---|---|---|
| `display_name` | String, 1–80 characters after whitespace normalization; whitespace runs become a single space. Whitespace-only values are invalid. | Send `null`. Empty string is invalid. |
| `phone_number` | Optional E.164 format: `+` followed by 8–15 ASCII digits, with a nonzero first digit. | Send `null` or `""`. |

### Protected fields

`id`, `user_id`, `email`, `external_id`, student/enrollment identity, role and role assignments, account status, eligibility, department/campus assignments, authentication identifiers, passwords, MFA settings, and election permissions are not editable here. These and any other unrecognized request fields receive `422`; no protected value is changed.

### Errors

| HTTP | Meaning |
|---|---|
| `401` | Missing, expired, or invalid session. |
| `403` | Authenticated account is not active, or cookie mutation fails CSRF/origin checks. |
| `422` | Empty body, protected/unknown field, invalid display name, or invalid phone number. |
| `429` | More than 20 profile update requests for this account in five minutes. |
| `503` | Rate limiting or profile persistence is unavailable. Profile/audit writes are committed in one database transaction. |

Validation errors use FastAPI's standard `detail` response. Persistence errors return a generic message and do not return SQL or database details. The append-only identity audit event records the actor and names of changed fields only; it does not record submitted field values, passwords, or tokens.

## Data and migration

The identity `users` table gains nullable `display_name VARCHAR(80)` and `phone_number VARCHAR(16)` columns. Existing records remain valid and unchanged. Apply Alembic revision `0005_profile_attributes` before deploying code that reads the new columns. Its downgrade removes only those two columns. `student_profiles.full_name`, institutional email, roster membership, and department assignment remain institution-controlled.

The profile endpoint updates only the authenticated account. Concurrent updates to separate fields only write those fields; if two updates target the same field, the last committed update wins.
