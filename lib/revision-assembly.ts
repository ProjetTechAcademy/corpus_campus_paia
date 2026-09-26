type RevisionPart = { part_index: number; content: string };

type Bucket = "knowledge" | "method" | "example" | "vigilance" | "lexicon" | "takeaway";

function cleanHeading(value: string) {
  return value
    .replace(/^#+\s*/, "")
    .replace(/[🧠⚙️🎯⚠️📖✅💡🏛️⚖️🔎🧭]/gu, "")
    .trim()
    .toLowerCase();
}

function bucketForHeading(value: string): Bucket | null {
  const h = cleanHeading(value);
  if (/connaissance|essentiel|pur jus|concept|principe/.test(h)) return "knowledge";
  if (/application|méthode|mecanique|mécanique|procédure|processus|étape|mise en pratique/.test(h)) return "method";
  if (/exemple|cas|calcul|illustration/.test(h)) return "example";
  if (/vigilance|exception|piège|rupture|risque|attention/.test(h)) return "vigilance";
  if (/terme|lexique|glossaire|vocabulaire|acronyme|définition/.test(h)) return "lexicon";
  if (/retenir|synthèse|synthese|essentiel à retenir/.test(h)) return "takeaway";
  return null;
}

function splitPart(content: string) {
  const sections: Array<{ heading: string; body: string }> = [];
  const lines = content.replace(/\r/g, "").split("\n");
  let heading = "";
  let body: string[] = [];

  const flush = () => {
    const value = body.join("\n").trim();
    if (value) sections.push({ heading, body: value });
    body = [];
  };

  for (const line of lines) {
    if (/^###\s+/.test(line.trim())) {
      flush();
      heading = line.trim();
      continue;
    }
    if (/^#\s+FICHE PAÏA/i.test(line.trim()) || /^##\s+/.test(line.trim())) continue;
    body.push(line);
  }
  flush();
  return sections;
}

function normalizeBlock(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeAlertPresentation(value: string) {
  return value
    .replace(/\s*:::update\s*/gi, "\n:::update\n")
    .replace(/\s*:::endupdate\s*/gi, "\n:::endupdate\n")
    .replace(/\s*:::current\s*/gi, "\n:::current\n")
    .replace(/\s*:::endcurrent\s*/gi, "\n:::endcurrent\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeBlocks(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = normalizeBlock(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function extractAlertBlocks(text: string, kind: "update" | "current") {
  const re = kind === "update"
    ? /:::update\s*([\s\S]*?)\s*:::endupdate/gi
    : /:::current\s*([\s\S]*?)\s*:::endcurrent/gi;
  return [...text.matchAll(re)].map((match) => match[1].trim()).filter(Boolean);
}

function stripAlerts(text: string) {
  return text
    .replace(/:::update[\s\S]*?:::endupdate/gi, "")
    .replace(/:::current[\s\S]*?:::endcurrent/gi, "")
    .trim();
}

function collectOfficialSources(text: string) {
  const lines = text.split("\n");
  const sources: string[] = [];
  for (const line of lines) {
    if (/source officielle/i.test(line) || /https?:\/\//i.test(line)) {
      const clean = line
        .replace(/^[-•]\s*/, "")
        .replace(/:::end(?:update|current)/gi, "")
        .replace(/:::+\s*$/g, "")
        .trim();
      if (clean) sources.push(clean);
    }
  }
  return dedupeBlocks(sources);
}

function stripOfficialSourceLines(text: string) {
  return text
    .split("\n")
    .filter((line) => !/source officielle\s*:/i.test(line))
    .join("\n")
    .trim();
}

function shortAlertSummary(block: string, status: string) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const source = lines.find((line) => /source officielle/i.test(line) || /https?:\/\//i.test(line));
  const main = lines.find((line) => !/source officielle/i.test(line)) || lines[0] || "";
  const cleanMain = main.replace(/^\*+|\*+$/g, "").trim();
  return "- **" + status + "** — " + cleanMain + (source ? " — " + source : "");
}

function plainSentence(value: string) {
  return value
    .replace(/:::update[\s\S]*?:::endupdate/gi, "")
    .replace(/:::current[\s\S]*?:::endcurrent/gi, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.replace(/\[|\]\([^)]+\)/g, ""))
    .replace(/[|*_#`]/g, "")
    .replace(/^[-•\d.)\s]+/, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstUsefulStatements(blocks: string[], max = 3) {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const lines = stripAlerts(block)
      .split("\n")
      .map(plainSentence)
      .filter((line) => line.length >= 24 && !/^source\s*:/i.test(line));

    for (const line of lines) {
      const key = normalizeBlock(line);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(line.replace(/[.;:]?$/, "."));
      if (out.length >= max) return out;
    }
  }
  return out;
}

function buildIntroduction(title: string, buckets: Record<Bucket, string[]>) {
  const points = firstUsefulStatements([...buckets.knowledge, ...buckets.method], 2);
  if (!points.length) {
    return "Cette fiche présente **" + title + "** de manière structurée afin d’en comprendre les notions essentielles, le fonctionnement et les points de vigilance.";
  }
  return "Cette fiche présente **" + title + "** et en pose les repères indispensables. " + points.join(" ");
}

function buildConclusion(title: string, buckets: Record<Bucket, string[]>) {
  const explicit = firstUsefulStatements(buckets.takeaway, 3);
  const fallback = firstUsefulStatements([...buckets.knowledge, ...buckets.method, ...buckets.vigilance], 3);
  const points = explicit.length ? explicit : fallback;
  if (!points.length) {
    return "En conclusion, **" + title + "** repose sur des principes et des méthodes qui doivent être appliqués avec rigueur, en tenant compte des points de vigilance identifiés dans la fiche.";
  }
  return "En conclusion, **" + title + "** doit être retenu comme un ensemble cohérent de repères opérationnels. " + points.join(" ");
}

function takeawayLines(buckets: Record<Bucket, string[]>) {
  const explicit = dedupeBlocks(buckets.takeaway);
  if (explicit.length) return explicit.join("\n\n");

  const candidates = [...buckets.knowledge, ...buckets.method]
    .flatMap((block) => stripAlerts(block).split("\n"))
    .map((line) => line.trim())
    .filter((line) => /^[-•]\s+/.test(line))
    .map((line) => line.replace(/^[-•]\s+/, "").trim())
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const key = normalizeBlock(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push("- " + item);
    if (unique.length >= 5) break;
  }
  return unique.join("\n");
}

export function assembleRevisionSheet(title: string, parts: RevisionPart[], locale: "fr" | "en" = "fr") {
  if (locale === "en") {
    return [
      "# PAÏA SHEET — " + title,
      "",
      ...parts.sort((a, b) => a.part_index - b.part_index).map((part) => part.content.trim()),
    ].join("\n\n");
  }

  const buckets: Record<Bucket, string[]> = {
    knowledge: [],
    method: [],
    example: [],
    vigilance: [],
    lexicon: [],
    takeaway: [],
  };

  const ordered = [...parts].sort((a, b) => a.part_index - b.part_index);
  const allText = ordered.map((part) => part.content.trim()).filter(Boolean).join("\n\n");

  for (const part of ordered) {
    for (const section of splitPart(part.content)) {
      const bucket = bucketForHeading(section.heading) || "knowledge";
      const body = stripOfficialSourceLines(section.body);
      if (body) buckets[bucket].push(body);
    }
  }

  for (const key of Object.keys(buckets) as Bucket[]) {
    buckets[key] = dedupeBlocks(buckets[key]);
  }

  const updates = dedupeBlocks(extractAlertBlocks(allText, "update"));
  const currents = dedupeBlocks(extractAlertBlocks(allText, "current"));
  const officialSources = collectOfficialSources(allText);
  const takeaway = takeawayLines(buckets);

  const out: string[] = [
    "## ✨ Introduction",
    buildIntroduction(title, buckets),
    "",
    "## 💡 Le déclic",
    "Cette fiche transforme **" + title + "** en connaissances directement exploitables, avec les actualisations officielles intégrées au fil de la lecture lorsqu’elles sont nécessaires.",
  ];

  const pushSection = (heading: string, blocks: string[]) => {
    const clean = dedupeBlocks(blocks).map(normalizeAlertPresentation);
    if (!clean.length) return;
    out.push("", heading, "", clean.join("\n\n"));
  };

  pushSection("## 🧠 Le pur jus", buckets.knowledge);
  pushSection("## ⚙️ La mécanique opérationnelle", buckets.method);
  pushSection("## 🎯 L’exemple décrypté", buckets.example);
  pushSection("## ⚠️ Les points de rupture", buckets.vigilance);
  pushSection("## 📖 Le lexique", buckets.lexicon);

  if (officialSources.length) {
    out.push("", "## 🏛️ Le référentiel officiel", "", officialSources.map((item) => "- " + item).join("\n"));
  }

  if (updates.length || currents.length) {
    out.push("", "## ⚖️ Veille réglementaire & vérification d’actualité", "");
    out.push([
      ...updates.map((block) => shortAlertSummary(block, "Mise à jour vérifiée")),
      ...currents.map((block) => shortAlertSummary(block, "À jour")),
    ].join("\n"));
  }

  if (takeaway) {
    out.push("", "## ✅ À retenir", "", takeaway);
  }

  out.push("", "## 🌟 Conclusion", "", buildConclusion(title, buckets));

  return out.join("\n").replace(/\n{4,}/g, "\n\n\n").trim();
}
