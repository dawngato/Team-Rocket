import XCTest
@testable import HimVoteKit

public final class MockKeychainService: KeychainServiceProtocol, @unchecked Sendable {
    public var storage: [String: Data] = [:]
    
    public init() {}
    
    public func save(data: Data, forKey key: String) throws {
        storage[key] = data
    }
    
    public func read(forKey key: String) throws -> Data {
        guard let data = storage[key] else {
            throw KeychainError.itemNotFound
        }
        return data
    }
    
    public func delete(forKey key: String) throws {
        storage.removeValue(forKey: key)
    }
    
    public func clearAll() throws {
        storage.removeAll()
    }
}

final class KeychainServiceTests: XCTestCase {
    var keychain: MockKeychainService!
    
    override func setUp() {
        super.setUp()
        keychain = MockKeychainService()
    }
    
    override func tearDown() {
        keychain = nil
        super.tearDown()
    }
    
    func testSaveAndReadData() throws {
        let testString = "secret_session_token_12345"
        let data = testString.data(using: .utf8)!
        
        try keychain.save(data: data, forKey: "test_key")
        let retrievedData = try keychain.read(forKey: "test_key")
        let retrievedString = String(data: retrievedData, encoding: .utf8)
        
        XCTAssertEqual(retrievedString, testString)
    }
    
    func testReadNonExistentKeyThrowsItemNotFound() {
        XCTAssertThrowsError(try keychain.read(forKey: "non_existent_key")) { error in
            XCTAssertEqual(error as? KeychainError, KeychainError.itemNotFound)
        }
    }
    
    func testDeleteItemRemovesData() throws {
        let testData = "data_to_delete".data(using: .utf8)!
        try keychain.save(data: testData, forKey: "delete_key")
        
        try keychain.delete(forKey: "delete_key")
        
        XCTAssertThrowsError(try keychain.read(forKey: "delete_key")) { error in
            XCTAssertEqual(error as? KeychainError, KeychainError.itemNotFound)
        }
    }
    
    func testClearAllRemovesAllEntries() throws {
        try keychain.save(data: "val1".data(using: .utf8)!, forKey: "k1")
        try keychain.save(data: "val2".data(using: .utf8)!, forKey: "k2")
        
        try keychain.clearAll()
        
        XCTAssertEqual(keychain.storage.count, 0)
    }
    
    func testSaveAndReadString() throws {
        try keychain.saveString("himvote_secure_string", forKey: "str_key")
        let result = try keychain.readString(forKey: "str_key")
        XCTAssertEqual(result, "himvote_secure_string")
    }
    
    func testExistsMethod() throws {
        XCTAssertFalse(keychain.exists(forKey: "check_key"))
        try keychain.saveString("sample", forKey: "check_key")
        XCTAssertTrue(keychain.exists(forKey: "check_key"))
    }
    
    func testSaveAndReadCredential() throws {
        let cred = Credential(
            electionId: "elec_test_99",
            blindSignatureResponse: "sig_resp_test",
            blindedSecret: "secret_test",
            unblindedSignature: "sig_resp_test",
            status: .delivered,
            issuedAtUtc: "2026-10-30T10:00:00Z"
        )
        
        try keychain.saveCredential(cred, forElectionId: "elec_test_99")
        XCTAssertTrue(keychain.hasCredential(forElectionId: "elec_test_99"))
        
        let retrieved = try keychain.readCredential(forElectionId: "elec_test_99")
        XCTAssertEqual(retrieved.electionId, "elec_test_99")
        XCTAssertEqual(retrieved.status, .delivered)
        
        try keychain.deleteCredential(forElectionId: "elec_test_99")
        XCTAssertFalse(keychain.hasCredential(forElectionId: "elec_test_99"))
    }
    
    func testSaveAndReadReceipt() throws {
        let receipt = Receipt(
            electionId: "elec_test_99",
            handle: "rcpt_test_handle",
            leafIndex: 10,
            status: .witnessed,
            nullifierCommitment: "nullifier_hash",
            witnessedAtUtc: "2026-10-30T12:00:00Z"
        )
        
        try keychain.saveReceipt(receipt)
        XCTAssertTrue(keychain.hasReceipt(handle: "rcpt_test_handle"))
        
        let retrieved = try keychain.readReceipt(handle: "rcpt_test_handle")
        XCTAssertEqual(retrieved.handle, "rcpt_test_handle")
        XCTAssertEqual(retrieved.status, .witnessed)
        XCTAssertEqual(retrieved.leafIndex, 10)
        
        try keychain.deleteReceipt(handle: "rcpt_test_handle")
        XCTAssertFalse(keychain.hasReceipt(handle: "rcpt_test_handle"))
    }
}
