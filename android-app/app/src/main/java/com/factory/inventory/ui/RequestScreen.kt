package com.factory.inventory.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.factory.inventory.data.AuditRequest
import com.factory.inventory.data.Item
import com.factory.inventory.data.Personnel
import com.factory.inventory.network.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import javax.inject.Inject

enum class AuditType(val api: String, val title: String) {
    Inbound("inbound", "Inbound (Receive)"),
    Outbound("outbound", "Outbound (Issue)");
}

@HiltViewModel
class RequestViewModel @Inject constructor(
    private val api: ApiService,
) : ViewModel() {

    private val _item = MutableStateFlow<Item?>(null)
    val item: StateFlow<Item?> = _item.asStateFlow()

    private val _personnel = MutableStateFlow<List<Personnel>>(emptyList())
    val personnel: StateFlow<List<Personnel>> = _personnel.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _result = MutableStateFlow<String?>(null)
    val result: StateFlow<String?> = _result.asStateFlow()

    fun lookupCode(code: String) {
        if (code.isBlank()) return
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                _item.value = api.lookupItem(code.trim())
            } catch (e: HttpException) {
                if (e.code() == 404) _error.value = "Item not found for code: $code"
                else _error.value = "Lookup failed (${e.code()})"
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Network error"
            } finally {
                _loading.value = false
            }
        }
    }

    fun loadPersonnel() {
        viewModelScope.launch {
            try {
                _personnel.value = api.listPersonnel().personnel.filter { it.active }
            } catch (_: Exception) {
                // ignore
            }
        }
    }

    fun submit(
        type: AuditType,
        quantity: Int,
        personnelId: Int?,
        note: String?,
    ) {
        val it = _item.value ?: run {
            _error.value = "No item selected"
            return
        }
        if (quantity <= 0) {
            _error.value = "Quantity must be positive"
            return
        }
        if (type == AuditType.Outbound && quantity > it.stock) {
            _error.value = "Insufficient stock (have ${it.stock})"
            return
        }
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            _result.value = null
            try {
                val res = api.createAudit(
                    AuditRequest(
                        type = type.api,
                        itemId = it.id,
                        quantity = quantity,
                        personnelId = personnelId,
                        note = note?.takeIf { n -> n.isNotBlank() },
                    )
                )
                _result.value = if (res.autoApproved) {
                    "Auto-approved and applied"
                } else {
                    "Submitted, awaiting admin review"
                }
            } catch (e: HttpException) {
                val body = e.response()?.errorBody()?.string()
                _error.value = when (e.code()) {
                    409 -> body ?: "Conflict (insufficient stock?)"
                    404 -> "Item not found"
                    else -> "Failed (${e.code()}): ${body ?: e.message()}"
                }
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Network error"
            } finally {
                _loading.value = false
            }
        }
    }

    fun reset() {
        _item.value = null
        _error.value = null
        _result.value = null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestScreen(
    initialCode: String?,
    onBack: () -> Unit,
    onDone: () -> Unit,
    viewModel: RequestViewModel = hiltViewModel(),
) {
    val item by viewModel.item.collectAsState()
    val personnel by viewModel.personnel.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()
    val result by viewModel.result.collectAsState()

    var type by remember { mutableStateOf(AuditType.Inbound) }
    var quantity by rememberSaveable { mutableStateOf("") }
    var selectedPersonnelId by rememberSaveable { mutableStateOf<Int?>(null) }
    var note by rememberSaveable { mutableStateOf("") }
    var manualCode by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(initialCode) {
        if (!initialCode.isNullOrBlank()) {
            viewModel.lookupCode(initialCode)
        }
        viewModel.loadPersonnel()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (type == AuditType.Inbound) "New Inbound" else "New Outbound") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
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
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Type selector
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                FilterChip(
                    selected = type == AuditType.Inbound,
                    onClick = { type = AuditType.Inbound },
                    label = { Text("Inbound") },
                    leadingIcon = { Icon(Icons.Default.ArrowDownward, null) },
                    modifier = Modifier.weight(1f),
                )
                FilterChip(
                    selected = type == AuditType.Outbound,
                    onClick = { type = AuditType.Outbound },
                    label = { Text("Outbound") },
                    leadingIcon = { Icon(Icons.Default.ArrowUpward, null) },
                    modifier = Modifier.weight(1f),
                )
            }

            // Item lookup
            if (item == null) {
                OutlinedTextField(
                    value = manualCode,
                    onValueChange = { manualCode = it },
                    label = { Text("SKU or Barcode") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(
                    onClick = { viewModel.lookupCode(manualCode) },
                    enabled = !loading && manualCode.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (loading) "Looking up…" else "Look up")
                }
            } else {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(item!!.name, fontWeight = FontWeight.SemiBold)
                        Text(
                            "${item!!.sku} • Stock: ${item!!.stock}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        if (item!!.categoryName != null) {
                            Text(
                                "${item!!.categoryName} @ ${item!!.warehouseName ?: "—"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = { viewModel.reset() }) {
                            Text("Change item")
                        }
                    }
                }
            }

            if (item != null) {
                OutlinedTextField(
                    value = quantity,
                    onValueChange = { quantity = it.filter { c -> c.isDigit() } },
                    label = { Text("Quantity") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )

                // Personnel dropdown
                var personnelExpanded by remember { mutableStateOf(false) }
                val selectedPersonnel = personnel.firstOrNull { it.id == selectedPersonnelId }
                ExposedDropdownMenuBox(
                    expanded = personnelExpanded,
                    onExpandedChange = { personnelExpanded = it },
                ) {
                    OutlinedTextField(
                        value = selectedPersonnel?.let { "${it.name} (${it.title})" } ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Personnel (optional)") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = personnelExpanded) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth(),
                    )
                    ExposedDropdownMenu(
                        expanded = personnelExpanded,
                        onDismissRequest = { personnelExpanded = false },
                    ) {
                        DropdownMenuItem(
                            text = { Text("— None —") },
                            onClick = {
                                selectedPersonnelId = null
                                personnelExpanded = false
                            },
                        )
                        personnel.forEach { p ->
                            DropdownMenuItem(
                                text = { Text("${p.name} (${p.title})") },
                                onClick = {
                                    selectedPersonnelId = p.id
                                    personnelExpanded = false
                                },
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Note (optional)") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 80.dp),
                    maxLines = 3,
                )

                if (error != null) {
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            error!!,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                }

                if (result != null) {
                    Surface(
                        color = Color(0xFFDCFCE7),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(
                                "✓ $result",
                                color = Color(0xFF166534),
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(4.dp))
                            TextButton(onClick = {
                                viewModel.reset()
                                quantity = ""
                                note = ""
                                manualCode = ""
                            }) {
                                Text("Submit another")
                            }
                            TextButton(onClick = onDone) {
                                Text("Back to dashboard")
                            }
                        }
                    }
                } else {
                    Button(
                        onClick = {
                            viewModel.submit(
                                type = type,
                                quantity = quantity.toIntOrNull() ?: 0,
                                personnelId = selectedPersonnelId,
                                note = note,
                            )
                        },
                        enabled = !loading && quantity.isNotBlank(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                    ) {
                        Text(if (loading) "Submitting…" else "Submit")
                    }
                }
            }
        }
    }
}