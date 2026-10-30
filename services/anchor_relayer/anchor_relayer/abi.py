"""
HimVoteAnchor contract ABI definition.
Stores election checkpoint commitments on chain.
"""

HIMVOTE_ANCHOR_ABI = [
    {
        "type": "constructor",
        "inputs": [
            {"name": "initialAdmin", "type": "address", "internalType": "address"},
            {"name": "initialRelayer", "type": "address", "internalType": "address"},
        ],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "RELAYER_ROLE",
        "inputs": [],
        "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "DEFAULT_ADMIN_ROLE",
        "inputs": [],
        "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "hasRole",
        "inputs": [
            {"name": "role", "type": "bytes32", "internalType": "bytes32"},
            {"name": "account", "type": "address", "internalType": "address"},
        ],
        "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "grantRole",
        "inputs": [
            {"name": "role", "type": "bytes32", "internalType": "bytes32"},
            {"name": "account", "type": "address", "internalType": "address"},
        ],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "revokeRole",
        "inputs": [
            {"name": "role", "type": "bytes32", "internalType": "bytes32"},
            {"name": "account", "type": "address", "internalType": "address"},
        ],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "anchorCheckpoint",
        "inputs": [
            {"name": "electionCommitment", "type": "bytes32", "internalType": "bytes32"},
            {"name": "sequence", "type": "uint256", "internalType": "uint256"},
            {"name": "digest", "type": "bytes32", "internalType": "bytes32"},
            {"name": "previousDigest", "type": "bytes32", "internalType": "bytes32"},
            {"name": "isFinal", "type": "bool", "internalType": "bool"},
        ],
        "outputs": [],
        "stateMutability": "nonpayable",
    },
    {
        "type": "function",
        "name": "latestSequence",
        "inputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
        "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "isFinalized",
        "inputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}],
        "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "getCheckpoint",
        "inputs": [
            {"name": "electionCommitment", "type": "bytes32", "internalType": "bytes32"},
            {"name": "sequence", "type": "uint256", "internalType": "uint256"},
        ],
        "outputs": [
            {"name": "seq", "type": "uint256", "internalType": "uint256"},
            {"name": "digest", "type": "bytes32", "internalType": "bytes32"},
            {"name": "previousDigest", "type": "bytes32", "internalType": "bytes32"},
            {"name": "isFinal", "type": "bool", "internalType": "bool"},
            {"name": "blockNumber", "type": "uint256", "internalType": "uint256"},
            {"name": "timestamp", "type": "uint256", "internalType": "uint256"},
        ],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "getLatestCheckpoint",
        "inputs": [{"name": "electionCommitment", "type": "bytes32", "internalType": "bytes32"}],
        "outputs": [
            {"name": "seq", "type": "uint256", "internalType": "uint256"},
            {"name": "digest", "type": "bytes32", "internalType": "bytes32"},
            {"name": "previousDigest", "type": "bytes32", "internalType": "bytes32"},
            {"name": "isFinal", "type": "bool", "internalType": "bool"},
            {"name": "blockNumber", "type": "uint256", "internalType": "uint256"},
            {"name": "timestamp", "type": "uint256", "internalType": "uint256"},
        ],
        "stateMutability": "view",
    },
    {
        "type": "event",
        "name": "CheckpointAnchored",
        "inputs": [
            {"name": "electionCommitment", "type": "bytes32", "indexed": True, "internalType": "bytes32"},
            {"name": "sequence", "type": "uint256", "indexed": True, "internalType": "uint256"},
            {"name": "digest", "type": "bytes32", "indexed": False, "internalType": "bytes32"},
            {"name": "previousDigest", "type": "bytes32", "indexed": False, "internalType": "bytes32"},
            {"name": "isFinal", "type": "bool", "indexed": False, "internalType": "bool"},
            {"name": "blockNumber", "type": "uint256", "indexed": False, "internalType": "uint256"},
            {"name": "timestamp", "type": "uint256", "indexed": False, "internalType": "uint256"},
        ],
        "anonymous": False,
    },
]
