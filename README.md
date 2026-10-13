# McGarden Bergen 400 × 300 – 3D-Showcase

Interaktive, maßgenaue 3D-Demo des **Gartenhauses Bergen 400 × 300 cm** (mcgarden24.de) mit
three.js, react-three-fiber und drei – gebaut als Showcase und als Grundlage für die spätere
Integration in den Shop.

> Unverbindliche Demo. Maße, Optionen und Preise stammen von der öffentlichen Produktseite
> (Stand 13.10.2026). Es sind keine Fotos oder Logos des Herstellers im Repository enthalten.

## Was die Demo kann

- **Maßgenaues Modell** aus den technischen Zeichnungen: Außenmaß 3980 × 2980 mm, Wandhöhe 2092,5 / 2244 mm,
  Tür 1450 × 2035 mm, Fenster 550 × 1890 mm, 14 Blockbohlen-Lagen mit Doppelnut/-feder und 4-fach-Eckverbindung,
  Pultdach mit 3,1° Neigung, Pfetten, Unterkonstruktion (siehe [docs/SPEC.md](docs/SPEC.md))
- **Konfigurator** mit Live-Preis: Wandfarbe (Naturholz, Lasuren, Deckfarben), Tür-/Fensterfarbe, Dacheindeckung
  (unbehandelt, Bitumen, Dachpappe, EPDM, Trapezblech), Zubehörpakete, Regenrinne, Fußboden, spiegelverkehrter Aufbau
- **Aufbau-Animation** (Unterkonstruktion → Bohlen Lage für Lage → Tür/Fenster → Dach), scrubbbar
- **Bemaßung** per Knopfdruck, **Dach abheben**, **Tür öffnen** (Klick auf die Tür), **Innenansicht**
- **Tag / Abend / Nacht** mit Innenbeleuchtung
- **AR im eigenen Garten**: GLB-Export zur Laufzeit → `<model-viewer>` (WebXR, Scene Viewer, Quick Look), QR-Code am Desktop
- **Embed-Modus** für den Shop (iframe + `postMessage`), siehe [docs/INTEGRATION.md](docs/INTEGRATION.md)

## URL-Parameter

| Parameter | Wirkung |
| --- | --- |
| `?intro=0` | Intro-Animation (Aufbau + Kamerafahrt) überspringen |
| `?embed=1` | Einbettungsmodus (ohne Marken-Kachel, ohne Intro) |
| `?q=low\|medium\|high` | Grafikqualität festlegen (sonst automatisch) |
| `?finish=anthrazit&doorFinish=weiss&roof=epdm&package=premium&gutter=1&floor=1&mirrored=1` | Konfiguration vorbelegen (der „Link“-Knopf erzeugt diese URL) |
| `?ar=1` | öffnet direkt den AR-Dialog (Ziel des QR-Codes) |

## Entwicklung

```bash
npm install
npm run assets      # lädt die CC0-Assets (Poly Haven) nach public/ – bereits eingecheckt, nur zum Erneuern
npm run dev         # http://localhost:5173 (Standard-Port von Vite)
npm test            # Maß-Invarianten (Geometrie + Preislogik)
npm run build       # Typecheck + Produktions-Build nach dist/
node scripts/shot.mjs out.png --panel 0   # Screenshot per Chrome (dev-Server muss laufen)
node scripts/fps.mjs http://localhost:4173/?intro=0   # Ladezeit/FPS gegen `npm run preview`
```

Node ≥ 20 (empfohlen 24). Die `.npmrc` setzt `legacy-peer-deps`, weil `@google/model-viewer` noch three 0.183 als Peer angibt.

## Deployment (Vercel, manuell)

```bash
npm i -g vercel
vercel          # Vorschau
vercel --prod   # Produktion
```

`vercel.json` ist vorbereitet (Vite-Framework, `dist/`, Cache-Header für Texturen/HDRI). Es sind keine Umgebungsvariablen nötig.

## Projektstruktur

| Pfad | Inhalt |
| --- | --- |
| `src/model/spec.ts` | **Alle Maße** (mm) mit Quellenangabe – einzige Wahrheit für Geometrie, Bemaßung und Tests |
| `src/model/geometry/` | Bohlenprofil, Wände mit Öffnungen, Tür/Fenster, Dach, Rinne, Unterbau |
| `src/model/materials/` | prozedurales Fichtenholz (Farbe, Normal, Rauheit, Hirnholz), Finish-Logik |
| `src/model/House.tsx` | Zusammenbau, Aufbau-Animation, Tür-Interaktion |
| `src/scene/` | Canvas, HDRI-Garten, Licht, Post-Processing (N8AO, Bloom, Tone-Mapping), Kamera |
| `src/features/` | Bemaßung, AR-Dialog |
| `src/data/` | Katalog (Optionen/Preise), Zustand (zustand), Preislogik |
| `src/embed/bridge.ts` | `postMessage`-API |
| `tests/` | Vitest |

## Lizenzen

Siehe [LICENSE-THIRD-PARTY.md](LICENSE-THIRD-PARTY.md). Texturen/HDRI: CC0 von Poly Haven.
Das Gartenhaus „Bergen“ und die Marke McGarden gehören ihren jeweiligen Inhabern.
