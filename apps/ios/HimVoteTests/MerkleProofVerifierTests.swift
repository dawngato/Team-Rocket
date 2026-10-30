import Foundation
import XCTest
@testable import HimVoteKit

final class MerkleProofVerifierTests: XCTestCase {
    private let leafAlpha = "2a158d8afd48e3f88cb4195dfdb2a9e4817d95fa57fd34440d93f9aae5c4f82b"
    private let leafBravo = "798e6a07734241cb4ee9e30a512d3ac722a5fde3cbf9340755301d2715fd7810"
    private let leafCharlie = "f931962f0917c346d447293c07b687ae1609f7003f8a44a06a75c4145b1e1929"
    private let leftSubtree = "fb33dff7b9f27b94d57431d3c72e3268e5dda9c4de3d2b0d34ab34146d6e6806"
    private let root = "d4186e3c05a620ce61397e838bfbd76e6f27e6d7daa13c59eb82a8e094608e1c"

    func testVerifiesRfc9162StyleProofForUnevenTree() throws {
        let result = try MerkleProofVerifier.verify(
            leafIndex: 2,
            treeSize: 3,
            leafHashHex: leafCharlie,
            proofHex: [leftSubtree],
            expectedRootHex: root
        )

        XCTAssertTrue(result.valid)
        XCTAssertEqual(result.computedRootHex, root)
    }

    func testVerifiesLeftmostLeafOrdering() throws {
        let result = try MerkleProofVerifier.verify(
            leafIndex: 0,
            treeSize: 3,
            leafHashHex: leafAlpha,
            proofHex: [leafBravo, leafCharlie],
            expectedRootHex: root
        )

        XCTAssertTrue(result.valid)
    }

    func testRejectsModifiedLeafEvenWithWellFormedProof() throws {
        let result = try MerkleProofVerifier.verify(
            leafIndex: 2,
            treeSize: 3,
            leafHashHex: leafAlpha,
            proofHex: [leftSubtree],
            expectedRootHex: root
        )

        XCTAssertFalse(result.valid)
        XCTAssertNotEqual(result.computedRootHex, root)
    }

    func testRejectsMalformedDigestAndOutOfRangeLeaf() {
        XCTAssertThrowsError(
            try MerkleProofVerifier.verify(
                leafIndex: 2,
                treeSize: 3,
                leafHashHex: "not-a-digest",
                proofHex: [leftSubtree],
                expectedRootHex: root
            )
        ) { error in
            XCTAssertEqual(error as? MerkleProofVerificationError, .invalidDigest(name: "leafHash"))
        }

        XCTAssertThrowsError(
            try MerkleProofVerifier.verify(
                leafIndex: 3,
                treeSize: 3,
                leafHashHex: leafCharlie,
                proofHex: [leftSubtree],
                expectedRootHex: root
            )
        ) { error in
            XCTAssertEqual(error as? MerkleProofVerificationError, .leafOutsideTree)
        }
    }

    func testLeafHashUsesDomainSeparatedPrefix() {
        let digest = MerkleProofVerifier.leafHash(canonicalBytes: Data("alpha".utf8))
        XCTAssertEqual(digest, leafAlpha)
    }
}
