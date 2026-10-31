package com.himvote

import com.himvote.data.network.ApiClient
import com.himvote.data.storage.EncryptedStorage
import org.junit.Assert.*
import org.junit.Test
import org.mockito.Mockito

class CertificatePinningTest {

    @Test
    fun testCertificatePinnerIncludesRequiredDomainsAndPins() {
        val mockContext = Mockito.mock(android.content.Context::class.java)
        val encryptedStorage = EncryptedStorage(mockContext, customPrefs = InMemorySharedPreferences())
        val client = ApiClient(encryptedStorage = encryptedStorage, isDebug = false)

        val pinner = client.certificatePinner
        val pins = pinner.pins

        // Verify pins collection is not empty
        assertTrue("Pins must be configured for production", pins.isNotEmpty())

        val pinnedPatterns = pins.map { it.pattern }
        assertTrue("Must include api.himvote.example.in", pinnedPatterns.contains("api.himvote.example.in"))
        assertTrue("Must include cast.himvote.example.in", pinnedPatterns.contains("cast.himvote.example.in"))

        val pinnedHashes = pins.map { it.hash.hex() }
        assertTrue("Primary pin must be present", pinnedHashes.isNotEmpty())
    }

    @Test
    fun testEmulatorAddressForDebugMode() {
        val mockContext = Mockito.mock(android.content.Context::class.java)
        val encryptedStorage = EncryptedStorage(mockContext, customPrefs = InMemorySharedPreferences())
        val client = ApiClient(encryptedStorage = encryptedStorage, isDebug = true)

        assertEquals("Debug mode must route to 10.0.2.2 emulator alias", ApiClient.DEBUG_EMULATOR_URL, client.baseUrl)
    }

    @Test
    fun testNetworkSecurityConfigPermitsCleartextForEmulator() {
        val configFile = java.io.File("src/main/res/xml/network_security_config.xml")
        assertTrue("network_security_config.xml must exist", configFile.exists())
        val content = configFile.readText()
        assertTrue("Must permit cleartext for 10.0.2.2 emulator host", content.contains("<domain includeSubdomains=\"true\">10.0.2.2</domain>"))
        assertTrue("Must have cleartextTrafficPermitted=true", content.contains("cleartextTrafficPermitted=\"true\""))
    }
}
