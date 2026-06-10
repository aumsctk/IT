// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { listEmployees, type EmployeeFilters } from "@/lib/queries/employees";

export function useEmployees(opts: EmployeeFilters & { unassigned_only?: boolean } = {}) {
  const { unassigned_only, ...filters } = opts;
  const supabase = getSupabaseBrowser();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const res = await listEmployees(supabase, { ...filters, unassigned_only });
    setEmployees(res.data);
    setIsLoading(false);
  }, [JSON.stringify(filters), unassigned_only]); // eslint-disable-line

  useEffect(() => { fetch(); }, [fetch]);

  return { employees, isLoading, refetch: fetch };
}