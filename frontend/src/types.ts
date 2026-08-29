export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  order: number;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  client?: string;
  color?: string;
  parent_id?: string | null;
  created_at: string;
  work_order_count?: number;
  sub_project_count?: number;
  total?: number;
  expense_count?: number;
};

export type WorkOrder = {
  id: string;
  project_id: string;
  name: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  total?: number;
  expense_count?: number;
};

export type Expense = {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  project_id?: string | null;
  work_order_id?: string | null;
  notes?: string;
  receipt_path?: string | null;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
};

export type Extracted = {
  vendor: string;
  amount: number;
  date: string;
  category: string;
  notes: string;
};

export type ScanResult = {
  receipt_path: string;
  extracted: Extracted;
  extraction_failed: boolean;
};

export type Summary = {
  period: string;
  total: number;
  count: number;
  by_category: { category: string; amount: number }[];
  by_project: { name: string; amount: number }[];
  trend: { label: string; amount: number }[];
};
