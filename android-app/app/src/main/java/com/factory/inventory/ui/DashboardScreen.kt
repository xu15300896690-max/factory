package com.factory.inventory.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.factory.inventory.data.DashboardSummary
import com.factory.inventory.data.SessionStore
import com.factory.inventory.network.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val api: ApiService,
    val sessionStore: SessionStore,
) : ViewModel() {

    private val _summary = MutableStateFlow<DashboardSummary?>(null)
    val summary: StateFlow<DashboardSummary?> = _summary.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                _summary.value = api.dashboard()
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Failed to load"
            } finally {
                _loading.value = false
            }
        }
    }
}

@Composable
fun DashboardScreen(
    onScanClick: () -> Unit,
    onMyAuditsClick: () -> Unit,
    onLogout: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val summary by viewModel.summary.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val user by viewModel.sessionStore.userFlow.collectAsState(initial = null)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Factory Inventory") },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Filled.Logout, "Sign out")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
        ) {
            if (user != null) {
                Text(
                    "Hello, ${user!!.displayName}",
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Operator • ${user!!.username}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(Modifier.height(16.dp))

            if (loading && summary == null) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (summary != null) {
                val s = summary!!
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            label = "Total Items",
                            value = "${s.totalItems}",
                            icon = Icons.Default.Inventory,
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            label = "Low Stock",
                            value = "${s.lowStockCount}",
                            icon = Icons.Default.Warning,
                        )
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            label = "Pending Audits",
                            value = "${s.pendingAudits}",
                            icon = Icons.Default.PendingActions,
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            label = "Stock Value",
                            value = "$%.2f".format(s.totalStockValue),
                            icon = Icons.Default.AttachMoney,
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            Button(
                onClick = onScanClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(72.dp),
            ) {
                Icon(Icons.Default.QrCodeScanner, null, modifier = Modifier.size(32.dp))
                Spacer(Modifier.width(12.dp))
                Text("Scan Barcode", style = MaterialTheme.typography.titleMedium)
            }

            Spacer(Modifier.height(12.dp))

            OutlinedButton(
                onClick = onMyAuditsClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
            ) {
                Icon(Icons.Default.History, null)
                Spacer(Modifier.width(8.dp))
                Text("My Recent Audits")
            }

            if (summary != null) {
                Spacer(Modifier.height(16.dp))
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Today's Movements", fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(8.dp))
                        Row {
                            Icon(Icons.Default.ArrowDownward, null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.width(8.dp))
                            Text("Inbound: ${summary!!.todayInbound} units")
                        }
                        Spacer(Modifier.height(4.dp))
                        Row {
                            Icon(Icons.Default.ArrowUpward, null, tint = MaterialTheme.colorScheme.error)
                            Spacer(Modifier.width(8.dp))
                            Text("Outbound: ${summary!!.todayOutbound} units")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    icon: ImageVector,
) {
    Card(modifier = modifier) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Text(label, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
    }
}