# Integration in den Shop (Plentymarkets / Ceres)

## Variante A – iframe (empfohlen für den Start)

```html
<iframe
  src="https://DEMO-DOMAIN/?embed=1"
  title="Gartenhaus Bergen 3D-Konfigurator"
  style="width:100%;height:640px;border:0;border-radius:12px"
  allow="xr-spatial-tracking; fullscreen"
  loading="lazy"></iframe>
```

`?embed=1` blendet die Marken-Kachel aus. Mobil klappt der Konfigurator zu einer Leiste zusammen.

### postMessage-API

| Richtung | Nachricht |
| --- | --- |
| Demo → Shop | `{ type: 'mcgarden:ready' }` |
| Demo → Shop | `{ type: 'mcgarden:configChanged', config, price }` bei jeder Änderung |
| Demo → Shop | `{ type: 'mcgarden:addToCart', config, price }` (Klick auf „In den Warenkorb“) |
| Shop → Demo | `{ type: 'mcgarden:setConfig', config: { finish: 'anthrazit', roof: 'epdm', ... } }` |

`config` entspricht `HouseConfig` (`src/data/store.ts`), `price` enthält `lines[]`, `total`, `shipping`.

### „In den Warenkorb“

`src/data/catalog.ts` führt pro Zubehör ein Feld `sku: null`. Dort die Plentymarkets-Variations-IDs eintragen und im
Shop auf `mcgarden:configChanged` reagieren (Basisartikel + gewähltes Paket/Extras in den Warenkorb legen).
Die Preise in der Demo sind **Anzeigewerte**; maßgeblich bleibt der Shop.

## Variante B – direkt im Theme

Das Build (`npm run build`) erzeugt statische Dateien in `dist/`. Sie können auf einer Subdomain oder im Theme-Webspace
liegen; die Einbettung erfolgt dann ebenfalls per iframe oder als Modul-Script mit einem `<div id="root">`.

## Performance-Hinweise

- Erstes Laden: ca. 4 MB Texturen/HDRI + ca. 1,2 MB JS (three/r3f gesplittet), danach gecacht (`Cache-Control: immutable`).
- Qualitätsstufen werden automatisch gesenkt (`PerformanceMonitor`); auf schwachen Geräten entfallen AO und Bloom.
