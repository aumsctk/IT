"use client";

import { useParams } from "next/navigation";
import { AssetFormPageClient } from "@/components/assets/AssetFormPageClient";

export default function EditAssetPage() {
  const { id } = useParams<{ id: string }>();
  return <AssetFormPageClient assetId={id} />;
}
