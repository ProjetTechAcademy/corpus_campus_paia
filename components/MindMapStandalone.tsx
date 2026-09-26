"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MindMapPanel, { type MindMapData } from "./MindMapPanel";

export default function MindMapStandalone() {
  const params = useSearchParams();
  const resourceCode = params.get("resourceCode") || "";
  const locale = params.get("locale") === "en" ? "en" : "fr";
  const [data, setData] = useState<MindMapData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resourceCode) {
      setError(locale === "fr" ? "Ressource manquante." : "Missing resource.");
      return;
    }

    let cancelled = false;
    fetch("/api/mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceCode, locale }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Erreur");
        if (!cancelled) setData(payload);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Erreur");
      });

    return () => { cancelled = true; };
  }, [resourceCode, locale]);

  if (error) return <main className="standaloneMindMapPage"><p className="notice error">{error}</p></main>;
  if (!data) return <main className="standaloneMindMapPage"><p className="notice">{locale === "fr" ? "🧠 Préparation de la carte mentale…" : "🧠 Preparing mind map…"}</p></main>;

  return <MindMapPanel data={data} onClose={() => window.close()} standalone />;
}
