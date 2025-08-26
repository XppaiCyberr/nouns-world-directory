// v35 — Prefer HTML (pubhtml) first, then CSV (proxy → direct).
// Why: your HTML endpoint is reliable while CSV sometimes 400s.

import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

const CONFIG = {
  SHEET_HTML_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2QEJ1rF958d-HWyfhuCMGVjBCIxED4ACRBCLtGw1yAzYON0afVFXxY_YOHhRjHVwGvOh7zpMyaRs7/pubhtml?gid=0&single=true",
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2QEJ1rF958d-HWyfhuCMGVjBCIxED4ACRBCLtGw1yAzYON0afVFXxY_YOHhRjHVwGvOh7zpMyaRs7/pub?gid=0&single=true&output=csv",
  PROXY_URL: "/api/sheet-proxy",
  COLUMNS: {
    title: ["Name (with url hyperlinked)", "Name", "Title"],
    link: ["URL", "Link"],
    description: ["Description", "About"],
    categories: ["Category"],
    cardCategories: ["Card Categories", "Card categories"],
    hiddenTags: ["Hidden tags", "Hidden Tags", "Search tags", "Search Keywords"],
    logoUrl: ["Logo URL", "Logo url", "Image URL"],
    image: ["Logo", "Image"]
  },
  site: {
    openLinksInNewTab: true,
    stickyHeader: false
  }
};

const slug = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

const parseList = (val) =>
  (val || "")
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter(Boolean);

function resolveColumns(fields, candidatesMap) {
  const lowerIndex = new Map(fields.map((f) => [f.toLowerCase().trim(), f]));
  const pick = (arr) => {
    for (const name of arr) {
      const found = lowerIndex.get(String(name).toLowerCase());
      if (found) return found;
    }
    return null;
  };
  return {
    title: pick(candidatesMap.title),
    link: pick(candidatesMap.link),
    description: pick(candidatesMap.description),
    categories: pick(candidatesMap.categories),
    cardCategories: pick(candidatesMap.cardCategories),
    hiddenTags: pick(candidatesMap.hiddenTags),
    logoUrl: pick(candidatesMap.logoUrl),
    image: pick(candidatesMap.image)
  };
}

// --- HTML parsing (pubhtml) ---
function parsePublishedHtml(text) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    // Google often uses table.waffle; otherwise pick the largest table
    let table = doc.querySelector("table.waffle");
    if (!table) {
      const tables = Array.from(doc.querySelectorAll("table"));
      table = tables.sort((a,b) => b.textContent.length - a.textContent.length)[0] || null;
    }
    if (!table) return { rows: [], fields: [] };

    const trs = Array.from(table.querySelectorAll("tr"));
    const raw = trs.map(tr => Array.from(tr.querySelectorAll("th,td")).map(td => (td.textContent||"").replace(/\s+/g," ").trim()));
    if (!raw.length) return { rows: [], fields: [] };

    const headers = raw[0].map((h,i) => h || `col_{i}`);
    const rows = raw.slice(1).map(r => Object.fromEntries(headers.map((h,i) => [h, r[i] ?? ""])));
    return { rows, fields: headers };
  } catch (e) {
    return { rows: [], fields: [] };
  }
}

