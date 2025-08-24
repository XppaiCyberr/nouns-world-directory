// Nouns.world — Filterable Directory (Google Sheets)
// v9:
// a) Mobile: filters collapse into a dropdown with checkboxes (md+ keeps chip grid)
// b) Tag colors: switched to monotone neutrals
// c) Edge doodles: place accessory images around page edges at random angles/sizes (lg+ only)
//    Put files in /public/images/accessories/ (see ACCESSORY_FILES).

import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

const CONFIG = {
  SHEET_CSV_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2QEJ1rF958d-HWyfhuCMGVjBCIxED4ACRBCLtGw1yAzYON0afVFXxY_YOHhRjHVwGvOh7zpMyaRs7/pub?gid=0&single=true&output=csv",
  COLUMNS: {
    title: ["Name (with url hyperlinked)", "Name", "Title"],
    link: ["URL", "Link"],
    description: ["Description", "About"],
    categories: ["Category", "Categories"],
    mainTag: ["Main tag", "Main Tag", "Primary tag", "Main category", "Main Category"],
    hiddenTags: ["Hidden tags", "Hidden Tags", "Search tags", "Search Keywords"],
    logoUrl: ["Logo URL", "Logo url", "Image URL"],
    image: ["Logo", "Image"]
  },
  site: {
    openLinksInNewTab: true,
    enableAccessoryDoodles: true  // set false to hide edge images
  }
};

const ACCESSORY_FILES = [
  "accessory-1-noun-2.png",
  "accessory-1-noun.png",
  "accessory-arrow.png",
  "accessory-bling-rings.png",
  "accessory-bling.png",
  "accessory-bulb.png",
  "accessory-carrot.png",
  "accessory-eth.png",
  "accessory-heart.png",
  "accessory-infinity.png",
  "accessory-lol.png",
  "accessory-nil.png",
  "accessory-rgb.png",
  "accessory-txt.png",
  "accessory-wet-money.png"
];

