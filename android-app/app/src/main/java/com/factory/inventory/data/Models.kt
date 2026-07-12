package com.factory.inventory.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val username: String,
    val password: String,
)

@Serializable
data class LoginResponse(
    val user: User,
)

@Serializable
data class User(
    val id: Int,
    val username: String,
    @SerialName("display_name") val displayName: String,
    val role: String,
    val active: Boolean,
)

@Serializable
data class Item(
    val id: Int,
    val sku: String,
    val barcode: String? = null,
    val name: String,
    @SerialName("category_id") val categoryId: Int? = null,
    @SerialName("warehouse_id") val warehouseId: Int? = null,
    @SerialName("category_name") val categoryName: String? = null,
    @SerialName("warehouse_name") val warehouseName: String? = null,
    val location: String = "",
    val stock: Int,
    @SerialName("min_stock") val minStock: Int,
    val supplier: String = "",
    @SerialName("unit_price") val unitPrice: Double,
    @SerialName("last_updated") val lastUpdated: String,
)

@Serializable
data class Audit(
    val id: Int,
    val type: String,
    @SerialName("item_id") val itemId: Int,
    @SerialName("item_name") val itemName: String? = null,
    @SerialName("item_sku") val itemSku: String? = null,
    val quantity: Int,
    val status: String,
    @SerialName("operator_name") val operatorName: String? = null,
    @SerialName("reviewer_name") val reviewerName: String? = null,
    @SerialName("personnel_name") val personnelName: String? = null,
    val source: String,
    val note: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("reviewed_at") val reviewedAt: String? = null,
)

@Serializable
data class AuditRequest(
    val type: String,
    @SerialName("item_id") val itemId: Int,
    val quantity: Int,
    @SerialName("personnel_id") val personnelId: Int? = null,
    val note: String? = null,
    val source: String = "android",
)

@Serializable
data class AuditResponse(
    val id: Int,
    val status: String,
    @SerialName("autoApproved") val autoApproved: Boolean,
)

@Serializable
data class Personnel(
    val id: Int,
    val name: String,
    val title: String,
    val active: Boolean,
)

@Serializable
data class ApiError(
    val error: ApiErrorBody,
)

@Serializable
data class ApiErrorBody(
    val code: String,
    val message: String,
)

@Serializable
data class ItemsListResponse(
    val items: List<Item>,
    val total: Int,
)

@Serializable
data class AuditsListResponse(
    val audits: List<Audit>,
    val total: Int,
)

@Serializable
data class PersonnelListResponse(
    val personnel: List<Personnel>,
)

@Serializable
data class DashboardSummary(
    @SerialName("totalItems") val totalItems: Int,
    @SerialName("totalStockValue") val totalStockValue: Double,
    @SerialName("lowStockCount") val lowStockCount: Int,
    @SerialName("pendingAudits") val pendingAudits: Int,
    @SerialName("todayInbound") val todayInbound: Int,
    @SerialName("todayOutbound") val todayOutbound: Int,
)