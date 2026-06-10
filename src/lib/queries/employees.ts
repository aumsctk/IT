// @ts-nocheck
/**
 * Employee / Profile Queries
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "@/types/database";

type DB = SupabaseClient<Database>;

export interface EmployeeFilters {
  branch_id?:  string;
  role?:       UserRole[];
  department?: string;
  is_active?:  boolean;
  search?:     string;
  unassigned_only?: boolean; // only employees without a seat
  page?:       number;
  per_page?:   number;
}

// ── List ──────────────────────────────────────────────────────────
export async function listEmployees(db: DB, filters: EmployeeFilters = {}) {
  const {
    branch_id, role, department, is_active = true,
    search, unassigned_only,
    page = 1, per_page = 50,
  } = filters;

  // Use the strict view when we only want unassigned employees
  const table = unassigned_only ? "available_employees" : "profiles";

  let q = db
    .from(table as "profiles")
    .select(`
      *,
      branches ( name, code ),
      seats    ( id, label, rooms ( name ) )
    `, { count: "exact" });

  if (branch_id)         q = q.eq("branch_id", branch_id);
  if (role?.length)      q = q.in("role", role);
  if (department)        q = q.eq("department", department);
  if (is_active != null) q = q.eq("is_active", is_active);

  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(
      `full_name.ilike.${s},email.ilike.${s},employee_code.ilike.${s},department.ilike.${s}`
    );
  }

  const from = (page - 1) * per_page;
  q = q.range(from, from + per_page - 1).order("full_name");

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, per_page };
}

// ── Single profile with assigned seat + assets ───────────────────
export async function getEmployee(db: DB, id: string) {
  const { data, error } = await db
    .from("profiles")
    .select(`
      *,
      branches ( * ),
      seats    (
        *,
        rooms ( *, zones ( *, branches ( * ) ) ),
        assets (
          id, asset_tag, status, condition,
          asset_models ( brand, model_name, category, image_url )
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ── Update profile ────────────────────────────────────────────────
export async function updateEmployee(
  db: DB,
  id: string,
  input: {
    full_name?:    string;
    phone?:        string;
    department?:   string;
    job_title?:    string;
    branch_id?:    string;
    employee_code?:string;
    avatar_url?:   string;
    role?:         UserRole;
    is_active?:    boolean;
  }
) {
  const { data, error } = await db
    .from("profiles")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Distinct departments (for filter dropdowns) ───────────────────
export async function listDepartments(db: DB, branchId?: string) {
  let q = db
    .from("profiles")
    .select("department")
    .not("department", "is", null)
    .eq("is_active", true);

  if (branchId) q = q.eq("branch_id", branchId);

  const { data, error } = await q;
  if (error) throw error;

  const unique = [...new Set((data ?? []).map((r) => r.department as string))].sort();
  return unique;
}