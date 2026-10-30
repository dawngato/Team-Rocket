import CryptoKit
import Foundation

public enum MerkleProofVerificationError: LocalizedError, Sendable, Equatable {
    case invalidDigest(name: String)
    case invalidHex(name: String)
    case invalidTreeSize
    case leafOutsideTree
    case proofLengthMismatch

    public var errorDescription: String? {
        switch self {
        case .invalidDigest(let name):
            return "\(name) must be a 32-byte SHA-256 digest."
        case .invalidHex(let name):
            return "\(name) contains invalid hexadecimal data."
        case .invalidTreeSize:
            return "The authenticated Merkle tree must contain at least one leaf."
        case .leafOutsideTree:
            return "The receipt leaf is outside the authenticated Merkle tree."
        case .proofLengthMismatch:
            return "The Merkle proof does not cover the authenticated tree."
        }
    }
}

public struct MerkleInclusionResult: Sendable, Equatable {
    public let computedRootHex: String
    public let expectedRootHex: String
    public let valid: Bool

    public init(computedRootHex: String, expectedRootHex: String, valid: Bool) {
        self.computedRootHex = computedRootHex
        self.expectedRootHex = expectedRootHex
        self.valid = valid
    }
}

/// Verifies the RFC 9162 style tree used by the casting service.
///
/// The server supplies an already hashed leaf and its sibling path. This
/// client never treats a status label, a leaf index, or a visual checkpoint
/// as proof. A receipt is only marked included when this computation matches
/// the authenticated witness root and tree size.
public enum MerkleProofVerifier {
    private static let digestByteCount = 32

    public static func leafHash(canonicalBytes: Data) -> String {
        var input = Data([0x00])
        input.append(canonicalBytes)
        return hex(SHA256.hash(data: input))
    }

    public static func nodeHash(leftHex: String, rightHex: String) throws -> String {
        let left = try digestData(leftHex, name: "left")
        let right = try digestData(rightHex, name: "right")
        var input = Data([0x01])
        input.append(left)
        input.append(right)
        return hex(SHA256.hash(data: input))
    }

    public static func verify(
        leafIndex: Int,
        treeSize: Int,
        leafHashHex: String,
        proofHex: [String],
        expectedRootHex: String
    ) throws -> MerkleInclusionResult {
        guard treeSize > 0 else {
            throw MerkleProofVerificationError.invalidTreeSize
        }
        guard leafIndex >= 0 && leafIndex < treeSize else {
            throw MerkleProofVerificationError.leafOutsideTree
        }

        _ = try digestData(leafHashHex, name: "leafHash")
        _ = try digestData(expectedRootHex, name: "expectedRoot")
        for (index, sibling) in proofHex.enumerated() {
            _ = try digestData(sibling, name: "proof[\(index)]")
        }

        var nodeIndex = leafIndex
        var remaining = treeSize - 1
        var current = leafHashHex.lowercased()
        var consumedSteps = 0

        for sibling in proofHex {
            if remaining == 0 {
                break
            }

            if (nodeIndex & 1) == 1 || nodeIndex == remaining {
                current = try nodeHash(leftHex: sibling, rightHex: current)
                if (nodeIndex & 1) == 0 {
                    while (nodeIndex & 1) == 0 && nodeIndex > 0 {
                        nodeIndex >>= 1
                        remaining >>= 1
                    }
                }
            } else {
                current = try nodeHash(leftHex: current, rightHex: sibling)
            }

            consumedSteps += 1
            nodeIndex >>= 1
            remaining >>= 1
        }

        guard remaining == 0 && consumedSteps == proofHex.count else {
            throw MerkleProofVerificationError.proofLengthMismatch
        }

        let normalizedExpectedRoot = expectedRootHex.lowercased()
        return MerkleInclusionResult(
            computedRootHex: current,
            expectedRootHex: normalizedExpectedRoot,
            valid: current == normalizedExpectedRoot
        )
    }

    private static func digestData(_ value: String, name: String) throws -> Data {
        guard value.count == digestByteCount * 2 else {
            throw MerkleProofVerificationError.invalidDigest(name: name)
        }
        guard value.allSatisfy({ $0.isHexDigit }) else {
            throw MerkleProofVerificationError.invalidHex(name: name)
        }

        var data = Data()
        data.reserveCapacity(digestByteCount)
        var index = value.startIndex
        for _ in 0..<digestByteCount {
            let nextIndex = value.index(index, offsetBy: 2)
            let byteString = String(value[index..<nextIndex])
            guard let byte = UInt8(byteString, radix: 16) else {
                throw MerkleProofVerificationError.invalidHex(name: name)
            }
            data.append(byte)
            index = nextIndex
        }
        return data
    }

    private static func hex<D: Sequence>(_ digest: D) -> String where D.Element == UInt8 {
        digest.map { String(format: "%02x", $0) }.joined()
    }
}
