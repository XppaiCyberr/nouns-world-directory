# nouns-world-directory

Filterable directory pulling live data from a published Google Sheet.

## v7: Tag resilience
- Auto-detects column names case-insensitively.
- If no **Main tag** values exist, filters fall back to **Category** values.
- Cards show **Main tag** if present, else up to 3 **Category** chips.

## Optional logos
- Preferred: **Logo URL** (direct link to image).
- Fallbacks: legacy **Logo** → `/logos/{slug(title)}.png`.

## Deploy
- Build: `npm run build`
- Output: `dist`
