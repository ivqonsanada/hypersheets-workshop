# The scenes

Each scene is one `{ … }` in the storyboard's `"scenes"` list. `type` says which scene it is. Limits are in characters, spaces included; the builder counts them for you and says what to shorten. A field marked "needed" must be there; the others may be left out. Leave a field out rather than fill it with something you are not sure of.

The kit lays every scene out by itself and sets how long it stays on screen. You never set a size, a colour, a position or a time. The title, list, stat, quote and end scenes each have two layouts: the kit picks one and keeps it when you build again, so a revision changes only what was asked. Only when the user asks for the other layout, add `"variant": 1` or `"variant": 2` to that scene.

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

One picture in a frame of the picture's own shape, with a slow push in. Use it only for a picture file the user has (png, jpg, jpeg, webp). The kit never fetches pictures. A video may hold up to three image scenes, one picture each: for a before and an after, give the first the `title` "Sebelum" and the second "Sesudah"; for products, give each its name as the `title` and its price in the `caption`.

| Field | Limit | |
|---|---|---|
| `file` | | needed. The picture's file in this folder |
| `caption` | 64 | optional when there is a `title`. Something the picture does not say by itself: its price, where it was taken. Leave it out before writing "Monstera dalam pot" under a picture titled "Monstera" |
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

## prices

A menu or a price list: each name is led across to its price. Use it whenever the brief gives things with prices; never write prices into list lines.

| Field | Limit | |
|---|---|---|
| `heading` | 30 | needed. "Menu kami", "Harga minggu ini", "Pilihan paket" |
| `rows` | 2 to 6 items | needed. Each item is `{ "name": …, "price": … }` |
| `name` in a row | 28 | needed. What is sold: "Nasi ayam goreng", "Paket Hemat" |
| `price` in a row | 12 | needed. The price alone, as the brief writes it: "Rp15.000", "Rp1.250.000" |
| `was` in a row | 12 | the old price, when the brief gives one. It is shown struck through beside the new price |
| `note` | 48 | one small line under the rows: "Harga per porsi", "Sudah termasuk pot" |

More than six things with prices: keep the six that matter most to the brief, and tell the user which you left out.

```json
{ "type": "prices", "heading": "Roti minggu ini", "rows": [
  { "name": "Sourdough polos", "price": "Rp38.000" },
  { "name": "Roti gandum", "price": "Rp24.000", "was": "Rp28.000" },
  { "name": "Kue kering toples", "price": "Rp55.000" } ], "note": "Harga per buah" }
```

## info

The facts someone needs to come or to get in touch, each under its own small label: a date, the hours, a place, a deadline, a number. Use it for an event, an opening, opening hours, a vacancy. These facts are not steps and not a numbered list.

| Field | Limit | |
|---|---|---|
| `heading` | 30 | needed. "Catat tanggalnya", "Kapan dan di mana", "Jam buka" |
| `rows` | 2 to 4 items | needed. Each item is `{ "label": …, "text": … }` |
| `label` in a row | 14 | needed. One or two words: "Hari", "Jam", "Tempat", "Sampai", "Biaya", "Daftar" |
| `text` in a row | 48 | needed. The fact, whole: "Sabtu, 13 Desember 2026", "08.00 sampai 14.00", "Lapangan RW 05, Kampung Wetan" |

```json
{ "type": "info", "heading": "Catat tanggalnya", "rows": [
  { "label": "Hari", "text": "Sabtu, 6 Desember 2026" },
  { "label": "Jam", "text": "07.00 sampai 15.00" },
  { "label": "Tempat", "text": "Jalan Kenari 12, Bandung" } ] }
```

## numbers

Two to four numbers, each counted up over its label. Use it for a recap or a result with several real numbers. One number alone is a `stat`.

| Field | Limit | |
|---|---|---|
| `heading` | 30 | needed. "Tahun 2026 kami", "Sejauh ini" |
| `items` | 2 to 4 items | needed. Each item is `{ "value": …, "label": … }` |
| `value` in an item | 12 | needed. The number as the brief writes it: "340", "Rp8.500.000", "87%" |
| `label` in an item | 32 | needed. What it counts: "peserta", "donasi untuk pos ronda" |

```json
{ "type": "numbers", "heading": "Setahun toko kami", "items": [
  { "value": "1.250", "label": "roti terjual" },
  { "value": "48", "label": "pesanan hantaran" },
  { "value": "3", "label": "varian baru" } ] }
```

## steps

Numbered steps on a line, lit one after another. Only for things done in order (first this, then that). Opening hours, an address, ways to reach a shop or a set of choices are not steps: they have no order.

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
| `value` | 12 | needed. The number as it should read: "1.250", "87%", "Rp15.000", "Rp1.250.000", "3x" |
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
| `lines` | 72 each, 1 to 9 lines | needed. One string per line of code, copied as the user wrote it; keep the spaces at the start of a line. Never break a line yourself: a line longer than 40 characters continues on a second row in the card, set in a little. Short lines are set larger, so show only the lines the point needs |
| `highlight` | | the number of the line to mark, counted from 1 |
| `lang` | 12 | "CSS", "HTML", "JavaScript" |

```json
{ "type": "code", "caption": "Tiga kolom yang sama lebar", "lang": "CSS", "lines": [".kartu {", "  display: grid;", "  grid-template-columns: repeat(3, 1fr);", "  gap: 16px;", "}"], "highlight": 3 }
```

## fix

A mistake and its fix: the wrong code is typed in a card and steps back, then the right code is typed in a card under it with the changed line marked. Use it when the brief shows code that goes wrong and the code that puts it right. The kit writes the two labels ("Salah" and "Benar", or "Wrong" and "Right").

| Field | Limit | |
|---|---|---|
| `caption` | 44 | needed. What goes wrong, or the rule that fixes it |
| `wrong` | 72 each, 1 to 4 lines | needed. The code as it was, copied letter for letter, mistake included |
| `right` | 72 each, 1 to 4 lines | needed. The same code, put right. Keep the lines that did not change exactly as they are in `wrong`, so the kit marks only the line that did |
| `highlight` | | the number of the line in `right` to mark, counted from 1. Leave it out and the kit marks the lines that changed |
| `lang` | 12 | "CSS", "HTML", "JavaScript" |

```json
{ "type": "fix", "caption": "Angka dalam tanda kutip itu teks", "lang": "JavaScript", "wrong": ["const harga = \"15000\";", "const total = harga + 2000;"], "right": ["const harga = Number(\"15000\");", "const total = harga + 2000;"] }
```

## end (always the last scene)

Where to go: the address types itself and the button is pressed once.

| Field | Limit | |
|---|---|---|
| `line` | 30 | needed. "Mampir ke halamanku", "Pesan untuk Sabtu ini", "Try it today" |
| `address` | 34 | needed. A page address without `https://`, a handle like `@dapurmbaktini`, an email, or a phone or WhatsApp number written as the brief writes it (`0811-0000-142`). A shop with none of these may give its street address ("Jalan Mawar 3, Kartasura"). With a page scene, the same address as the page scene |
| `button` | 20 | needed. "Buka halamannya", "Pesan sekarang", "Open the page" |
| `name` | 26 | the name again |

```json
{ "type": "end", "line": "Pesan untuk Sabtu ini", "name": "Dapur Mbak Tini", "address": "dapurmbaktini.pages.dev", "button": "Buka halamannya" }
```
