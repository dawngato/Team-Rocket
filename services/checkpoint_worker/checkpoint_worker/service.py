"""
Daemon service runner for HimVote checkpoint worker.
Manages database connection lifecycle, worker polling loop, and graceful shutdown.
"""

import sys
import time
import signal
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from checkpoint_worker.config import settings
from checkpoint_worker.witness_client import WitnessClient
from checkpoint_worker.worker import CheckpointWorker

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("checkpoint_worker")


class ServiceRunner:
    """
    Manages runtime lifecycle of the checkpoint worker daemon.
    """

    def __init__(self):
        self.running = True
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    def _handle_signal(self, signum, frame):
        logger.info("Received termination signal %d, shutting down gracefully", signum)
        self.running = False

    def run(self):
        """
        Main execution loop.
        """
        db_url = settings.get_database_url()
        logger.info("Starting HimVote checkpoint worker service")

        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        session_factory = sessionmaker(bind=engine, expire_on_commit=False)

        witness_client = WitnessClient(
            witness_url=settings.WITNESS_URL,
            pinned_witness_public_key=settings.WITNESS_PUBLIC_KEY,
            timeout_seconds=settings.WITNESS_TIMEOUT_SECONDS,
            max_retries=settings.WITNESS_MAX_RETRIES,
            retry_backoff_base=settings.WITNESS_RETRY_BACKOFF_BASE,
        )

        worker = CheckpointWorker(
            session_factory=session_factory,
            witness_client=witness_client,
            log_writer_private_key_raw=settings.LOG_WRITER_PRIVATE_KEY,
            log_writer_key_id=settings.LOG_WRITER_KEY_ID,
            batch_size=settings.BATCH_SIZE,
        )

        logger.info(
            "Worker loop active: polling every %f seconds with batch size %d",
            settings.POLL_INTERVAL_SECONDS,
            settings.BATCH_SIZE,
        )

        while self.running:
            try:
                results = worker.poll_once()
                if results:
                    logger.info("Processed %d checkpoints across active elections", len(results))
            except Exception as exc:
                logger.exception("Unexpected error in worker poll iteration: %s", str(exc))

            time.sleep(settings.POLL_INTERVAL_SECONDS)

        logger.info("Checkpoint worker service stopped cleanly")


def main():
    """CLI entrypoint."""
    runner = ServiceRunner()
    runner.run()


if __name__ == "__main__":
    main()
