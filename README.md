# nouns-world-directory

Filterable directory pulling live data from a published Google Sheet.

## New columns
- **Main tag** → visible chips
- **Hidden tags** → search-only keywords
- **Logo URL** → direct image URL (preferred). If blank, legacy **Logo** is used; else it will try `/logos/{slug(title)}.png`.

## Local dev (optional)
```bash
npm install
npm run dev
```

## Deploy (Vercel/Netlify)
- Build: `npm run build`
- Output: `dist`
