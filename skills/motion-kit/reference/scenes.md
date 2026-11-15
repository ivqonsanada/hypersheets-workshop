# The scenes

Each scene is one `{ … }` in the storyboard's `"scenes"` list. `type` says which scene it is. Limits are in characters, spaces included; the builder counts them for you and says what to shorten. A field marked "needed" must be there; the others may be left out. Leave a field out rather than fill it with something you are not sure of.

The kit lays every scene out by itself, picks one of its layouts from the scene's own words, and sets how long it stays on screen. You never set a size, a colour, a position or a time.

## title (always the first scene)

The opening statement, whole from the first frame.

| Field | Limit | |
|---|---|---|
| `headline` | 44 | needed. The one thing the video is about: a name, a promise, a question |
| `kicker` | 28 | a short line above it: "Halo, aku", "Baru di toko kami", "CSS, step by step" |
| `sub` | 80 | one sentence under it that says who or what |

```json
{ "type": "title", "kicker": "Baru bulan ini", "headline": "Roti sourdough tiap Sabtu", "sub": "Dipanggang pagi, bisa diambil mulai pukul sembilan" }
```

## page

The real page in a window: its address types itself, the page loads, a marker lands on the page's name, the page scrolls to its first list.

| Field | Limit | |
|---|---|---|
| `title` | 26 | needed. "Ini halamanku", "This is the page" |
| `address` | 34 | needed. The page's address without `https://` |
| `file` | | needed. The page's file in this folder, usually `index.html`. The kit copies it and the CSS and pictures it uses |

```json
{ "type": "page", "title": "Ini halaman saya", "address": "wayan-sudiarta.pages.dev", "file": "index.html" }
```

## image

One picture in a frame, with a slow push in. Use it only for a picture file the user has (png, jpg, jpeg, webp). The kit never fetches pictures.

| Field | Limit | |
|---|---|---|
| `file` | | needed. The picture's file in this folder |
| `caption` | 64 | needed. What the picture shows |
| `title` | 26 | a heading above the picture |

```json
{ "type": "image", "file": "roti.jpg", "caption": "Sourdough yang baru keluar dari oven", "title": "Dipanggang tiap pagi" }
```

## list

A heading and two to four lines that land one by one.

| Field | Limit | |
|---|---|---|
| `heading` | 30 | needed |
| `items` | 48 each, 2 to 4 lines | needed. Each line stands alone and starts the same way (all nouns, or all verbs) |

```json
{ "type": "list", "heading": "Yang bisa dipesan", "items": ["Roti tawar gandum", "Sourdough polos dan kismis", "Kue kering untuk hantaran"] }
```

## steps

Numbered steps on a line, lit one after another. Use it when the order matters.

| Field | Limit | |
|---|---|---|
| `heading` | 30 | needed |
| `steps` | 2 to 4 items | needed. Each item is `{ "title": …, "detail": … }` |
| `title` in a step | 28 | needed. What to do, starting with a verb |
| `detail` in a step | 56 | one short line that explains it |

```json
{ "type": "steps", "heading": "Cara pesan", "steps": [
  { "title": "Pilih rotinya", "detail": "Lihat daftar di halaman kami" },
  { "title": "Kirim pesan", "detail": "Sebutkan jumlah dan hari ambil" },
  { "title": "Ambil hari Sabtu", "detail": "Mulai pukul sembilan pagi" } ] }
```

## stat

One number, counted up, and what it means. Only for a real number from the brief.

| Field | Limit | |
|---|---|---|
| `value` | 10 | needed. The number as it should read: "1.250", "87%", "Rp15.000", "3x" |
| `label` | 44 | needed. What the number counts |
| `note` | 48 | where the number comes from, or since when |

```json
{ "type": "stat", "value": "1.250", "label": "roti terjual sejak toko buka", "note": "Catatan toko, 2024 sampai 2026" }
```

## quote

What a real person said, and who. Never write a quote yourself.

| Field | Limit | |
|---|---|---|
| `text` | 150 | needed. Their words, without quote marks |
| `name` | 28 | needed. Who said it |
| `role` | 40 | who they are |

```json
{ "type": "quote", "text": "Rotinya masih hangat waktu saya ambil, dan anak-anak langsung minta lagi.", "name": "Bu Ratna", "role": "Pelanggan sejak 2024" }
```

## compare

Two panels: the first is dimmed when the second arrives. Use it for before and after, or wrong and right.

| Field | Limit | |
|---|---|---|
| `left` | | needed. `{ "label": …, "text": … }`: the old way |
| `right` | | needed. `{ "label": …, "text": … }`: the new way |
| `label` | 14 | needed. "Dulu", "Sekarang", "Before", "After", "Salah", "Benar" |
| `text` | 56 | needed. One line each, written the same way so they compare |
| `heading` | 30 | a heading above both |

```json
{ "type": "compare", "heading": "Cara pesan berubah", "left": { "label": "Dulu", "text": "Telepon dulu, lalu menunggu jawaban" }, "right": { "label": "Sekarang", "text": "Pesan dari halaman, ambil hari Sabtu" } }
```

## code

Real code, typed line by line in a code card. Only for code that runs as written.

| Field | Limit | |
|---|---|---|
| `caption` | 44 | needed. What the code does |
| `lines` | 40 each, 2 to 9 lines | needed. One string per line of code; keep the spaces at the start of a line. Break a longer line in two where the language allows |
| `highlight` | | the number of the line to mark, counted from 1 |
| `lang` | 12 | "CSS", "HTML", "JavaScript" |

```json
{ "type": "code", "caption": "Tiga kolom yang sama lebar", "lang": "CSS", "lines": [".kartu {", "  display: grid;", "  grid-template-columns: repeat(3, 1fr);", "  gap: 16px;", "}"], "highlight": 3 }
```

## end (always the last scene)

Where to go: the address types itself and the button is pressed once.

| Field | Limit | |
|---|---|---|
| `line` | 30 | needed. "Mampir ke halamanku", "Pesan untuk Sabtu ini", "Try it today" |
| `address` | 34 | needed. A page address without `https://`, or a handle like `@dapurmbaktini`. The same address as the page scene |
| `button` | 20 | needed. "Buka halamannya", "Pesan sekarang", "Open the page" |
| `name` | 26 | the name again |

```json
{ "type": "end", "line": "Pesan untuk Sabtu ini", "name": "Dapur Mbak Tini", "address": "dapurmbaktini.pages.dev", "button": "Buka halamannya" }
```
