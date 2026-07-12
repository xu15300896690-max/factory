package com.factory.inventory.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.factory.inventory.data.Audit
import com.factory.inventory.data.SessionStore
import com.factory.inventory.network.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MyAuditsViewModel @Inject constructor(
    private val api: ApiService,
    val sessionStore: SessionStore,
) : ViewModel() {

    private val _audits = MutableStateFlow<List<Audit>>(emptyList())
    val audits: StateFlow<List<Audit>> = _audits.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _loading.value = true
            try {
                val user = sessionStore.currentUser()
                _audits.value = api.listAudits(
                    operatorId = user?.id,
                    pageSize = 50,
                ).audits
            } catch (_: Exception) {
                // ignore
            } finally {
                _loading.value = false
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyAuditsScreen(
    onBack: () -> Unit,
    viewModel: MyAuditsViewModel = hiltViewModel(),
) {
    val audits by viewModel.audits.collectAsState()
    val loading by viewModel.loading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Audits") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                },
            )
        },
    ) { padding ->
        Box(modifier = Modifier
            .fillMaxSize()
            .padding(padding)) {
            if (loading && audits.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (audits.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No audits yet")
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(audits, key = { it.id }) { a ->
                        AuditRow(a)
                    }
                }
            }
        }
    }
}

@Composable
private fun AuditRow(a: Audit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                if (a.type == "inbound") Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                contentDescription = null,
                tint = if (a.type == "inbound") MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.error,
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    a.itemName ?: "Item #${a.itemId}",
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "${a.itemSku ?: ""} × ${a.quantity}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    a.createdAt,
                    style = MaterialTheme.typography.bodySmall,
                )
                if (!a.note.isNullOrBlank()) {
                    Text(
                        a.note,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            StatusChip(a.status)
        }
    }
}

@Composable
private fun StatusChip(status: String) {
    val (bg, fg, label) = when (status) {
        "approved" -> Triple(Color(0xFFDCFCE7), Color(0xFF166534), "APPROVED")
        "rejected" -> Triple(Color(0xFFFEE2E2), Color(0xFF991B1B), "REJECTED")
        else -> Triple(Color(0xFFFEF3C7), Color(0xFF92400E), "PENDING")
    }
    Surface(color = bg, shape = MaterialTheme.shapes.small) {
        Text(
            label,
            color = fg,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
        )
    }
}