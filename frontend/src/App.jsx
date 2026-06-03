import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { useSystemTheme } from '@/store/themeStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ROLE_DEFAULT_PAGE, ROLE_PAGE_ACCESS } from '@/lib/utils'
import AppLayout from '@/layouts/AppLayout'
import ToastContainer from '@/components/ToastContainer'
import { PageLoading } from '@/components/ui'

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each page chunk loads only on first visit — no upfront bundle cost.

// Core
const AuthPage          = lazy(() => import('@/features/auth/AuthPage'))
const DashboardPage     = lazy(() => import('@/features/dashboard/DashboardPage'))

// Sales
const CustomersPage     = lazy(() => import('@/features/customers/CustomersPage'))
const CustomerDetail    = lazy(() => import('@/features/customers/CustomerDetail'))
const QuotationsPage    = lazy(() => import('@/features/sales/QuotationsPage'))
const InvoicesPage      = lazy(() => import('@/features/invoices/InvoicesPage'))
const InvoiceDetail     = lazy(() => import('@/features/invoices/InvoiceDetail'))
const PaymentsPage      = lazy(() => import('@/features/payments/PaymentsPage'))
const CreditNotesPage   = lazy(() => import('@/features/sales/CreditNotesPage'))
const RecurringTxnPage  = lazy(() => import('@/features/recurring/RecurringTxnPage'))
const WarrantyPage      = lazy(() => import('@/features/warranty/WarrantyPage'))

// Purchasing
const VendorsPage           = lazy(() => import('@/features/vendors/VendorsPage'))
const VendorProfile         = lazy(() => import('@/features/vendors/VendorProfile'))
const PurchaseMgmtPage      = lazy(() => import('@/features/purchases/PurchaseMgmtPage'))
const GoodsMgmtPage         = lazy(() => import('@/features/goods/GoodsMgmtPage'))
const GoodsReturnPage       = lazy(() => import('@/features/goods-returns/GoodsReturnPage'))
const APPage                = lazy(() => import('@/features/ap/APPage'))
const VendorPaymentsPage    = lazy(() => import('@/features/purchasing/VendorPaymentsPage'))
const ProcurementAnalysisPage = lazy(() => import('@/features/procurement/ProcurementAnalysisPage'))

// Inventory
const ProductsPage          = lazy(() => import('@/features/products/ProductsPage'))
const ProductDetail         = lazy(() => import('@/features/products/ProductDetail'))
const StockOverviewPage     = lazy(() => import('@/features/inventory/StockOverviewPage'))
const StockMovementsPage    = lazy(() => import('@/features/inventory/StockMovementsPage'))
const StockValuationPage    = lazy(() => import('@/features/inventory/StockValuationPage'))
const LowStockAlertsPage    = lazy(() => import('@/features/inventory/LowStockAlertsPage'))
const InventoryAnalyticsPage = lazy(() => import('@/features/inventory/InventoryAnalyticsPage'))

// Banking
const BankingPage           = lazy(() => import('@/features/banking/BankingPage'))
const BankAccountsPage      = lazy(() => import('@/features/banking/BankAccountsPage'))
const CashLedgerPage        = lazy(() => import('@/features/banking/CashLedgerPage'))
const CollectionsPage       = lazy(() => import('@/features/banking/CollectionsPage'))
const BankingVendorPaymentsPage = lazy(() => import('@/features/banking/BankingVendorPaymentsPage'))
const ReconciliationPage    = lazy(() => import('@/features/banking/ReconciliationPage'))
const CashForecastPage      = lazy(() => import('@/features/banking/CashForecastPage'))
const BankingInsightsPage   = lazy(() => import('@/features/banking/BankingInsightsPage'))

// Finance
const ExpensesPage          = lazy(() => import('@/features/expenses/ExpensesPage'))
const GSTCenterPage         = lazy(() => import('@/features/finance/GSTCenterPage'))
const ReportsPage           = lazy(() => import('@/features/reports/ReportsPage'))
const BalanceSheetPage      = lazy(() => import('@/features/finance/BalanceSheetPage'))
const TDSPage               = lazy(() => import('@/features/expenses/TDSPage'))
const FinancialReportsPage  = lazy(() => import('@/features/finance/FinancialReportsPage'))
const AuditLogsPage         = lazy(() => import('@/features/finance/AuditLogsPage'))

