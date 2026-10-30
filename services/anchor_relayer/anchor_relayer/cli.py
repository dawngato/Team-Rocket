"""
Command line interface for running the anchor relayer service.
"""

import argparse
import logging
import sys
from anchor_relayer.config import RelayerConfig
from anchor_relayer.service import AnchorRelayerService


def main() -> None:
    parser = argparse.ArgumentParser(description="HimVote Anchor Relayer Service")
    parser.add_argument("--once", action="store_true", help="Run a single processing batch and exit")
    parser.add_argument("--interval", type=float, default=None, help="Polling interval in seconds")
    args = parser.parse_args()

    config = RelayerConfig()
    logging.basicConfig(
        level=getattr(logging, config.log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    service = AnchorRelayerService(config=config)

    if args.once:
        logging.info("Executing single anchor relayer cycle")
        service.run_once()
        sys.exit(0)
    else:
        logging.info("Starting anchor relayer service daemon")
        try:
            service.run_loop(poll_interval=args.interval)
        except KeyboardInterrupt:
            logging.info("Shutdown requested")
            service.stop()
            sys.exit(0)


if __name__ == "__main__":
    main()
