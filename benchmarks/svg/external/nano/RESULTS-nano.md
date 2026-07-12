# Frisp vs vecta.io/nano — SVG output size

Date: 2026-07-12. nano run via vecta.io/nano (client-side compressor, results are nano's own reported output sizes; verified exact for <1KB files, ±~51B rounding for KB-range). Frisp numbers from frisp-9d6eed19.json (exact raw bytes). Comparison is RAW output bytes (nano's headline metric; nano's download is a data:URI the sandbox can't capture for gzip, so gzip/chain legs were not run — see notes).

Sample: 57 files across 6 strata (stratified from the 215-file corpus). "auto" = Frisp Auto mode (visually-gated candidate search); "safe" = Frisp default preset.

## Overall

| Tool | Total output | Reduction vs input | vs nano (W/T/L) |
|---|---:|---:|---|
| input | 65052 B | — | — |
| **nano** | 47885 B | 26.4% | — |
| **Frisp auto** | 37834 B | 41.8% | 28/2/27 |
| **Frisp safe** | 48965 B | 24.7% | 16/3/38 |

## Per stratum (Frisp auto vs nano)

| Stratum | n | input | nano | auto | nano red. | auto red. | auto vs nano W/T/L |
|---|--:|--:|--:|--:|--:|--:|---|
| icons-stroke | 10 | 4683 | 2661 | 3809 | 43.2% | 18.7% | 0/0/10 |
| icons-color | 10 | 11935 | 10991 | 7882 | 7.9% | 34.0% | 10/0/0 |
| icons-fill | 10 | 5505 | 5129 | 4647 | 6.8% | 15.6% | 3/1/6 |
| logos | 8 | 15847 | 14847 | 7777 | 6.3% | 50.9% | 4/1/3 |
| editor-exports | 9 | 6369 | 3540 | 4042 | 44.4% | 36.5% | 2/0/7 |
| illustrations | 10 | 20713 | 10717 | 9677 | 48.3% | 53.3% | 9/0/1 |

## Per-file detail

| File | input | nano | Frisp auto | Frisp safe |
|---|--:|--:|--:|--:|
| icons-stroke/tabler-player-play.svg | 363 | 192 | 321 | 321 |
| icons-stroke/tabler-stack.svg | 398 | 214 | 333 | 333 |
| icons-stroke/tabler-code.svg | 412 | 216 | 337 | 337 |
| icons-stroke/tabler-anchor.svg | 444 | 253 | 377 | 377 |
| icons-stroke/tabler-bell.svg | 468 | 297 | 407 | 407 |
| icons-stroke/tabler-eye.svg | 473 | 285 | 382 | 382 |
| icons-stroke/tabler-music.svg | 482 | 265 | 400 | 400 |
| icons-stroke/tabler-link.svg | 515 | 303 | 411 | 420 |
| icons-stroke/tabler-calendar.svg | 542 | 296 | 408 | 408 |
| icons-stroke/tabler-aperture.svg | 586 | 340 | 433 | 450 |
| icons-color/twemoji-1f499.svg | 368 | 363 | 207 | 367 |
| icons-color/twemoji-1f600.svg | 450 | 434 | 415 | 448 |
| icons-color/twemoji-1f680.svg | 677 | 654 | 485 | 625 |
| icons-color/twemoji-1f604.svg | 920 | 845 | 519 | 753 |
| icons-color/twemoji-1f605.svg | 1010 | 925 | 594 | 842 |
| icons-color/twemoji-1f621.svg | 1070 | 909 | 512 | 881 |
| icons-color/twemoji-1f30d.svg | 1156 | 1126~ | 945 | 1106 |
| icons-color/twemoji-1f914.svg | 1573 | 1434~ | 1183 | 1487 |
| icons-color/twemoji-1f618.svg | 2224 | 2048~ | 1201 | 1831 |
| icons-color/twemoji-1f973.svg | 2487 | 2253~ | 1821 | 2194 |
| icons-fill/material-play_arrow.svg | 114 | 94 | 114 | 114 |
| icons-fill/material-home.svg | 136 | 116 | 136 | 136 |
| icons-fill/material-star.svg | 189 | 169 | 172 | 189 |
| icons-fill/material-place.svg | 215 | 195 | 203 | 213 |
| icons-fill/material-visibility.svg | 310 | 290 | 238 | 307 |
| icons-fill/material-account_circle.svg | 328 | 308 | 323 | 323 |
| icons-fill/simple-apple.svg | 650 | 619 | 374 | 639 |
| icons-fill/simple-javascript.svg | 974 | 880 | 942 | 942 |
| icons-fill/simple-figma.svg | 1093 | 1024~ | 1050 | 1050 |
| icons-fill/simple-svelte.svg | 1496 | 1434~ | 1095 | 1358 |
| logos/devicon-tensorflow-original.svg | 291 | 243 | 243 | 243 |
| logos/devicon-vuejs-original.svg | 561 | 269 | 316 | 559 |
| logos/devicon-angularjs-original.svg | 621 | 621 | 450 | 595 |
| logos/simple-github.svg | 822 | 753 | 811 | 811 |
| logos/simple-inkscape.svg | 1036 | 956 | 1021 | 1021 |
| logos/simple-cloudflare.svg | 1178 | 946 | 624 | 867 |
| logos/devicon-react-original.svg | 2387 | 2355~ | 1707 | 2348 |
| logos/devicon-kubernetes-original.svg | 8951 | 8704~ | 2605 | 8213 |
| editor-exports/illustrator-01.svg | 525 | 218 | 334 | 334 |
| editor-exports/illustrator-04.svg | 526 | 219 | 335 | 335 |
| editor-exports/illustrator-07.svg | 526 | 219 | 335 | 335 |
| editor-exports/inkscape-02.svg | 665 | 200 | 264 | 264 |
| editor-exports/inkscape-05.svg | 667 | 202 | 238 | 266 |
| editor-exports/inkscape-08.svg | 667 | 202 | 266 | 266 |
| editor-exports/figma-02.svg | 930 | 759 | 751 | 770 |
| editor-exports/figma-05.svg | 931 | 760 | 752 | 771 |
| editor-exports/figma-08.svg | 932 | 761 | 767 | 772 |
| illustrations/healthicons-ambulatory-clinic.svg | 529 | 359 | 340 | 374 |
| illustrations/healthicons-group-discussion_meeting.svg | 1037 | 569 | 439 | 594 |
| illustrations/healthicons-cpr.svg | 1206 | 678 | 502 | 641 |
| illustrations/healthicons-clean-hands.svg | 1345 | 726 | 676 | 791 |
| illustrations/healthicons-crisis-response_center_person.svg | 1807 | 886 | 732 | 867 |
| illustrations/healthicons-construction-worker.svg | 2041 | 945 | 767 | 916 |
| illustrations/healthicons-child-care.svg | 2247 | 1229~ | 845 | 1041 |
| illustrations/healthicons-doctor-female.svg | 2656 | 1331~ | 833 | 1492 |
| illustrations/healthicons-elderly.svg | 2808 | 1229~ | 1082 | 1249 |
| illustrations/healthicons-child-cognition.svg | 5037 | 2765~ | 3461 | 2590 |

(~ = nano value rounded to 0.1KB, ±~51B)