export default function NounsDirectory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSnippet, setDebugSnippet] = useState("");
  const [debugFields, setDebugFields] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [query, setQuery] = useState("");

  const containerRef = useRef(null);

  useEffect(() => {
    let aborted = false;

    async function fetchText(url) {
      const r = await fetch(url, { cache: "no-store" });
      const t = await r.text();
      return { ok: r.ok, text: t };
    }

    async function load() {
      setLoading(true);
      setError("");
      setDebugSnippet("");
      setDebugFields([]);

      // 1) HTML via proxy (preferred; your HTML endpoint is stable)
      try {
        const r0 = await fetchText(`${CONFIG.PROXY_URL}?url=${encodeURIComponent(CONFIG.SHEET_HTML_URL)}`);
        if (r0.ok) {
          const parsed = parsePublishedHtml(r0.text);
          if (parsed.fields.length) {
            if (aborted) return;
            setDebugFields(parsed.fields);
            const cols = resolveColumns(parsed.fields, CONFIG.COLUMNS);
            const data = parsed.rows.map((row, i) => {
              const titleRaw = (cols.title && row[cols.title]) || "";
              const link = (cols.link && row[cols.link]) || "";
              const title = String(titleRaw || (link ? new URL(link).hostname.replace(/^www\./,"") : `Untitled ${i+1}`)).trim();
              const description = String((cols.description && row[cols.description]) || "").trim();
              const categories = parseList(cols.categories ? row[cols.categories] : "");
              const cardCategories = parseList(cols.cardCategories ? row[cols.cardCategories] : "");
              const hidden = parseList(cols.hiddenTags ? row[cols.hiddenTags] : "");
              const logoUrl = String((cols.logoUrl && row[cols.logoUrl]) || "").trim();
              const legacyLogo = String((cols.image && row[cols.image]) || "").trim();
              const derivedLogo = title ? `/logos/${slug(title)}.png` : "";
              const image = logoUrl || legacyLogo || derivedLogo;
              return { key: `${slug(title)}-${i}`, title, link, description, categories, cardCategories, hiddenTags: hidden, image };
            });
            setRows(data);
            setLoading(false);
            return;
          } else {
            setDebugSnippet(r0.text.slice(0,200));
          }
        }
      } catch {}

      // 2) CSV via proxy
      try {
        const csvUrl = CONFIG.SHEET_CSV_URL; // allow CDN caching
        const r1 = await fetchText(`${CONFIG.PROXY_URL}?url=${encodeURIComponent(csvUrl)}`);
        if (r1.ok && !/^\s*</.test(r1.text)) {
          const parsed = Papa.parse(r1.text, { header: true, skipEmptyLines: true });
          const fields = parsed.meta?.fields || Object.keys(parsed.data?.[0] || {});
          if (fields.length) {
            if (aborted) return;
            setDebugFields(fields);
            const cols = resolveColumns(fields, CONFIG.COLUMNS);
            const data = (parsed.data || []).map((row, i) => {
              const titleRaw = (cols.title && row[cols.title]) || "";
              const link = (cols.link && row[cols.link]) || "";
              const title = String(titleRaw || (link ? new URL(link).hostname.replace(/^www\./,"") : `Untitled ${i+1}`)).trim();
              const description = String((cols.description && row[cols.description]) || "").trim();
              const categories = parseList(cols.categories ? row[cols.categories] : "");
              const cardCategories = parseList(cols.cardCategories ? row[cols.cardCategories] : "");
              const hidden = parseList(cols.hiddenTags ? row[cols.hiddenTags] : "");
              const logoUrl = String((cols.logoUrl && row[cols.logoUrl]) || "").trim();
              const legacyLogo = String((cols.image && row[cols.image]) || "").trim();
              const derivedLogo = title ? `/logos/${slug(title)}.png` : "";
              const image = logoUrl || legacyLogo || derivedLogo;
              return { key: `${slug(title)}-${i}`, title, link, description, categories, cardCategories, hiddenTags: hidden, image };
            });
            setRows(data);
            setLoading(false);
            return;
          }
        }
      } catch {}

      // 3) CSV direct
      try {
        const r2 = await fetchText(CONFIG.SHEET_CSV_URL);
        if (r2.ok && !/^\s*</.test(r2.text)) {
          const parsed = Papa.parse(r2.text, { header: true, skipEmptyLines: true });
          const fields = parsed.meta?.fields || Object.keys(parsed.data?.[0] || {});
          if (fields.length) {
            if (aborted) return;
            setDebugFields(fields);
            const cols = resolveColumns(fields, CONFIG.COLUMNS);
            const data = (parsed.data || []).map((row, i) => {
              const titleRaw = (cols.title && row[cols.title]) || "";
              const link = (cols.link && row[cols.link]) || "";
              const title = String(titleRaw || (link ? new URL(link).hostname.replace(/^www\./,"") : `Untitled ${i+1}`)).trim();
              const description = String((cols.description && row[cols.description]) || "").trim();
              const categories = parseList(cols.categories ? row[cols.categories] : "");
              const cardCategories = parseList(cols.cardCategories ? row[cols.cardCategories] : "");
              const hidden = parseList(cols.hiddenTags ? row[cols.hiddenTags] : "");
              const logoUrl = String((cols.logoUrl && row[cols.logoUrl]) || "").trim();
              const legacyLogo = String((cols.image && row[cols.image]) || "").trim();
              const derivedLogo = title ? `/logos/${slug(title)}.png` : "";
              const image = logoUrl || legacyLogo || derivedLogo;
              return { key: `${slug(title)}-${i}`, title, link, description, categories, cardCategories, hiddenTags: hidden, image };
            });
            setRows(data);
            setLoading(false);
            return;
          }
        }
      } catch {}

      setError("We couldn’t parse either the HTML or CSV for this sheet right now. Please try a refresh, or share the /export?format=csv link and I’ll wire that in.");
      setLoading(false);
    }

    load();
    return () => { aborted = true; };
  }, []);

  const allFilterTags = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => (r.categories || []).forEach((c) => set.add(c)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (selectedTags.length) {
      const wanted = new Set(selectedTags.map((t) => slug(t)));
      out = out.filter((r) => (r.categories || []).some((c) => wanted.has(slug(c))));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((r) => {
        const haystack = [
          r.title,
          r.description,
          ...(r.categories || []),
          ...(r.cardCategories || []),
          ...(r.hiddenTags || [])
        ].join(" | ").toLowerCase();
        return haystack.includes(q);
      });
    }
    return out;
  }, [rows, selectedTags, query]);

  const toggleTag = (tag) => {
    const sl = slug(tag);
    setSelectedTags((prev) =>
      prev.some((t) => slug(t) === sl) ? prev.filter((t) => slug(t) !== sl) : [...prev, tag]
    );
  };

  const clearFilters = () => setSelectedTags([]);

  return (
    <>
      <div className="relative z-30">
        <Header />
      </div>

      <div ref={containerRef} className="relative mx-auto max-w-6xl px-4">
        <div className="relative z-10 pb-24">
          <p className="mx-auto mt-5 max-w-3xl text-center text-base md:text-xl leading-relaxed text-neutral-800">
            <strong>Nouns</strong> is a <strong>decentralized</strong> project, driven by its <strong>community</strong>.
            They expand and maintain it with new <strong>technology</strong>, <strong>tools</strong>, and <strong>resources</strong>.
            Learn, find art or developer resources, and explore different areas of Nouns through the <strong>categories below</strong>.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="sr-only">Explore Nounish Projects</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resources…"
                className="w-full max-w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 sm:w-72"
                aria-label="Search"
                name="q" id="q"
              />
              {selectedTags.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {error}{" "}
              <button
                className="ml-2 underline"
                onClick={() => setDebugOpen((v) => !v)}
              >
                {debugOpen ? "Hide details" : "Show details"}
              </button>
              {debugOpen && (
                <div className="mt-2 rounded bg-white p-2 text-xs text-neutral-700">
                  <div><strong>First 200 chars:</strong></div>
                  <pre className="whitespace-pre-wrap break-words">{debugSnippet}</pre>
                  <div className="mt-2"><strong>Detected columns:</strong> {debugFields.join(", ") || "(none)"}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 md:hidden">
            <MobileFilters
              tags={allFilterTags}
              selected={selectedTags}
              onToggle={toggleTag}
              onClear={clearFilters}
            />
          </div>

          <div className="mt-3 hidden grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:grid">
            {allFilterTags.map((t) => (
              <Pill
                key={t}
                selected={selectedTags.some((x) => slug(x) === slug(t))}
                onClick={() => toggleTag(t)}
              >
                {t}
              </Pill>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
            <div className="bg-white/90 px-1">{filtered.length} shown</div>
            <div className="ml-4">
              <Disclaimer />
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-neutral-600">Loading…</div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <article
                  key={r.key}
                  className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-[30px] w-[30px] shrink-0 overflow-hidden rounded ${r.image ? "bg-neutral-100" : "bg-black"}`}>
                      {r.image ? (
                        <img
                          src={r.image}
                          alt=""
                          width="30"
                          height="30"
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.remove();
                            const p = e.currentTarget.parentElement;
                            p && p.classList.remove("bg-neutral-100");
                            p && p.classList.add("bg-black");
                          }}
                        />
                      ) : null}
                    </div>
                    <h3 className="min-w-0 truncate text-lg font-semibold leading-snug">
                      {r.link ? (
                        <a
                          href={r.link}
                          target={CONFIG.site.openLinksInNewTab ? "_blank" : undefined}
                          rel="noreferrer noopener"
                          className="hover:underline"
                        >
                          {r.title}
                        </a>
                      ) : (
                        r.title
                      )}
                    </h3>
                  </div>

                  <p className="mt-3 text-sm text-neutral-700">{r.description}</p>

                  {!!(r.cardCategories && r.cardCategories.length) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.cardCategories.map((cc) => (
                        <span
                          key={`${r.key}-cc-${cc}`}
                          className="rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800"
                        >
                          {cc}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.link && (
                    <div className="mt-auto pt-4 flex justify-end">
                      <a
                        href={r.link}
                        target={CONFIG.site.openLinksInNewTab ? "_blank" : undefined}
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
                      >
                        Explore →
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
