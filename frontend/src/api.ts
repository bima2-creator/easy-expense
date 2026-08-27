import { Platform } from "react-native";
import type { Category, Expense, Project, ScanResult, Summary, WorkOrder } from "./types";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = text;
    try { msg = JSON.parse(text).detail || text; } catch {}
    throw new Error(msg || `Gagal (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const post = (path: string, body: any) =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const put = (path: string, body: any) =>
  fetch(`${BASE}${path}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const del = (path: string) => fetch(`${BASE}${path}`, { method: "DELETE" });

export const fileUrl = (path?: string | null) => (path ? `${BASE}/files/${path}` : undefined);
export const projectPdfUrl = (id: string) => `${BASE}/projects/${id}/pdf`;
export const workOrderPdfUrl = (id: string) => `${BASE}/work-orders/${id}/pdf`;
export const csvUrl = () => `${BASE}/reports/export`;

export const api = {
  base: BASE,

  // categories
  async categories(): Promise<Category[]> { return j(await fetch(`${BASE}/categories`)); },
  async createCategory(name: string): Promise<Category> { return j(await post("/categories", { name })); },
  async updateCategory(id: string, name: string): Promise<Category> { return j(await put(`/categories/${id}`, { name })); },
  async deleteCategory(id: string): Promise<void> { await del(`/categories/${id}`); },

  // projects
  async projects(): Promise<Project[]> { return j(await fetch(`${BASE}/projects`)); },
  async getProject(id: string): Promise<Project> { return j(await fetch(`${BASE}/projects/${id}`)); },
  async createProject(name: string, client?: string): Promise<Project> { return j(await post("/projects", { name, client })); },
  async updateProject(id: string, body: Partial<Project>): Promise<Project> { return j(await put(`/projects/${id}`, body)); },
  async deleteProject(id: string): Promise<void> { await del(`/projects/${id}`); },

  // work orders
  async workOrders(projectId?: string): Promise<WorkOrder[]> {
    const q = projectId ? `?project_id=${projectId}` : "";
    return j(await fetch(`${BASE}/work-orders${q}`));
  },
  async getWorkOrder(id: string): Promise<WorkOrder> { return j(await fetch(`${BASE}/work-orders/${id}`)); },
  async createWorkOrder(project_id: string, name: string): Promise<WorkOrder> { return j(await post("/work-orders", { project_id, name })); },
  async updateWorkOrder(id: string, name: string): Promise<WorkOrder> { return j(await put(`/work-orders/${id}`, { name })); },
  async deleteWorkOrder(id: string): Promise<void> { await del(`/work-orders/${id}`); },

  // expenses
  async listExpenses(params: { category?: string; search?: string; project_id?: string; work_order_id?: string } = {}): Promise<Expense[]> {
    const q = new URLSearchParams();
    if (params.category && params.category !== "Semua") q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    if (params.project_id) q.set("project_id", params.project_id);
    if (params.work_order_id) q.set("work_order_id", params.work_order_id);
    const qs = q.toString();
    return j(await fetch(`${BASE}/expenses${qs ? `?${qs}` : ""}`));
  },
  async getExpense(id: string): Promise<Expense> { return j(await fetch(`${BASE}/expenses/${id}`)); },
  async createExpense(body: Partial<Expense>): Promise<Expense> { return j(await post("/expenses", body)); },
  async updateExpense(id: string, body: Partial<Expense>): Promise<Expense> { return j(await put(`/expenses/${id}`, body)); },
  async deleteExpense(id: string): Promise<void> { await del(`/expenses/${id}`); },

  // reports
  async summary(period: string): Promise<Summary> { return j(await fetch(`${BASE}/reports/summary?period=${period}`)); },

  // scan
  async scan(uri: string, name = "receipt.jpg", mime = "image/jpeg"): Promise<ScanResult> {
    const form = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(uri)).blob();
      form.append("file", blob, name);
    } else {
      form.append("file", { uri, name, type: mime } as any);
    }
    return j(await fetch(`${BASE}/scan`, { method: "POST", body: form }));
  },
};
