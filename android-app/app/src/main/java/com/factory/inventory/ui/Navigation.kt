package com.factory.inventory.ui

import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val SCAN = "scan"
    const val REQUEST = "request?code={code}"
    const val MY_AUDITS = "audits"

    fun request(code: String? = null) = "request?code=${code ?: ""}"
}

@Composable
fun AppNavigation(authViewModel: AuthViewModel) {
    val nav = rememberNavController()
    val user by authViewModel.user.collectAsStateWithLifecycle()

    NavHost(
        navController = nav,
        startDestination = if (user == null) Routes.LOGIN else Routes.DASHBOARD,
    ) {
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    nav.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.DASHBOARD) {
            DashboardScreen(
                onScanClick = { nav.navigate(Routes.SCAN) },
                onMyAuditsClick = { nav.navigate(Routes.MY_AUDITS) },
                onLogout = {
                    authViewModel.logout {
                        nav.navigate(Routes.LOGIN) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                },
            )
        }
        composable(Routes.SCAN) {
            ScanScreen(
                onCodeScanned = { code ->
                    nav.navigate(Routes.request(code)) {
                        popUpTo(Routes.SCAN) { inclusive = true }
                    }
                },
                onBack = { nav.popBackStack() },
            )
        }
        composable(Routes.REQUEST) { entry ->
            val code = entry.arguments?.getString("code")?.takeIf { it.isNotBlank() }
            RequestScreen(
                initialCode = code,
                onBack = { nav.popBackStack() },
                onDone = {
                    nav.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.DASHBOARD) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.MY_AUDITS) {
            MyAuditsScreen(onBack = { nav.popBackStack() })
        }
    }
}