/**
 * Common TypeScript Types & Interfaces
 * Shared across frontend components and API
 */

// ============================================
// AUTHENTICATION
// ============================================

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'staff' | 'member';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  currency: CurrencyCode;
  invPrefix: string;
  nextInvNo: number;
  defaultNotes?: string;
  defaultTerms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

// ============================================
// COMMON TYPES
// ============================================

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';
export type TaxRate = '0' | '5' | '12' | '18' | '28';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'upi' | 'neft' | 'rtgs' | 'imps' | 'cash' | 'card' | 'cheque' | 'wallet';
export type ExpenseCategory =
  | 'office-rent'
  | 'utilities'
  | 'office-supplies'
  | 'travel'
  | 'meals'
  | 'vehicle'
  | 'maintenance'
  | 'insurance'
  | 'marketing'
  | 'software'
  | 'professional-fees'
  | 'depreciation'
  | 'interest'
  | 'other';

export type UserRole = 'owner' | 'admin' | 'staff' | 'member';

// ============================================
// CUSTOMERS & VENDORS
// ============================================

export interface Customer {
  id: string;
  orgId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  currency: CurrencyCode;
  creditLimit?: number;
  outstanding: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Vendor {
  id: string;
  orgId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  bankAccount?: string;
  ifsc?: string;
  currency: CurrencyCode;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// INVOICES
// ============================================

export interface InvoiceItem {
  id?: string;
  description: string;
  hsnCode?: string;
  productId?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  taxRate: TaxRate;
  taxAmount?: number;
  amount?: number;
  sortOrder?: number;
}

export interface Invoice {
  id: string;
  orgId: string;
  number: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  date: string;
  dueDate?: string;
  currency: CurrencyCode;
  placeOfSupply?: string;
  status: InvoiceStatus;
  shipmentStatus?: string;
  items?: InvoiceItem[];
  subtotal: number;
  discountPct: number;
  discountAmount?: number;
  tax: number;
  total: number;
  notes?: string;
  terms?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  orgId: string;
  invoiceId: string;
  amount: number;
  date: string;
  currency: CurrencyCode;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

// ============================================
// EXPENSES
// ============================================

export interface Expense {
  id: string;
  orgId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  vendorId?: string;
  gstRate: TaxRate;
  reference?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// PRODUCTS & INVENTORY
// ============================================

export interface Product {
  id: string;
  orgId: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  unit: string;
  taxRate: TaxRate;
  costPrice?: number;
  sellingPrice?: number;
  stock?: {
    onHand: number;
    reserved: number;
    available: number;
  };
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// ACCOUNTS PAYABLE (AP)
// ============================================

export interface APInvoice {
  id: string;
  orgId: string;
  number: string;
  vendorId: string;
  vendorName: string;
  date: string;
  dueDate?: string;
  currency: CurrencyCode;
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled';
  items?: APInvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface APInvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: TaxRate;
  amount?: number;
}

export interface APCreditMemo {
  id: string;
  orgId: string;
  number: string;
  vendorId: string;
  originalInvoiceId: string;
  reason: string;
  amount: number;
  status: 'draft' | 'approved' | 'applied';
  createdBy: string;
  createdAt: string;
}

// ============================================
// REPORTS
// ============================================

export interface ReportMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  outstandingInvoices: number;
  overduePaid: number;
  totalCustomers: number;
  totalInvoices: number;
  averageInvoiceValue: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  expenses: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ============================================
// FORM STATES
// ============================================

export interface FormError {
  field: string;
  message: string;
}

export interface FormState {
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  errors: FormError[];
  touched: Set<string>;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ============================================
// MODAL DIALOGS
// ============================================

export interface DialogState {
  isOpen: boolean;
  title?: string;
  content?: string;
  actions?: DialogAction[];
}

export interface DialogAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}

// ============================================
// AUDIT LOGS
// ============================================

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}