const slug = (s) =>
  (s || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

const parseList = (val) =>
  (val || "")
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter(Boolean);

const Pill = ({ children, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-2xl border px-3 py-2 text-sm transition ${
      selected
        ? "border-neutral-900 bg-neutral-900 text-white shadow"
        : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
    }`}
  >
    <span className="truncate">{children}</span>
  </button>
);

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
          className={`absolute right-0 top-full mt-2 w-80 rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-800 shadow-lg transition ${
            open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
          }`}
        >
          <strong>Warning.</strong> Links lead off of nouns.world. Please make sure to do your own research
          and only click links or connect to websites you trust.
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-neutral-100">
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

// Resolve header names case-insensitively
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
    mainTag: pick(candidatesMap.mainTag),
    hiddenTags: pick(candidatesMap.hiddenTags),
    logoUrl: pick(candidatesMap.logoUrl),
    image: pick(candidatesMap.image)
  };
}

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

function EdgeDoodles() {
  if (!CONFIG.site.enableAccessoryDoodles) return null;
  // Positions near edges; lg+ only
  const spots = useMemo(() => {
    const rand = (a, b) => a + Math.random() * (b - a);
    const makeSpot = (side) => {
      const rotate = rand(-25, 25).toFixed(1);
      const size = rand(36, 110).toFixed(0); // px
      let style = { transform: `rotate(${rotate}deg)`, width: `${size}px`, height: `${size}px` };
      const offset = `${rand(8, 85).toFixed(0)}%`;
      switch (side) {
        case "left":
          style.left = "-12px"; style.top = offset; break;
        case "right":
          style.right = "-12px"; style.top = offset; break;
        case "top":
          style.top = "-12px"; style.left = offset; break;
        case "bottom":
          style.bottom = "-12px"; style.left = offset; break;
      }
      return style;
    };
    const sides = ["left","right","top","bottom"];
    const count = Math.min(10, ACCESSORY_FILES.length);
    return Array.from({length: count}).map((_, i) => ({
      file: ACCESSORY_FILES[i % ACCESSORY_FILES.length],
      style: makeSpot(sides[i % sides.length])
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block" aria-hidden="true">
      {spots.map((s, idx) => (
        <img
          key={idx}
          src={`/images/accessories/${s.file}`}
          alt=""
          className="absolute opacity-30 select-none"
          style={s.style}
          loading="lazy"
        />
      ))}
    </div>
  );
}

export default function NounsDirectory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState([]);
  const [useMainTagFilters, setUseMainTagFilters] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Papa.parse(CONFIG.SHEET_CSV_URL, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (res) => {
        const raw = res.data || [];
        const fields = (res.meta && res.meta.fields) || Object.keys(raw[0] || {});
        const cols = resolveColumns(fields, CONFIG.COLUMNS);

        const data = raw.map((row, i) => {
          const titleRaw = (cols.title && row[cols.title]) || "";
          const link = (cols.link && row[cols.link]) || "";
          const title = String(titleRaw || (link ? new URL(link).hostname.replace(/^www\./, "") : `Untitled ${i + 1}`)).trim();
          const description = String((cols.description && row[cols.description]) || "").trim();

          const legacyCategories = parseList(cols.categories ? row[cols.categories] : "");
          const mainTagList = parseList(cols.mainTag ? row[cols.mainTag] : "");
          const mainTag = mainTagList[0] || "";
          const hidden = parseList(cols.hiddenTags ? row[cols.hiddenTags] : "");

          const logoUrl = String((cols.logoUrl && row[cols.logoUrl]) || "").trim();
          const legacyLogo = String((cols.image && row[cols.image]) || "").trim();
          const derivedLogo = title ? `/logos/${slug(title)}.png` : "";
          const image = logoUrl || legacyLogo || derivedLogo;

          return {
            key: `${slug(title)}-${i}`,
            title,
            link,
            description,
            mainTag,
            hiddenTags: hidden,
            legacyCategories,
            image
          };
        });

        const hasAnyMain = data.some((r) => !!r.mainTag);
        setUseMainTagFilters(hasAnyMain);
        setRows(data);
        setLoading(false);
      },
      error: () => setLoading(false),
    });
  }, []);

  // Filter source (main tags if present, else categories)
  const allFilterTags = useMemo(() => {
    const set = new Set();
    if (useMainTagFilters) {
      rows.forEach((r) => { if (r.mainTag) set.add(r.mainTag); });
    } else {
      rows.forEach((r) => (r.legacyCategories || []).forEach((c) => set.add(c)));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, useMainTagFilters]);

  // Apply filters + search
  const filtered = useMemo(() => {
    let out = rows;
    if (selectedTags.length) {
      const wanted = new Set(selectedTags.map((t) => slug(t)));
      if (useMainTagFilters) {
        out = out.filter((r) => r.mainTag && wanted.has(slug(r.mainTag)));
      } else {
        out = out.filter((r) => (r.legacyCategories || []).some((c) => wanted.has(slug(c))));
      }
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((r) => {
        const haystack = [
          r.title,
          r.description,
          r.mainTag,
          ...(r.hiddenTags || []),
          ...(r.legacyCategories || [])
        ].join(" | ").toLowerCase();
        return haystack.includes(q);
      });
    }
    return out;
  }, [rows, selectedTags, useMainTagFilters, query]);

  const toggleTag = (tag) => {
    const sl = slug(tag);
    setSelectedTags((prev) =>
      prev.some((t) => slug(t) === sl) ? prev.filter((t) => slug(t) !== sl) : [...prev, tag]
    );
  };

  const clearFilters = () => setSelectedTags([]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <Header />
      <EdgeDoodles />

      {/* Intro paragraph */}
      <p className="mt-4 text-sm leading-relaxed text-neutral-700">
        Nouns is a decentralized project and the community members are the driving force behind its growth.
        They continually expand and maintain the project with new technology, tools, and resources.
        Explore different areas of Nouns through the categories below:
      </p>

      {/* Search + Clear */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="sr-only">Explore Nounish Projects</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="w-full max-w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 sm:w-72"
            aria-label="Search"
          />
          {selectedTags.length > 0 && (
            <button
              onClick={clearFilters}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown filters */}
      <div className="mt-3 md:hidden">
        <MobileFilters
          tags={allFilterTags}
          selected={selectedTags}
          onToggle={toggleTag}
          onClear={clearFilters}
        />
      </div>

      {/* Desktop/tablet chip grid */}
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

      {/* Count + Disclaimer */}
      <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
        <div>{filtered.length} shown</div>
        <div className="ml-4">
          <Disclaimer />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="mt-6 text-sm text-neutral-600">Loading…</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <article
              key={r.key}
              className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              {/* Header: 30×30 logo + Title */}
              <div className="flex items-center gap-3">
                <div className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded bg-neutral-100">
                  {r.image ? (
                    <img
                      src={r.image}
                      alt=""
                      width="30"
                      height="30"
                      loading="lazy"
                      className="h-full w-full object-cover"
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

              {/* Tags on card (monotone) */}
              <div className="mt-2 flex flex-wrap gap-2">
                {r.mainTag ? (
                  <span className="rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800">
                    {r.mainTag}
                  </span>
                ) : (
                  (r.legacyCategories || []).slice(0, 3).map((c) => (
                    <span key={c} className="rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800">
                      {c}
                    </span>
                  ))
                )}
              </div>

              {/* Description */}
              <p className="mt-3 text-sm text-neutral-700">{r.description}</p>

              {/* Footer: Explore -> aligned right & at bottom */}
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
  );
}