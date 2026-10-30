import Foundation
import Security

public enum KeychainError: LocalizedError, Sendable, Equatable {
    case duplicateItem
    case itemNotFound
    case unexpectedData
    case unhandledError(status: OSStatus)
    
    public var errorDescription: String? {
        switch self {
        case .duplicateItem:
            return "The requested item already exists in the secure keychain store."
        case .itemNotFound:
            return "The requested cryptographic item was not found in the keychain."
        case .unexpectedData:
            return "The retrieved data format does not match the expected structure."
        case .unhandledError(let status):
            return "Encountered an unhandled Keychain status code \(status)."
        }
    }
}

public protocol KeychainServiceProtocol: Sendable {
    func save(data: Data, forKey key: String) throws
    func read(forKey key: String) throws -> Data
    func delete(forKey key: String) throws
    func clearAll() throws
}

public extension KeychainServiceProtocol {
    func exists(forKey key: String) -> Bool {
        do {
            _ = try read(forKey: key)
            return true
        } catch {
            return false
        }
    }
    
    func saveString(_ value: String, forKey key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.unexpectedData
        }
        try save(data: data, forKey: key)
    }
    
    func readString(forKey key: String) throws -> String {
        let data = try read(forKey: key)
        guard let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.unexpectedData
        }
        return string
    }
    
    func saveCodable<T: Encodable>(_ object: T, forKey key: String) throws {
        let encoder = JSONEncoder()
        let data = try encoder.encode(object)
        try save(data: data, forKey: key)
    }
    
    func readCodable<T: Decodable>(_ type: T.Type, forKey key: String) throws -> T {
        let data = try read(forKey: key)
        let decoder = JSONDecoder()
        return try decoder.decode(type, from: data)
    }
    
    func saveCredential(_ credential: Credential, forElectionId electionId: String) throws {
        let key = "himvote_credential_\(electionId)"
        try saveCodable(credential, forKey: key)
    }
    
    func readCredential(forElectionId electionId: String) throws -> Credential {
        let key = "himvote_credential_\(electionId)"
        return try readCodable(Credential.self, forKey: key)
    }
    
    func deleteCredential(forElectionId electionId: String) throws {
        let key = "himvote_credential_\(electionId)"
        try delete(forKey: key)
    }
    
    func hasCredential(forElectionId electionId: String) -> Bool {
        let key = "himvote_credential_\(electionId)"
        return exists(forKey: key)
    }
    
    func saveReceipt(_ receipt: Receipt) throws {
        let key = "himvote_receipt_\(receipt.handle)"
        try saveCodable(receipt, forKey: key)
    }
    
    func readReceipt(handle: String) throws -> Receipt {
        let key = "himvote_receipt_\(handle)"
        return try readCodable(Receipt.self, forKey: key)
    }
    
    func deleteReceipt(handle: String) throws {
        let key = "himvote_receipt_\(handle)"
        try delete(forKey: key)
    }
    
    func hasReceipt(handle: String) -> Bool {
        let key = "himvote_receipt_\(handle)"
        return exists(forKey: key)
    }
}

public final class KeychainService: KeychainServiceProtocol, @unchecked Sendable {
    public static let shared = KeychainService()
    
    public let serviceIdentifier: String
    private let accessGroup: String?
    
    public init(serviceIdentifier: String = "in.example.himvote.ios", accessGroup: String? = nil) {
        self.serviceIdentifier = serviceIdentifier
        self.accessGroup = accessGroup
    }
    
    public func save(data: Data, forKey key: String) throws {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceIdentifier,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        let status = SecItemAdd(query as CFDictionary, nil)
        
        if status == errSecDuplicateItem {
            var updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: serviceIdentifier,
                kSecAttrAccount as String: key,
                kSecAttrSynchronizable as String: kCFBooleanFalse as Any
            ]
            if let accessGroup = accessGroup {
                updateQuery[kSecAttrAccessGroup as String] = accessGroup
            }
            
            let attributesToUpdate: [String: Any] = [
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            ]
            let updateStatus = SecItemUpdate(updateQuery as CFDictionary, attributesToUpdate as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw KeychainError.unhandledError(status: updateStatus)
            }
        } else if status != errSecSuccess {
            throw KeychainError.unhandledError(status: status)
        }
    }
    
    public func read(forKey key: String) throws -> Data {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceIdentifier,
            kSecAttrAccount as String: key,
            kSecReturnData as String: kCFBooleanTrue as Any,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        guard status != errSecItemNotFound else {
            throw KeychainError.itemNotFound
        }
        
        guard status == errSecSuccess else {
            throw KeychainError.unhandledError(status: status)
        }
        
        guard let data = dataTypeRef as? Data else {
            throw KeychainError.unexpectedData
        }
        
        return data
    }
    
    public func delete(forKey key: String) throws {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceIdentifier,
            kSecAttrAccount as String: key,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unhandledError(status: status)
        }
    }
    
    public func clearAll() throws {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceIdentifier,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unhandledError(status: status)
        }
    }
}
