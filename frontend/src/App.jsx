import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { useSystemTheme } from '@/store/themeStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ROLE_DEFAULT_PAGE, ROLE_PAGE_ACCESS } from '@/lib/utils'
import AppLayout from '@/layouts/AppLayout'
import ToastContainer from '@/components/ToastContainer'
import { PageLoading } from '@/components/ui'

// Lazy-loaded pages — each loads only when first visited
const AuthPage               = lazy(() => import('@/features/auth/AuthPage'))
const DashboardPage          = lazy(() => import('@/features/dashboard/DashboardPage'))
const CustomersPage          = lazy(() => import('@/features/customers/CustomersPage'))
const CustomerDetail         = lazy(() => import('@/features/customers/CustomerDetail'))
const VendorsPage            = lazy(() => import('@/features/vendors/VendorsPage'))
const VendorProfile          = lazy(() => import('@/features/vendors/VendorProfile'))
const ProductsPage           = lazy(() => import('@/features/products/ProductsPage'))
const ProductDetail          = lazy(() => import('@/features/products/ProductDetail'))
const InvoicesPage           = lazy(() => import('@/features/invoices/InvoicesPage'))
const InvoiceDetail          = lazy(() => import('@/features/invoices/InvoiceDetail'))
const PaymentsPage           = lazy(() => import('@/features/payments/PaymentsPage'))
const ExpensesPage           = lazy(() => import('@/features/expenses/ExpensesPage'))
const BudgetPage             = lazy(() => import('@/features/expenses/BudgetPage'))
const TDSPage                = lazy(() => import('@/features/expenses/TDSPage'))
const CashLedgerPage         = lazy(() => import('@/features/banking/CashLedgerPage'))
const ReportsPage            = lazy(() => import('@/features/reports/ReportsPage'))
const RolesPage              = lazy(() => import('@/features/roles/RolesPage'))
const WarrantyPage           = lazy(() => import('@/features/warranty/WarrantyPage'))
const SettingsPage           = lazy(() => import('@/features/settings/SettingsPage'))
const BankingPage            = lazy(() => import('@/features/banking/BankingPage'))
const MarketplacePage        = lazy(() => import('@/features/marketplace/MarketplacePage'))
const PurchaseMgmtPage       = lazy(() => import('@/features/purchases/PurchaseMgmtPage'))
const GoodsMgmtPage          = lazy(() => import('@/features/goods/GoodsMgmtPage'))
const GoodsReturnPage        = lazy(() => import('@/features/goods-returns/GoodsReturnPage'))
const ProcurementAnalysisPage = lazy(() => import('@/features/procurement/ProcurementAnalysisPage'))
const APPage                 = lazy(() => import('@/features/ap/APPage'))
const RecurringTxnPage       = lazy(() => import('@/features/recurring/RecurringTxnPage'))

// Fallback shown while a lazy chunk is downloading (first visit only)
function PageSuspense() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <PageLoading />
    </div>
  )
}

function RequireAuth({ children, page }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  const allowed = ROLE_PAGE_ACCESS[user.role] || ROLE_PAGE_ACCESS.member
  if (page && !allowed.includes(page)) {
    return <Navigate to={ROLE_DEFAULT_PAGE[user.role] || '/dashboard'} replace />
  }
  return children
}

function RequireGuest({ children }) {
  const { user } = useAuthStore()
  if (user) return <Navigate to={ROLE_DEFAULT_PAGE[user.role] || '/dashboard'} replace />
  return children
}

export default function App() {
  const { ready, setAuth, clearAuth, setReady } = useAuthStore()

  // Initialize theme and detect system preference
  useSystemTheme()

  useEffect(() => {
    authApi.me()
      .then((d) => setAuth(d.user, d.org))
      .catch(() => clearAuth())
      .finally(() => setReady())
  }, [])

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <PageLoading />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSuspense />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<RequireGuest><AuthPage /></RequireGuest>} />

          {/* Protected: all wrapped in AppLayout */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>

            {/* Dashboard */}
            <Route path="/dashboard" element={<RequireAuth page="dashboard"><DashboardPage /></RequireAuth>} />

            {/* Customers */}
            <Route path="/customers" element={<RequireAuth page="customers"><CustomersPage /></RequireAuth>} />
            <Route path="/customers/:id" element={<RequireAuth page="customers"><CustomerDetail /></RequireAuth>} />

            {/* Vendors */}
            <Route path="/vendors" element={<RequireAuth page="vendors"><VendorsPage /></RequireAuth>} />
            <Route path="/vendors/:id" element={<RequireAuth page="vendors"><VendorProfile /></RequireAuth>} />

            {/* Products */}
            <Route path="/products" element={<RequireAuth page="products"><ProductsPage /></RequireAuth>} />
            <Route path="/products/:id" element={<RequireAuth page="products"><ProductDetail /></RequireAuth>} />

            {/* Invoices */}
            <Route path="/invoices" element={<RequireAuth page="invoices"><InvoicesPage /></RequireAuth>} />
            <Route path="/invoices/new" element={<RequireAuth page="invoices"><InvoiceDetail /></RequireAuth>} />
            <Route path="/invoices/:id" element={<RequireAuth page="invoices"><InvoiceDetail /></RequireAuth>} />

            {/* Payments */}
            <Route path="/payments" element={<RequireAuth page="payments"><PaymentsPage /></RequireAuth>} />

            {/* Expenses */}
            <Route path="/expenses" element={<RequireAuth page="expenses"><ExpensesPage /></RequireAuth>} />
            <Route path="/budget"       element={<RequireAuth page="expenses"><BudgetPage /></RequireAuth>} />
            <Route path="/tds"          element={<RequireAuth page="expenses"><TDSPage /></RequireAuth>} />
            <Route path="/cash-ledger"  element={<RequireAuth page="reports"><CashLedgerPage /></RequireAuth>} />

            {/* Reports */}
            <Route path="/reports" element={<RequireAuth page="reports"><ReportsPage /></RequireAuth>} />

            {/* Roles */}
            <Route path="/roles" element={<RequireAuth page="settings"><RolesPage /></RequireAuth>} />

            {/* Warranty */}
            <Route path="/warranty" element={<RequireAuth page="customers"><WarrantyPage /></RequireAuth>} />

            {/* Settings */}
            <Route path="/settings" element={<RequireAuth page="settings"><SettingsPage /></RequireAuth>} />

            {/* Banking */}
            <Route path="/banking" element={<RequireAuth page="banking"><BankingPage /></RequireAuth>} />

            {/* Purchase & A/P */}
            <Route path="/purchases" element={<RequireAuth page="purchase_mgmt"><PurchaseMgmtPage /></RequireAuth>} />
            <Route path="/goods" element={<RequireAuth page="goods_mgmt"><GoodsMgmtPage /></RequireAuth>} />
            <Route path="/ap" element={<RequireAuth page="ap_handle"><APPage /></RequireAuth>} />
            <Route path="/recurring" element={<RequireAuth page="recurring_txn"><RecurringTxnPage /></RequireAuth>} />
            <Route path="/marketplace" element={<RequireAuth page="marketplace"><MarketplacePage /></RequireAuth>} />

            {/* Goods Returns */}
            <Route path="/goods-returns" element={<RequireAuth page="goods_returns"><GoodsReturnPage /></RequireAuth>} />
            {/* Procurement Analysis */}
            <Route path="/procurement-analysis" element={<RequireAuth page="procurement_analysis"><ProcurementAnalysisPage /></RequireAuth>} />
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </ErrorBoundary>
  )
}
