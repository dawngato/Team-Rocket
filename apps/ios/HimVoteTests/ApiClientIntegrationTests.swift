import Foundation
import XCTest
@testable import HimVoteKit

private final class RecordingURLProtocol: URLProtocol {
    nonisolated(unsafe) static var handler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        do {
            guard let handler = Self.handler else {
                throw ApiError.networkError(message: "No test response configured")
            }
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

private final class RequestRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var storedRequests: [URLRequest] = []

    func append(_ request: URLRequest) {
        lock.lock()
        storedRequests.append(request)
        lock.unlock()
    }

    var requests: [URLRequest] {
        lock.lock()
        defer { lock.unlock() }
        return storedRequests
    }
}

final class ApiClientIntegrationTests: XCTestCase {
    override func tearDown() {
        RecordingURLProtocol.handler = nil
        super.tearDown()
    }

    func testCastingAndReceiptRequestsUseAnonymousOriginBoundary() async throws {
        let recorder = RequestRecorder()
        RecordingURLProtocol.handler = { request in
            recorder.append(request)

            if request.url?.path.hasSuffix("/ballots") == true {
                let response = CastBallotResponse(
                    status: "COMMITTED_PENDING_WITNESS",
                    handle: "opaque_receipt_123",
                    leafIndex: 4,
                    nullifierCommitment: "nullifier_digest"
                )
                return try Self.httpResponse(for: request, body: response)
            }

            let status = ReceiptStatusResponse(
                status: "COMMITTED_PENDING_WITNESS",
                handle: "opaque_receipt_123",
                leafIndex: 4
            )
            return try Self.httpResponse(for: request, body: status)
        }

        let session = URLSession(configuration: Self.testConfiguration())
        let client = ApiClient(
            session: session,
            identityBaseUrl: URL(string: "https://identity.example.test")!,
            castingBaseUrl: URL(string: "https://casting.example.test")!
        )

        _ = try await client.castBallot(
            request: CastBallotRequest(
                electionId: "election-1",
                credentialProofB64url: "anonymous-proof",
                engineBallotB64url: "encrypted-ballot",
                engineProofsB64url: "engine-proof",
                idempotencyKey: "request-1"
            )
        )
        _ = try await client.fetchReceiptStatus(
            electionId: "election-1",
            handle: "opaque_receipt_123"
        )

        XCTAssertEqual(recorder.requests.count, 2)
        XCTAssertTrue(recorder.requests.allSatisfy { $0.url?.host == "casting.example.test" })
        XCTAssertTrue(recorder.requests.allSatisfy { $0.value(forHTTPHeaderField: "Authorization") == nil })
        XCTAssertTrue(recorder.requests.allSatisfy { $0.value(forHTTPHeaderField: "Cookie") == nil })
        XCTAssertTrue(recorder.requests.allSatisfy { $0.value(forHTTPHeaderField: "X-User-ID") == nil })
    }

    func testIdentityRequestCarriesSessionOnlyOnIdentityOrigin() async throws {
        let recorder = RequestRecorder()
        RecordingURLProtocol.handler = { request in
            recorder.append(request)
            let payload = "{\"elections\":[]}".data(using: .utf8)!
            return Self.httpResponse(for: request, data: payload)
        }

        let session = URLSession(configuration: Self.testConfiguration())
        let client = ApiClient(
            session: session,
            identityBaseUrl: URL(string: "https://identity.example.test")!,
            castingBaseUrl: URL(string: "https://casting.example.test")!
        )

        let elections = try await client.fetchElections(sessionToken: "identity-session-token")
        let capturedRequest = try XCTUnwrap(recorder.requests.first)

        XCTAssertTrue(elections.isEmpty)
        XCTAssertEqual(capturedRequest.url?.host, "identity.example.test")
        XCTAssertEqual(
            capturedRequest.value(forHTTPHeaderField: "Authorization"),
            "Bearer identity-session-token"
        )
    }

    func testConflictResponseMapsWithoutSurfacingServerBody() async throws {
        RecordingURLProtocol.handler = { request in
            let body = "{\"message\":\"private ballot artifact\"}".data(using: .utf8)!
            return Self.httpResponse(for: request, statusCode: 409, data: body)
        }

        let session = URLSession(configuration: Self.testConfiguration())
        let client = ApiClient(
            session: session,
            identityBaseUrl: URL(string: "https://identity.example.test")!,
            castingBaseUrl: URL(string: "https://casting.example.test")!
        )

        do {
            _ = try await client.castBallot(
                request: CastBallotRequest(
                    electionId: "election-1",
                    credentialProofB64url: "proof",
                    engineBallotB64url: "ballot",
                    engineProofsB64url: "proofs",
                    idempotencyKey: "request-1"
                )
            )
            XCTFail("Expected a conflict")
        } catch let error as ApiError {
            XCTAssertEqual(error, .conflict)
            XCTAssertFalse(error.localizedDescription.contains("private ballot artifact"))
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    private static func testConfiguration() -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [RecordingURLProtocol.self]
        return configuration
    }

    private static func httpResponse<T: Encodable>(
        for request: URLRequest,
        statusCode: Int = 200,
        body: T
    ) throws -> (HTTPURLResponse, Data) {
        let data = try JSONEncoder().encode(body)
        return httpResponse(for: request, statusCode: statusCode, data: data)
    }

    private static func httpResponse(
        for request: URLRequest,
        statusCode: Int = 200,
        data: Data
    ) -> (HTTPURLResponse, Data) {
        (
            HTTPURLResponse(
                url: request.url!,
                statusCode: statusCode,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!,
            data
        )
    }
}
