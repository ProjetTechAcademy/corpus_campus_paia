import { Suspense } from "react";
import MindMapStandalone from "@/components/MindMapStandalone";

export default function MindMapPage() {
  return (
    <Suspense fallback={<main className="standaloneMindMapPage"><p className="notice">🧠 Préparation de la carte mentale…</p></main>}>
      <MindMapStandalone />
    </Suspense>
  );
}
