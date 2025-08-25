// v31 (reissued):
// - Load sheet via Vercel proxy (/api/sheet-proxy?url=...) to avoid CORS/rate limits.
// - Error UI if parsing fails.

import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

const CONFIG = {
  SHEET_CSV_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2QEJ1rF958d-HWyfhuCMGVjBCIxED4ACRBCLtGw1yAzYON0afVFXxY_YOHhRjHVwGvOh7zpMyaRs7/pub?gid=0&single=true&output=csv",
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

function Disclaimer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-600">
      <span className="font-medium">Disclaimer</span>
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          aria-label="Disclaimer information"
          onClick={() => setOpen((v) => !v)}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-[10px] leading-none"
        >
          i
        </button>
        <div
          className={`absolute right-0 top-full mt-2 w-80 rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-800 shadow-lg transition ${open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"}`}
        >
          <strong>Warning.</strong> Links lead off of nouns.world. Please make sure to do your own research
          and only click links or connect to websites you trust.
        </div>
      </div>
    </div>
  );
}

function Header() {
  const stick = CONFIG.site.stickyHeader;
  return (
    <div className={`${stick ? "sticky top-0" : ""} z-30 w-full bg-black text-white`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
            <img
              src="/nouns-world-globe.gif"
              alt="Nouns.world"
              className="h-full w-full object-contain"
              onError={(e) => e.currentTarget.remove()}
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">NOUNS.WORLD/RESOURCES</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://nouns.world"
            className="rounded-xl border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            Home
          </a>
          <a
            href="https://nouns.world/explore"
            className="hidden md:inline-flex rounded-xl border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            Explore Projects
          </a>
        </div>
      </div>
    </div>
  );
}

const Pill = ({ children, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-2xl px-3 py-2 text-sm transition ${
      selected
        ? "border-2 border-black bg-black text-white shadow"
        : "border-2 border-black bg-white text-black hover:bg-neutral-50"
    }`}
  >
    <span className="truncate">{children}</span>
  </button>
);

function MobileFilters({ tags, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  const anySelected = selected.length > 0;
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-full items-center justify-between rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
      >
        <span className="font-medium">Filter categories</span>
        <span className="flex items-center gap-2 text-xs text-neutral-600">
          {anySelected ? `${selected.length} selected` : "None"}
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`transition ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-xs text-neutral-600">
            <span>{tags.length} categories</span>
            {anySelected && (
              <button onClick={onClear} className="underline">Clear</button>
            )}
          </div>
          <ul className="space-y-2">
            {tags.map((t) => {
              const checked = selected.some((x) => slug(x) === slug(t));
              const id = `tag-${slug(t)}`;
              return (
                <li key={t}>
                  <label htmlFor={id} className="flex items-center gap-2">
                    <input
                      id={id}
                      type="checkbox"
                      className="h-4 w-4 accent-black"
                      checked={checked}
                      onChange={() => onToggle(t)}
                    />
                    <span className="text-sm">{t}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function NounsDirectory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [query, setQuery] = useState("");

  const containerRef = useRef(null);

  useEffect(() => {
    const url = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(CONFIG.SHEET_CSV_URL)}`;
    Papa.parse(url, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (res) => {
        try {
          const raw = res.data || [];
          const fields = (res.meta && res.meta.fields) || Object.keys(raw[0] || {});
          if (!fields.length) throw new Error("No columns detected");
          const cols = resolveColumns(fields, CONFIG.COLUMNS);
          const data = raw.map((row, i) => {
            const titleRaw = (cols.title && row[cols.title]) || "";
            const link = (cols.link && row[cols.link]) || "";
            const title = String(titleRaw || (link ? new URL(link).hostname.replace(/^www\./, "") : `Untitled ${i + 1}`)).trim();
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
        } catch (e) {
          setError("We couldn't read the sheet. It might be unpublished or rate-limited. Try reloading in a minute.");
          setLoading(false);
        }
      },
      error: () => {
        setError("Network error while loading the sheet.");
        setLoading(false);
      },
    });
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
              />
              {selectedTags.length > 0 and (
                <button
                  onClick={clearFilters}
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {error and (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {error}{" "}
              <span className="block text-xs text-amber-800 mt-1">
                Quick checks: Ensure the sheet is still <em>Published to the web</em>, the link hasn&apos;t changed, and column headers match
                <code className="mx-1">Category</code> / <code className="mx-1">Card Categories</code> / <code className="mx-1">URL</code> / <code className="mx-1">Description</code>.
              </span>
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

                  {!!(r.cardCategories && r.cardCategories.length) and (
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

                  {r.link and (
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
