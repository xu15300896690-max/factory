package com.factory.inventory.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "session")

@Singleton
class SessionStore @Inject constructor(@ApplicationContext private val context: Context) {

    private val userKey = stringPreferencesKey("user_json")

    val userFlow: Flow<User?> = context.dataStore.data.map { prefs ->
        prefs[userKey]?.let {
            try {
                kotlinx.serialization.json.Json.decodeFromString(User.serializer(), it)
            } catch {
                null
            }
        }
    }

    suspend fun currentUser(): User? = userFlow.first()

    suspend fun setUser(user: User?) {
        context.dataStore.edit { prefs ->
            if (user == null) prefs.remove(userKey)
            else prefs[userKey] = kotlinx.serialization.json.Json.encodeToString(User.serializer(), user)
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}