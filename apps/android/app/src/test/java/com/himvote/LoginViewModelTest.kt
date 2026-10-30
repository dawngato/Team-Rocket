package com.himvote

import com.himvote.data.network.HimVoteApiService
import com.himvote.data.models.LoginRequest
import com.himvote.data.repository.AuthRepository
import com.himvote.data.storage.EncryptedStorage
import com.himvote.ui.screens.LoginViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var loginViewModel: LoginViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        val mockContext = Mockito.mock(android.content.Context::class.java)
        val encryptedStorage = EncryptedStorage(mockContext, customPrefs = InMemorySharedPreferences())
        val mockApiService = Mockito.mock(HimVoteApiService::class.java)
        val loginResponse = Response.success(com.himvote.data.models.LoginResponse(
                sessionToken = "session_token_from_identity_service",
                role = "student",
                userId = "student-1",
                user = com.himvote.data.models.UserProfile(
                    id = "student-1",
                    email = "student2026@hptu.ac.in",
                    name = "Synthetic Student"
                )
            ))
        kotlinx.coroutines.runBlocking {
            Mockito.doReturn(loginResponse).`when`(mockApiService).login(
                LoginRequest(
                    email = "student2026@hptu.ac.in",
                    password = "securePassword123"
                )
            )
        }
        authRepository = AuthRepository(mockApiService, encryptedStorage)
        loginViewModel = LoginViewModel(authRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testInitialUiStateIsEmpty() {
        val state = loginViewModel.uiState.value
        assertEquals("", state.email)
        assertEquals("", state.password)
        assertFalse(state.isLoading)
        assertNull(state.errorMessage)
    }

    @Test
    fun testInvalidEmailTriggersErrorMessage() {
        loginViewModel.onEmailChanged("not_an_email")
        loginViewModel.onPasswordChanged("password123")
        loginViewModel.login {}

        val state = loginViewModel.uiState.value
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("valid institution email"))
    }

    @Test
    fun testShortPasswordTriggersErrorMessage() {
        loginViewModel.onEmailChanged("student@hptu.ac.in")
        loginViewModel.onPasswordChanged("123")
        loginViewModel.login {}

        val state = loginViewModel.uiState.value
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("at least 6 characters"))
    }

    @Test
    fun testSuccessfulLoginEmitsSession() = runTest(testDispatcher) {
        var successCalled = false
        loginViewModel.onEmailChanged("student2026@hptu.ac.in")
        loginViewModel.onPasswordChanged("securePassword123")
        loginViewModel.login {
            successCalled = true
        }

        advanceUntilIdle()

        val state = loginViewModel.uiState.value
        assertFalse(state.isLoading)
        assertNotNull(state.session)
        assertEquals("student2026@hptu.ac.in", state.session?.email)
        assertTrue(successCalled)
    }
}
