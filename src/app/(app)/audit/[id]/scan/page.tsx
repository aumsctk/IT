"use client";

import { useParams } from "next/navigation";
import { AuditScanMode } from "@/components/audit/AuditScanMode";

export default function AuditScanPage() {
  const { id } = useParams<{ id: string }>();
  return <AuditScanMode sessionId={id} />;
}
