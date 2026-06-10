"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { assetDB, type Asset } from "@/lib/supabaseDB";
import { AssetDetailPageClient } from "@/components/assets/AssetDetailPageClient";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null | "loading">("loading");
  const [rev, setRev] = useState(0); // bump to force remount of client

  const load = useCallback(() => {
    assetDB.getById(id).then(found => {
      setAsset(prev => {
        if (prev && prev !== "loading" && found && prev.status !== found.status) {
          setRev(r => r + 1);
        }
        return found ?? null;
      });
    });
  }, [id]);

  useEffect(() => {
    load();
    // Listen for any asset update from ticket transitions / floor plan / etc.
    window.addEventListener("itam_assets_updated", load);
    // Also reload when page becomes visible again (back button / tab switch)
    window.addEventListener("pageshow", load);
    window.addEventListener("visibilitychange", load);
    return () => {
      window.removeEventListener("itam_assets_updated", load);
      window.removeEventListener("pageshow", load);
      window.removeEventListener("visibilitychange", load);
    };
  }, [load]);

  if (asset === "loading") return null;
  if (!asset) return (
    <div className="p-8 text-center text-muted-foreground">
      ไม่พบสินทรัพย์ / Asset not found
    </div>
  );

  return <AssetDetailPageClient key={`${asset.id}-${rev}`} asset={asset} />;
}
