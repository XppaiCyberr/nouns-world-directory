# nouns-world-directory

Filterable directory pulling live data from a published Google Sheet.

## v17
- **Fixed gutters**: 2-image cycle on the left, 3-image cycle on the right. These logos are `position: fixed` so they **do not scroll** with the page.
- **Mobile enabled**: no more hiding on small screens. If the side gutters are narrow, the art hugs the edges (even slightly offscreen) to avoid covering content.
- **No extra page height**: fixed layer doesn't affect layout. Cards/chips remain opaque and above the art.
- Keeps: black header, border-2 chips, black logo fallback, mobile dropdown filters, tags under description, disclaimer.

### Assets
Place in `public/images/`:
```
resource-gif-1.gif
resource-gif-2.gif
resource-gif-3.gif
resource-gif-4.gif
resource-gif-5.gif
```

### Tuning (`CONFIG.site.fixedGutters`)
- `yPercentsLeft` / `yPercentsRight`: where each logo sits vertically (percent of viewport height).
- `sizeMin/sizeMax`, `jitterX`, `opacity`
- `minGutterPx`, `marginX`
- `seed` for deterministic layout

## Deploy
- Build: `npm run build`
- Output: `dist`
