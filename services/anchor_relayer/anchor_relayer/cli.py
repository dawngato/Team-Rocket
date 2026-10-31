"""
Command line interface for running the anchor relayer service.
"""

import argparse
import logging
import sys
from web3 import Web3
from web3.providers.rpc import HTTPProvider
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
    try:
        config.validate_chain_configuration()
    except ValueError as exc:
        parser.error(str(exc))

    w3 = Web3(HTTPProvider(config.rpc_url))
    try:
        actual_chain_id = w3.eth.chain_id
    except Exception:
        parser.error("CHAIN_RPC_URL did not return a readable chain ID; anchoring remains disabled")
    if actual_chain_id != config.chain_id:
        parser.error(
            f"CHAIN_ID mismatch: configured {config.chain_id}, RPC reports {actual_chain_id}"
        )

    service = AnchorRelayerService(config=config, w3=w3)

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
