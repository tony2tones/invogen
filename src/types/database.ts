export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type InvoiceType = 'invoice' | 'quote';
export type QuickbooksSyncStatus = 'not_synced' | 'pending' | 'synced' | 'error';

export interface BusinessProfile {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string;
  vat_number: string | null;
  currency: string;
  invoice_prefix: string;
  next_invoice_number: number;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  branch_code: string | null;
  account_type: string | null;
  swift_code: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  vat_number: string | null;
  notes: string | null;
  quickbooks_customer_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit: string;
  vat_rate: number;
  sku: string | null;
  quickbooks_item_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  client_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  type: InvoiceType;
  subtotal: number;
  vat_amount: number;
  total: number;
  vat_rate: number;
  notes: string | null;
  terms: string | null;
  due_date: string | null;
  issue_date: string;
  quickbooks_invoice_id: string | null;
  quickbooks_sync_status: QuickbooksSyncStatus;
  is_offline: boolean;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Expense {
  id: string;
  business_id: string;
  category: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  vat_amount: number;
  payment_method: string | null;
  receipt_path: string | null;
  expense_date: string;
  created_at: string;
}

export interface CreditWallet {
  id: string;
  user_id: string;
  balance: number;
  total_used: number;
}

export interface Integration {
  id: string;
  business_id: string;
  provider: string;
  realm_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface InvoiceWithRelations extends Invoice {
  client: Client | null;
  items: InvoiceItem[];
  business: BusinessProfile;
}
