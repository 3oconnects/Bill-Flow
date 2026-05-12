import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { ROLE_DEFAULT_PAGE, ROLE_PAGE_ACCESS } from '@/lib/utils'
import AppLayout from '@/layouts/AppLayout'
import AuthPage from '@/features/auth/AuthPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import CustomersPage from '@/features/customers/CustomersPage'
import CustomerDetail from '@/features/customers/CustomerDetail'
import VendorsPage from '@/features/vendors/VendorsPage'
import VendorProfile from '@/features/vendors/VendorProfile'
import ProductsPage from '@/features/products/ProductsPage'
import ProductDetail from '@/features/products/ProductDetail'
import InvoicesPage from '@/features/invoices/InvoicesPage'
import InvoiceDetail from '@/features/invoices/InvoiceDetail'
import PaymentsPage from '@/features/payments/PaymentsPage'
import ExpensesPage from '@/features/expenses/ExpensesPage'
import ReportsPage from '@/features/reports/ReportsPage'
import RolesPage from '@/features/roles/RolesPage'
import WarrantyPage from '@/features/warranty/WarrantyPage'
import SettingsPage from '@/features/settings/SettingsPage'
import BankingPage from '@/features/banking/BankingPage'
import MarketplacePage from '@/features/marketplace/MarketplacePage'
import PurchaseMgmtPage from '@/features/purchases/PurchaseMgmtPage'
import GoodsMgmtPage from '@/features/goods/GoodsMgmtPage'
import APHandlePage from '@/features/ap/APHandlePage'
import RecurringTxnPage from '@/features/recurring/RecurringTxnPage'
import ToastContainer from '@/components/ToastContainer'
import { PageLoading } from '@/components/ui'

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
    <>
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
          <Route path="/ap" element={<RequireAuth page="ap_handle"><APHandlePage /></RequireAuth>} />
          <Route path="/recurring" element={<RequireAuth page="recurring_txn"><RecurringTxnPage /></RequireAuth>} />
          <Route path="/marketplace" element={<RequireAuth page="marketplace"><MarketplacePage /></RequireAuth>} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </>
  )
}
