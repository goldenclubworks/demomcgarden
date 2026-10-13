# Spezifikation Bergen 400 × 300 und Quellenabgleich

Alle Werte in Millimetern, Quelle: Produktseite `gartenhaus-bergen-400-x-300-cm_3342_139515` (Stand 13.10.2026).
Die Maße in `src/model/spec.ts` folgen den **technischen Zeichnungen** (Grundriss, Wand A/B, Seitenwand,
Unterkonstruktion). Wo Textangaben abweichen, ist das unten aufgeführt.

| Größe | Wert | Quelle |
| --- | --- | --- |
| Außenmaß Wände inkl. Eckvorstand | 3980 × 2980 | Grundriss |
| Sockelmaß | 3800 × 2800 | Grundriss / Technische Daten |
| Innenmaß | 3732 × 2732 (→ Wandstärke 34) | Grundriss |
| Nutzfläche | 10,2 m² | Grundriss |
| Wand B (hinten) | 14 Lagen × 139,5 = 1953 + Dachblende 139,5 = **2092,5** | Wand B |
| Seitenwand / vorn | **2244** (Keillage + Dach) | Seitenwand |
| Neigung | atan(151,5 / 2800) ≈ 3,1° | abgeleitet |
| Tür (Öffnung) | 1450 × 2035, 701 mm ab Ecke | Wand A |
| Fenster (Öffnung) | 550 × 1890, ≈ 701 mm bis Ecke | Wand A |
| Dach Breite | 4160 (≈ 90 mm Überstand je Seite) | Wand B |
| Lagerhölzer | 8 Stück, 3800 lang | Unterkonstruktion |
| Material | Nordische Fichte, kammergetrocknet, Blockbohlen, 4-fach Eckausfräsung, Doppelnut/-feder | Qualitätsfaktoren |

## Abweichungen in den Herstellerangaben

- **Wandstärke**: „34 mm“ (Technische Daten) vs. „35 mm“ (Kurzdaten) → 34 mm (passt zum Innenmaß der Zeichnung).
- **Höhe**: Kurzdaten „Höhe Flachdach 220 cm“ vs. „Wandhöhe vorn 224 cm“ → die Zeichnungen (2244) gelten als Gesamthöhe inkl. Dach.
- **Verglasung**: „Einfachverglasung“ (Technische Daten) vs. „Sprossenfenster mit Echtglas“ → als Einfachglas 4 mm modelliert.
- **Garantie**: „5 Jahre“ (Produktseite) vs. „bis zu 10 Jahre“ (Kopfzeile) → nicht in der Demo verwendet.
- **Fenster**: „öffnen nach außen“ (FAQ) vs. „feststehend“ (Lieferumfang) → feststehend.

## Geschätzte Werte (kein Maß in den Quellen)

Fasen und Federhöhe der Bohlen, Querschnitte von Zargen/Flügeln/Blenden, Pfettenquerschnitt, Höhe der Seitenblenden,
Scharnier- und Griffgeometrie. Sie sind in `spec.ts` mit `[E]` markiert und sollten mit dem Hersteller abgestimmt werden.