// Administration
const SettingsPage          = lazy(() => import('@/features/settings/SettingsPage'))
const TeamPage              = lazy(() => import('@/features/admin/TeamPage'))
const RolesPage             = lazy(() => import('@/features/roles/RolesPage'))
const ApprovalsPage         = lazy(() => import('@/features/admin/ApprovalsPage'))
const IntegrationsPage      = lazy(() => import('@/features/admin/IntegrationsPage'))
const PreferencesPage       = lazy(() => import('@/features/admin/PreferencesPage'))
const BudgetPage            = lazy(() => import('@/features/expenses/BudgetPage'))
const BankingPage2          = lazy(() => import('@/features/banking/BankingPage')) // alias

// ── Guards ────────────────────────────────────────────────────────────────────
function RequireAuth({ children, page }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  const allowed = ROLE_PAGE_ACCESS[user.role] || ROLE_PAGE_ACCESS.member
  if (page && !allowed.includes(page))
    return <Navigate to={ROLE_DEFAULT_PAGE[user.role] || '/dashboard'} replace />
  return children
}

function RequireGuest({ children }) {
  const { user } = useAuthStore()
  if (user) return <Navigate to={ROLE_DEFAULT_PAGE[user.role] || '/dashboard'} replace />
  return children
}

function PageSuspense() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <PageLoading />
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { ready, setAuth, clearAuth, setReady } = useAuthStore()
  useSystemTheme()

  useEffect(() => {
    authApi.me()
      .then(d => setAuth(d.user, d.org))
      .catch(() => clearAuth())
      .finally(() => setReady())
  }, []) // eslint-disable-line

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-bg)' }}>
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

          {/* Protected — AppLayout wraps all */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>

            {/* Dashboard */}
            <Route path="/dashboard"
              element={<RequireAuth page="dashboard"><DashboardPage /></RequireAuth>} />

            {/* ── Sales ── */}
            <Route path="/customers"
              element={<RequireAuth page="customers"><CustomersPage /></RequireAuth>} />
            <Route path="/customers/:id"
              element={<RequireAuth page="customers"><CustomerDetail /></RequireAuth>} />
            <Route path="/quotations"
              element={<RequireAuth page="quotations"><QuotationsPage /></RequireAuth>} />
            <Route path="/invoices"
              element={<RequireAuth page="invoices"><InvoicesPage /></RequireAuth>} />
            <Route path="/invoices/new"
              element={<RequireAuth page="invoices"><InvoiceDetail /></RequireAuth>} />
            <Route path="/invoices/:id"
              element={<RequireAuth page="invoices"><InvoiceDetail /></RequireAuth>} />
            <Route path="/payments"
              element={<RequireAuth page="payments_received"><PaymentsPage /></RequireAuth>} />
            <Route path="/credit-notes"
              element={<RequireAuth page="credit_notes"><CreditNotesPage /></RequireAuth>} />
            <Route path="/recurring"
              element={<RequireAuth page="recurring_billing"><RecurringTxnPage /></RequireAuth>} />
            <Route path="/warranty"
              element={<RequireAuth page="warranty"><WarrantyPage /></RequireAuth>} />

            {/* ── Purchasing ── */}
            <Route path="/vendors"
              element={<RequireAuth page="vendors"><VendorsPage /></RequireAuth>} />
            <Route path="/vendors/:id"
              element={<RequireAuth page="vendors"><VendorProfile /></RequireAuth>} />
            <Route path="/purchases"
              element={<RequireAuth page="purchase_orders"><PurchaseMgmtPage /></RequireAuth>} />
            <Route path="/goods"
              element={<RequireAuth page="goods_mgmt"><GoodsMgmtPage /></RequireAuth>} />
            <Route path="/goods-returns"
              element={<RequireAuth page="goods_returns"><GoodsReturnPage /></RequireAuth>} />
            <Route path="/ap"
              element={<RequireAuth page="accounts_payable"><APPage /></RequireAuth>} />
            <Route path="/vendor-payments"
              element={<RequireAuth page="vendor_payments"><VendorPaymentsPage /></RequireAuth>} />
            <Route path="/procurement-analysis"
              element={<RequireAuth page="procurement_analytics"><ProcurementAnalysisPage /></RequireAuth>} />

            {/* ── Inventory ── */}
            <Route path="/products"
              element={<RequireAuth page="products"><ProductsPage /></RequireAuth>} />
            <Route path="/products/:id"
              element={<RequireAuth page="products"><ProductDetail /></RequireAuth>} />
            <Route path="/stock-overview"
              element={<RequireAuth page="stock_overview"><StockOverviewPage /></RequireAuth>} />
            <Route path="/stock-movements"
              element={<RequireAuth page="stock_movements"><StockMovementsPage /></RequireAuth>} />
            <Route path="/stock-valuation"
              element={<RequireAuth page="stock_valuation"><StockValuationPage /></RequireAuth>} />
            <Route path="/low-stock"
              element={<RequireAuth page="low_stock_alerts"><LowStockAlertsPage /></RequireAuth>} />
            <Route path="/inventory-analytics"
              element={<RequireAuth page="inventory_analytics"><InventoryAnalyticsPage /></RequireAuth>} />

            {/* ── Banking ── */}
            <Route path="/banking"
              element={<RequireAuth page="banking_overview"><BankingPage /></RequireAuth>} />
            <Route path="/bank-accounts"
              element={<RequireAuth page="bank_accounts"><BankAccountsPage /></RequireAuth>} />
            <Route path="/cash-ledger"
              element={<RequireAuth page="bank_transactions"><CashLedgerPage /></RequireAuth>} />
            <Route path="/collections"
              element={<RequireAuth page="collections_center"><CollectionsPage /></RequireAuth>} />
            <Route path="/banking-vendor-payments"
              element={<RequireAuth page="banking_vendor_payments"><BankingVendorPaymentsPage /></RequireAuth>} />
            <Route path="/reconciliation"
              element={<RequireAuth page="reconciliation_center"><ReconciliationPage /></RequireAuth>} />
            <Route path="/cash-forecast"
              element={<RequireAuth page="cash_flow_forecast"><CashForecastPage /></RequireAuth>} />
            <Route path="/banking-insights"
              element={<RequireAuth page="banking_insights"><BankingInsightsPage /></RequireAuth>} />

            {/* ── Finance ── */}
            <Route path="/expenses"
              element={<RequireAuth page="expenses"><ExpensesPage /></RequireAuth>} />
            <Route path="/budget"
              element={<RequireAuth page="budget_planner"><BudgetPage /></RequireAuth>} />
            <Route path="/gst"
              element={<RequireAuth page="gst_center"><GSTCenterPage /></RequireAuth>} />
            <Route path="/reports"
              element={<RequireAuth page="profit_loss"><ReportsPage /></RequireAuth>} />
            {/* balance-sheet and financial-reports both use the full ReportsPage */}
            <Route path="/balance-sheet"
              element={<RequireAuth page="profit_loss"><ReportsPage /></RequireAuth>} />
            <Route path="/financial-reports"
              element={<RequireAuth page="profit_loss"><ReportsPage /></RequireAuth>} />
            <Route path="/tds"
              element={<RequireAuth page="tax_reports"><TDSPage /></RequireAuth>} />
            <Route path="/audit-logs"
              element={<RequireAuth page="audit_logs"><AuditLogsPage /></RequireAuth>} />

            {/* ── Administration ── */}
            {/* /settings hosts org, team, profile, security, appearance tabs */}
            <Route path="/settings"
              element={<RequireAuth page="org_settings"><SettingsPage /></RequireAuth>} />
            {/* /team and /preferences redirect into settings */}
            <Route path="/team"
              element={<Navigate to="/settings" replace />} />
            <Route path="/preferences"
              element={<Navigate to="/settings" replace />} />
            <Route path="/roles"
              element={<RequireAuth page="roles"><RolesPage /></RequireAuth>} />
            <Route path="/approvals"
              element={<RequireAuth page="approval_workflows"><ApprovalsPage /></RequireAuth>} />
            <Route path="/integrations"
              element={<RequireAuth page="integrations"><IntegrationsPage /></RequireAuth>} />

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
