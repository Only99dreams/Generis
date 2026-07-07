export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  organization_type: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  organization_id: string | null;
  user_id: string;
  available_balance: number;
  ledger_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  customer_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  risk_score: number;
  created_at: string;
  updated_at: string;
}

export interface VirtualAccount {
  id: string;
  customer_id: string | null;
  user_id: string | null;
  organization_id: string | null;
  account_ref: string | null;
  account_number: string | null;
  account_name: string | null;
  bank_name: string | null;
  bank_code: string | null;
  provider: string;
  status: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  customer_id: string;
  invoice_number: string | null;
  description: string | null;
  amount: number;
  amount_paid: number;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  customer_id: string;
  invoice_id: string | null;
  amount: number;
  reference: string | null;
  payment_channel: string | null;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  payment_id: string;
  receipt_number: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  transaction_type: string;
  amount: number;
  reference: string | null;
  status: string | null;
  category: string | null;
  narration: string | null;
  metadata: any;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  wallet_id: string | null;
  user_id: string | null;
  transaction_id: string | null;
  entry_type: string;
  amount: number;
  reference: string | null;
  created_at: string;
}

export interface Transfer {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  beneficiary_name: string | null;
  beneficiary_account: string | null;
  bank_code: string | null;
  bank_name: string | null;
  amount: number;
  reference: string | null;
  transfer_status: string | null;
  provider_reference: string | null;
  narration: string | null;
  created_at: string;
}

export interface Beneficiary {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_code: string | null;
  bank_name: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  organization_id: string | null;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Analytics {
  balance: number;
  totalCustomers: number;
  activeAccounts: number;
  totalRevenue: number;
  totalTransfers: number;
  outstanding: number;
  collectionRate: number;
  recentTransactions: Transaction[];
}

export interface SavedCard {
  id: string;
  user_id: string;
  wallet_id?: string;
  card_brand: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  card_type: string;
  provider_ref: string;
  pan?: string;
  cvv?: string;
  is_default: boolean;
  created_at: string;
}

export interface PaymentLink {
  id: string;
  reference: string;
  user_id: string | null;
  organization_id: string | null;
  virtual_account_id: string | null;
  amount: number | null;
  description: string | null;
  status: string;
  expires_at: string | null;
  times_used: number;
  created_at: string;
  updated_at: string;
  virtual_accounts: {
    account_number: string;
    account_name: string;
    bank_name: string;
  } | null;
  owner_name?: string;
  url?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  organization_id: string | null;
  saved_card_id: string;
  name: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  description: string | null;
  next_billing_date: string;
  last_billing_date: string | null;
  billing_day: number;
  status: "active" | "paused" | "cancelled" | "expired";
  total_charges: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  saved_cards?: { card_brand: string; last4: string } | null;
}

export interface SubscriptionLog {
  id: string;
  subscription_id: string;
  status: "success" | "failed";
  amount: number;
  reference: string | null;
  error_message: string | null;
  charged_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  organization_id: string | null;
  category: string;
  name: string;
  amount: number;
  spent: number;
  period: "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTransfer {
  id: string;
  user_id: string;
  organization_id: string | null;
  beneficiary_name: string;
  beneficiary_account: string;
  bank_code: string;
  bank_name: string;
  amount: number;
  narration: string | null;
  frequency: "daily" | "weekly" | "monthly" | "once";
  interval_day: number | null;
  interval_weekday: number | null;
  start_date: string;
  end_date: string | null;
  next_run: string;
  last_run: string | null;
  status: "active" | "paused" | "cancelled" | "completed";
  total_executions: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTransferLog {
  id: string;
  scheduled_transfer_id: string;
  status: "success" | "failed";
  amount: number;
  reference: string | null;
  error_message: string | null;
  executed_at: string;
}

export interface BankAccountLookup {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

export interface SubWallet {
  id: string;
  user_id: string;
  organization_id: string | null;
  name: string;
  target_amount: number | null;
  current_balance: number;
  color: string;
  icon: string;
  goal_date: string | null;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface SavingsPlan {
  id: string;
  user_id: string;
  sub_wallet_id: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly";
  next_run: string;
  last_run: string | null;
  status: "active" | "paused" | "cancelled" | "completed";
  total_saved: number;
  total_executions: number;
  created_at: string;
  updated_at: string;
  sub_wallets?: { name: string; current_balance: number } | null;
}
