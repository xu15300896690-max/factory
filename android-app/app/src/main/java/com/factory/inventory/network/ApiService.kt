package com.factory.inventory.network

import com.factory.inventory.data.*
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("auth/logout")
    suspend fun logout(): Map<String, Boolean>

    @GET("auth/me")
    suspend fun me(): User

    @GET("items")
    suspend fun listItems(
        @Query("q") q: String? = null,
        @Query("categoryId") categoryId: Int? = null,
        @Query("warehouseId") warehouseId: Int? = null,
        @Query("lowStock") lowStock: Int? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 50,
    ): ItemsListResponse

    @GET("items/lookup")
    suspend fun lookupItem(@Query("code") code: String): Item

    @GET("audits")
    suspend fun listAudits(
        @Query("status") status: String? = null,
        @Query("type") type: String? = null,
        @Query("operatorId") operatorId: Int? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 50,
    ): AuditsListResponse

    @POST("audits")
    suspend fun createAudit(@Body body: AuditRequest): AuditResponse

    @GET("personnel")
    suspend fun listPersonnel(): PersonnelListResponse

    @GET("dashboard/summary")
    suspend fun dashboard(): DashboardSummary
}