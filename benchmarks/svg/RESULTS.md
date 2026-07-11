# SVG benchmark results

Generated 2026-07-11T22:26:02.774Z. No Frisp result JSON supplied.

All outputs are read from disk and recompressed with Node zlib gzip level 9. W/T/L uses gzip size; ties are within max(4 bytes, 0.1%).

## Overall

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 196 | 3,409,524 | 1,231,893 | 77.34% | 67.67% | 82.63% | 74.73% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 215 | 4,223,045 | 1,479,233 | 85.59% | 77.71% | 93.40% | 83.81% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 215 | 5,146,229 | 1,794,282 | 100.00% | 86.92% | 100.00% | 89.48% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |

## adversarial

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 7 | 882 | 890 | 96.12% | 89.39% | 99.09% | 94.00% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 25 | 3,695 | 3,452 | 97.46% | 91.48% | 99.38% | 95.00% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 25 | 3,316 | 3,150 | 100.00% | 78.83% | 100.00% | 85.22% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |

## editor-exports

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 25 | 11,110 | 7,277 | 63.69% | 57.94% | 65.56% | 66.88% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 25 | 11,234 | 7,331 | 63.69% | 58.49% | 65.56% | 67.31% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 25 | 10,940 | 6,895 | 49.05% | 54.37% | 54.22% | 62.49% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |

## icons-color

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 30 | 25,629 | 12,965 | 64.09% | 65.88% | 68.89% | 69.70% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 30 | 33,075 | 16,339 | 89.21% | 88.35% | 90.02% | 88.72% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 30 | 37,761 | 18,575 | 100.00% | 99.56% | 100.00% | 99.72% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |

## icons-fill

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 40 | 33,630 | 16,191 | 94.16% | 84.28% | 92.51% | 87.29% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 40 | 36,246 | 17,293 | 96.79% | 95.05% | 97.31% | 95.29% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 40 | 38,093 | 17,813 | 99.39% | 98.25% | 95.71% | 95.88% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |

## icons-stroke

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 40 | 15,891 | 10,234 | 82.98% | 83.05% | 93.85% | 93.17% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 40 | 16,131 | 10,365 | 85.07% | 84.14% | 94.19% | 94.20% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 40 | 19,201 | 11,007 | 100.00% | 100.00% | 100.00% | 100.00% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |

## illustrations

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 20 | 19,028 | 10,238 | 41.98% | 42.56% | 55.00% | 53.34% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 20 | 20,439 | 10,969 | 51.56% | 49.03% | 63.23% | 60.23% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 20 | 44,590 | 19,280 | 100.00% | 100.00% | 100.00% | 100.00% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |

## large

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 14 | 3,246,162 | 1,153,832 | 42.34% | 42.40% | 51.96% | 50.27% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 15 | 4,032,646 | 1,387,713 | 46.70% | 50.56% | 64.90% | 60.91% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 15 | 4,925,148 | 1,691,484 | 61.88% | 61.52% | 76.10% | 70.22% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |

## logos

| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| frisp-auto | 20 | 57,192 | 20,266 | 80.70% | 73.28% | 80.20% | 76.70% | frisp-safe: 95/97/4<br>imageoptim: 144/18/34 |
| frisp-safe | 20 | 69,579 | 25,771 | 96.30% | 92.98% | 96.47% | 93.60% | frisp-auto: 4/97/95<br>imageoptim: 119/48/48 |
| imageoptim | 20 | 67,180 | 26,078 | 97.56% | 95.86% | 93.50% | 94.72% | frisp-auto: 34/18/144<br>frisp-safe: 48/48/119 |
