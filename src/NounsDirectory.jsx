// Nouns.world — Filterable Directory (Google Sheets)
// Updates implemented per request:
// 1) Left logo space (nouns-world-globe.gif), same header height
// 2) Title changed to "NOUNS.WORLD/RESOURCES"
// 3) Added text "Explore Nouns Projects" above filters
// 4) Filters stacked in a responsive grid (no horizontal scroll)
// 5) "X shown" moved under category tags
// 6) Removed A–Z selector
// 7) Added Home button (to https://www.nouns.world/)
// 8) Added "Explore →" link on each card footer
// 9) Added caution note below header
// 10) Mobile/iPad friendly adjustments

import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

const CONFIG = {
  SHEET_CSV_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2QEJ1rF958d-HWyfhuCMGVjBCIxED4ACRBCLtGw1yAzYON0afVFXxY_YOHhRjHVwGvOh7zpMyaRs7/pub?gid=0&single=true&output=csv",
  COLUMNS: {
    title: "Name (with url hyperlinked)",
    link: "URL",
    description: "Description",
    categories: "Category",
    image: "Logo"
  },
  site: {
    openLinksInNewTab: true
  }
};

const slug = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

const parseList = (val) =>
  (val || "")
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter(Boolean);

const pastelFromText = (text) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 92%)`;
};

const Pill = ({ children, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-2xl border px-3 py-2 text-sm transition ${
      selected
        ? "border-neutral-800 bg-neutral-900 text-white shadow"
        : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
    }`}
    style={{ backgroundColor: selected ? undefined : pastelFromText(children) }}
  >
    <span className="truncate">{children}</span>
  </button>
);

function Header() {
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Logo space (uses /nouns-world-globe.gif if present in public/) */}
          <div className="h-10 w-10 overflow-hidden rounded bg-neutral-100 flex items-center justify-center">
            {/* If image fails to load, the placeholder box remains */}
            <img
              src="/nouns-world-globe.gif"
              alt="Nouns.world"
              className="h-full w-full object-contain"
              onError={(e) => e.currentTarget.remove()}
            />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">NOUNS.WORLD/RESOURCES</h1>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://www.nouns.world/"
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function NounsDirectory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Papa.parse(CONFIG.SHEET_CSV_URL, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (res) => {
        const raw = res.data || [];
        const data = raw.map((row, i) => {
          const title = (row[CONFIG.COLUMNS.title] || "").toString().trim();
          const link = (row[CONFIG.COLUMNS.link] || "").toString().trim();
          const description = (row[CONFIG.COLUMNS.description] || "").toString().trim();
          const categories = parseList(row[CONFIG.COLUMNS.categories]);
          const image = (row[CONFIG.COLUMNS.image] || "").toString().trim();
          return { key: `${slug(title)}-${i}`, title, link, description, categories, image };
        });
        setRows(data);
        setLoading(false);
      },
      error: () => setLoading(false),
    });
  }, []);

  const allCategories = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => r.categories.forEach((c) => set.add(c)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (selectedCats.length) {
      const wanted = new Set(selectedCats.map((c) => slug(c)));
      out = out.filter((r) => r.categories.some((c) => wanted.has(slug(c))));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.categories.join(", ").toLowerCase().includes(q)
      );
    }
    return out;
  }, [rows, selectedCats, query]);

  const toggleCat = (cat) => {
    const sl = slug(cat);
    setSelectedCats((prev) =>
      prev.some((c) => slug(c) === sl) ? prev.filter((c) => slug(c) !== sl) : [...prev, cat]
    );
  };

  const clearFilters = () => setSelectedCats([]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <Header />

      {/* Caution note */}
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Note: you’re about to navigate away from Nouns.world for external resources. Please be careful and do your own research.
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-base md:text-lg font-semibold">Explore Nouns Projects</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full sm:w-72 max-w-[100%] rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            aria-label="Search"
          />
          {selectedCats.length > 0 && (
            <button
              onClick={clearFilters}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Category bubbles — stacked grid */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {allCategories.map((c) => (
          <Pill
            key={c}
            selected={selectedCats.some((x) => slug(x) === slug(c))}
            onClick={() => toggleCat(c)}
          >
            {c}
          </Pill>
        ))}
      </div>

      {/* Count under tags */}
      <div className="mt-2 text-xs text-neutral-600">{filtered.length} shown</div>

      {/* Cards */}
      {loading ? (
        <div className="mt-6 text-sm text-neutral-600">Loading…</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <article
              key={r.key}
              className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              {/* 30×30 placeholder (or future image) */}
              <div className="flex items-center gap-3">
                <div className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded bg-neutral-100">
                  {r.image ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <img src={r.image} className="h-full w-full object-cover" />
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

              <div className="mt-3 flex flex-wrap gap-2">
                {r.categories.map((c) => (
                  <span
                    key={`${r.key}-${c}`}
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
                  >
                    {c}
                  </span>
                ))}
              </div>

              {/* Card footer link */}
              {r.link && (
                <div className="mt-4">
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
  );
}