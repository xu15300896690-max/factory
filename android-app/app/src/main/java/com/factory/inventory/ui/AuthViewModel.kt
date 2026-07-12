package com.factory.inventory.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.factory.inventory.data.LoginRequest
import com.factory.inventory.data.SessionStore
import com.factory.inventory.data.User
import com.factory.inventory.network.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: ApiService,
    private val sessionStore: SessionStore,
) : ViewModel() {

    val user: StateFlow<User?> = sessionStore.userFlow.stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5000), null
    )

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun login(username: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                val res = api.login(LoginRequest(username.trim(), password))
                sessionStore.setUser(res.user)
                onSuccess()
            } catch (e: retrofit2.HttpException) {
                _error.value = when (e.code()) {
                    401 -> "Invalid username or password"
                    429 -> "Too many attempts. Try again later."
                    else -> "Login failed (${e.code()})"
                }
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Network error"
            } finally {
                _loading.value = false
            }
        }
    }

    fun logout(onComplete: () -> Unit) {
        viewModelScope.launch {
            try {
                api.logout()
            } catch {
                // ignore
            }
            sessionStore.clear()
            onComplete()
        }
    }

    fun clearError() {
        _error.value = null
    }
}