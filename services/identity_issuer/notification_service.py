"""Explicit notification delivery for account lifecycle messages.

The identity service never treats a token as delivered merely because a
configuration flag is set. A configured channel must complete an SMTP or
HTTPS webhook handoff, otherwise the caller receives a failure and the token
must not be exposed.
"""

from __future__ import annotations

import json
import logging
import smtplib
import ssl
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from typing import Any

from .config import (
    NOTIFICATION_FROM_EMAIL,
    NOTIFICATION_PROVIDER,
    NOTIFICATION_PUBLIC_URL,
    NOTIFICATION_SMTP_HOST,
    NOTIFICATION_SMTP_PASSWORD,
    NOTIFICATION_SMTP_PORT,
    NOTIFICATION_SMTP_STARTTLS,
    NOTIFICATION_SMTP_USERNAME,
    NOTIFICATION_WEBHOOK_TOKEN,
    NOTIFICATION_WEBHOOK_URL,
)

logger = logging.getLogger("identity_issuer.notifications")


class NotificationDeliveryError(RuntimeError):
    """Raised when a configured notification transport cannot accept a message."""


class NotificationDeliveryService:
    def configuration_error(self) -> str | None:
        if NOTIFICATION_PROVIDER not in {"smtp", "webhook"}:
            return "NOTIFICATION_PROVIDER must be smtp or webhook"
        if not NOTIFICATION_FROM_EMAIL:
            return "NOTIFICATION_FROM_EMAIL is required"
        if not NOTIFICATION_PUBLIC_URL:
            return "NOTIFICATION_PUBLIC_URL is required"
        if NOTIFICATION_PROVIDER == "smtp" and not NOTIFICATION_SMTP_HOST:
            return "NOTIFICATION_SMTP_HOST is required"
        if NOTIFICATION_PROVIDER == "webhook" and not NOTIFICATION_WEBHOOK_URL:
            return "NOTIFICATION_WEBHOOK_URL is required"
        return None

    def ensure_configured(self) -> None:
        error = self.configuration_error()
        if error:
            raise NotificationDeliveryError(error)

    def action_url(self, category: str, token: str) -> str:
        self.ensure_configured()
        routes = {
            "activation": "/auth/verify?token=",
            "recovery": "/auth/recover?token=",
            "invitation": "/auth/invitation?token=",
        }
        route = routes.get(category)
        if route is None:
            raise NotificationDeliveryError(f"Unsupported notification category: {category}")
        return f"{NOTIFICATION_PUBLIC_URL}{route}{urllib.parse.quote(token, safe='')}"

    def dispatch(
        self,
        *,
        recipient: str,
        subject: str,
        body: str,
        category: str,
        token: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, str]:
        self.ensure_configured()
        link = self.action_url(category, token)
        safe_body = f"{body}\n\nContinue securely: {link}\n"
        if NOTIFICATION_PROVIDER == "smtp":
            self._send_smtp(recipient, subject, safe_body)
        else:
            self._send_webhook(recipient, subject, safe_body, category, metadata or {})
        logger.info("Notification accepted by configured transport category=%s", category)
        return {"status": "delivered", "category": category}

    def _send_smtp(self, recipient: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = NOTIFICATION_FROM_EMAIL
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)
        context = ssl.create_default_context()
        try:
            with smtplib.SMTP(NOTIFICATION_SMTP_HOST, NOTIFICATION_SMTP_PORT, timeout=10) as client:
                client.ehlo()
                if NOTIFICATION_SMTP_STARTTLS:
                    client.starttls(context=context)
                    client.ehlo()
                if NOTIFICATION_SMTP_USERNAME:
                    client.login(NOTIFICATION_SMTP_USERNAME, NOTIFICATION_SMTP_PASSWORD)
                client.send_message(message)
        except (OSError, smtplib.SMTPException) as exc:
            raise NotificationDeliveryError("SMTP notification transport rejected the message") from exc

    def _send_webhook(
        self,
        recipient: str,
        subject: str,
        body: str,
        category: str,
        metadata: dict[str, Any],
    ) -> None:
        payload = json.dumps({
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "category": category,
            "metadata": metadata,
        }).encode("utf-8")
        request = urllib.request.Request(
            NOTIFICATION_WEBHOOK_URL,
            data=payload,
            method="POST",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                **({"Authorization": f"Bearer {NOTIFICATION_WEBHOOK_TOKEN}"} if NOTIFICATION_WEBHOOK_TOKEN else {}),
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                if not 200 <= response.status < 300:
                    raise NotificationDeliveryError("Webhook notification transport rejected the message")
        except NotificationDeliveryError:
            raise
        except (OSError, urllib.error.URLError) as exc:
            raise NotificationDeliveryError("Webhook notification transport could not be reached") from exc


notification_service = NotificationDeliveryService()
