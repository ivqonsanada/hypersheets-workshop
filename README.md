# Hyper Sheets Workshop plugin

> **Draf rilis / release draft.** Dua hal masih menunggu keputusan pemilik dan ditandai **(menunggu pemilik)**: nama repo di baris pasang, dan lisensinya. Two things still wait on the owner and are marked **(owner to decide)**: the repo name in the install lines, and the licence.

[Bahasa Indonesia](#bahasa-indonesia) · [English](#english)

## Bahasa Indonesia

Plugin Claude Code untuk jalur-jalur Workshop di [learnhypersheets.com/workshop](https://learnhypersheets.com/workshop).

### Isinya

- **Satu skill, `video-promo`.** Petunjuk teks yang dibaca Claude Code saat kamu meminta video promo untuk halamanmu, ditambah templat video yang Claude Code salin ke folder halamanmu: berkas HTML, CSS, dan JavaScript, satu berkas JSON, dan huruf Finlandica. Hasilnya video tegak 20 detik (1080 x 1920, MP4) yang dibuat dengan [HyperFrames](https://hyperframes.heygen.com) 0.9.51.
- **Tidak ada hook, server MCP, perintah, agen, atau folder `bin/`.** Plugin ini tidak menjalankan apa pun sendiri. Claude Code membaca skill-nya hanya saat kamu meminta video, dan setiap perintah yang ia jalankan tetap melewati permintaan izin Claude Code.
- **Folder `dev/` dan `docs/`** berisi alat uji dan laporan uji untuk pengelola. Karena plugin ini ada di akar repo, kedua folder itu ikut tersalin saat dipasang, tapi Claude Code tidak memuat atau menjalankannya, dan kamu tidak perlu menjalankannya.

### Yang diminta skill-nya di komputermu

Berurutan, dan masing-masing lewat permintaan izin:

1. `cp -R "<folder skill>/template" video`: menyalin templat ke folder `video` di dalam folder halamanmu.
2. `cp index.html video/assets/page/index.html`: menyalin halamanmu (dan gambar atau CSS-nya kalau ada), supaya adegan kedua menampilkan halamanmu yang asli.
3. Perubahan teks di `video/compositions/`, satu per satu. Hanya kata di antara tag yang punya `data-slot`.
4. `npx hyperframes@0.9.51 telemetry disable`: mematikan data pemakaian HyperFrames (lihat di bawah).
5. `npx hyperframes@0.9.51 check video`, lalu `npx hyperframes@0.9.51 snapshot video ...`: memeriksa proyek dan menyimpan lima bingkai diam yang dilihat Claude Code.
6. Menulis `video/REVIEW.md`, lalu `npx hyperframes@0.9.51 render video ...`: membuat `video/promo.mp4`.

Yang memakai internet: `npx` mengunduh `hyperframes@0.9.51` saat pertama dipakai, `npx hyperframes@0.9.51 browser ensure` mengunduh browser tanpa layar untuk merender (sekitar 200 MB), dan saat render templatnya memuat GSAP 3.15.0 dari cdn.jsdelivr.net. Skill ini tidak memakai musik, suara, atau gambar dari internet.

Yang kamu butuhkan: Claude Code, Node.js 22 atau lebih baru, FFmpeg, dan sekitar 200 MB ruang disk.

### Data pemakaian HyperFrames

HyperFrames mengirim data pemakaian ke pembuatnya kecuali dimatikan. Menurut teks bantuannya sendiri (`npx hyperframes@0.9.51 telemetry`), isinya nama perintah, lama dan kualitas render, pilihan templat, sistem operasi, versi Node.js dan versi HyperFrames; email dan nama pengguna HeyGen hanya kalau kamu masuk ke akun HeyGen. Isi video, nama proyek, dan lokasi berkas tidak dikirim.

Skill ini menjalankan `npx hyperframes@0.9.51 telemetry disable` sebelum perintah HyperFrames lainnya. Perintah itu sendiri tidak mengirim apa-apa; ia menyimpan pilihanmu di `~/.hyperframes/config.json`, jadi check, snapshot, dan render sesudahnya tidak mengirim data pemakaian. Panduan jalur video memintamu menjalankannya sendiri dulu, sebelum `doctor`. Cara lain: setel `HYPERFRAMES_NO_TELEMETRY=1` atau `DO_NOT_TRACK=1`. Untuk melihat keadaannya: `npx hyperframes@0.9.51 telemetry status`.

### Memasang

Di Claude Code, ketik dua baris ini, satu per satu:

```text
/plugin marketplace add ivqonsanada/hypersheets-workshop#v0.2.0
/plugin install hypersheets-workshop@hypersheets
```

**(menunggu pemilik)** Nama repo `ivqonsanada/hypersheets-workshop` belum final.

`#v0.2.0` mengunci plugin ke rilis itu. Claude Code menyalin repo di tag tersebut, dan plugin, yang ada di akar repo, diambil dari salinan itu. Jadi yang terpasang persis v0.2.0, juga setelah `/plugin marketplace update`. Pembaruan otomatis mati secara bawaan untuk marketplace ini.

Kunci yang paling ketat: pakai hash commit lengkap (40 karakter) dari tag `v0.2.0` sebagai ganti nama tag. Butuh Claude Code 2.1.324 atau lebih baru.

```text
/plugin marketplace add ivqonsanada/hypersheets-workshop#<hash commit lengkap dari v0.2.0>
```

Bedanya: pemegang repo bisa memindahkan sebuah tag ke commit lain, sedangkan hash commit tidak bisa berubah.

### Melepas

```text
/plugin uninstall hypersheets-workshop@hypersheets
/plugin marketplace remove hypersheets
```

Menghapus marketplace juga melepas plugin yang dipasang darinya. Yang tetap ada di komputermu karena jalurnya sendiri:

- folder `video` di dalam folder halamanmu: hapus sendiri kalau tidak dipakai lagi;
- salinan `hyperframes@0.9.51` di cache `npx`, dan pengaturannya di `~/.hyperframes` (kalau ingin menyalakan lagi data pemakaiannya: `npx hyperframes@0.9.51 telemetry enable`);
- browser HyperFrames di `~/.cache/puppeteer`, yang juga dipakai alat lain berbasis Puppeteer. Hapus hanya kalau tidak ada alat lain yang memakainya.

### Lisensi (menunggu pemilik)

Usulan, menunggu keputusan pemilik: semua isi repo ini memakai Apache-2.0 (`LICENSE`), kecuali huruf di `skills/video-promo/template/assets/fonts/`, yang memakai SIL Open Font License 1.1 (`OFL.txt` di folder itu). Teks pelajaran Workshop, yaitu panduan jalur di learnhypersheets.com, tidak ada di repo ini dan tetap milik Hyper Sheets; lisensi ini tidak mencakupnya. HyperFrames sendiri berlisensi Apache-2.0. GSAP tidak ada di repo ini; templatnya memuat GSAP saat render, dengan lisensi GSAP sendiri.

## English

A Claude Code plugin for the Workshop tracks on [learnhypersheets.com/workshop](https://learnhypersheets.com/workshop).

### What it contains

- **One skill, `video-promo`.** Text instructions Claude Code reads when you ask for a promo video of your page, plus a video template Claude Code copies into your page folder: HTML, CSS and JavaScript files, one JSON file and the Finlandica typeface. The result is a 20-second vertical video (1080 x 1920, MP4) made with [HyperFrames](https://hyperframes.heygen.com) 0.9.51.
- **No hooks, MCP servers, commands, agents or `bin/` folder.** The plugin runs nothing by itself. Claude Code reads the skill only when you ask for a video, and every command it runs still goes through Claude Code's permission prompts.
- **The `dev/` and `docs/` folders** hold the maintainers' trial tools and trial report. Because the plugin sits at the repo root, both are copied when you install it, but Claude Code never loads or runs them, and you never need to run them.

### What the skill asks to do on your computer

In order, each one through a permission prompt:

1. `cp -R "<skill folder>/template" video`: copies the template into a `video` folder inside your page folder.
2. `cp index.html video/assets/page/index.html`: copies your page (and its pictures or CSS, if any), so scene 2 shows your real page.
3. Text edits in `video/compositions/`, one at a time. Only the words between tags that carry `data-slot`.
4. `npx hyperframes@0.9.51 telemetry disable`: turns off HyperFrames' usage data (see below).
5. `npx hyperframes@0.9.51 check video`, then `npx hyperframes@0.9.51 snapshot video ...`: checks the project and saves five still frames for Claude Code to look at.
6. Writing `video/REVIEW.md`, then `npx hyperframes@0.9.51 render video ...`: makes `video/promo.mp4`.

What uses the internet: `npx` downloads `hyperframes@0.9.51` the first time, `npx hyperframes@0.9.51 browser ensure` downloads the headless browser it renders with (about 200 MB), and while rendering, the template loads GSAP 3.15.0 from cdn.jsdelivr.net. The skill uses no music, sound or pictures from the internet.

What you need: Claude Code, Node.js 22 or later, FFmpeg, and about 200 MB of disk.

### HyperFrames usage data

HyperFrames sends usage data to its makers unless it is turned off. By its own help text (`npx hyperframes@0.9.51 telemetry`), that is command names, render time and quality, template choices, operating system, Node.js and HyperFrames versions; your HeyGen email and username only if you sign in to HeyGen. Video content, project names and file paths are not sent.

The skill runs `npx hyperframes@0.9.51 telemetry disable` before any other HyperFrames command. That command sends nothing itself; it saves your choice in `~/.hyperframes/config.json`, so the check, snapshot and render after it send no usage data. The video track's guide asks you to run it yourself first, before `doctor`. Another way: set `HYPERFRAMES_NO_TELEMETRY=1` or `DO_NOT_TRACK=1`. To see where it stands: `npx hyperframes@0.9.51 telemetry status`.

### Install

In Claude Code, type these two lines, one at a time:

```text
/plugin marketplace add ivqonsanada/hypersheets-workshop#v0.2.0
/plugin install hypersheets-workshop@hypersheets
```

**(owner to decide)** The repo name `ivqonsanada/hypersheets-workshop` is not final.

`#v0.2.0` pins the plugin to that release. Claude Code clones the repo at that tag, and the plugin, which sits at the repo root, is taken from that clone. So what you install is exactly v0.2.0, also after `/plugin marketplace update`. Auto-update is off by default for this marketplace.

The strictest pin: use the full 40-character commit hash of the `v0.2.0` tag instead of the tag's name. It needs Claude Code 2.1.324 or later.

```text
/plugin marketplace add ivqonsanada/hypersheets-workshop#<full commit hash of v0.2.0>
```

The difference: whoever controls the repo can move a tag to another commit, while a commit hash cannot change.

### Remove

```text
/plugin uninstall hypersheets-workshop@hypersheets
/plugin marketplace remove hypersheets
```

Removing the marketplace also uninstalls the plugins installed from it. What stays on your computer from the track itself:

- the `video` folder inside your page folder: delete it yourself when you no longer need it;
- the copy of `hyperframes@0.9.51` in the `npx` cache, and its settings in `~/.hyperframes` (to turn its usage data back on: `npx hyperframes@0.9.51 telemetry enable`);
- HyperFrames' browser in `~/.cache/puppeteer`, which other Puppeteer-based tools use too. Delete it only if nothing else needs it.

### Licence (owner to decide)

Proposed, waiting on the owner's decision: everything in this repo under Apache-2.0 (`LICENSE`), except the typeface in `skills/video-promo/template/assets/fonts/`, which is under the SIL Open Font License 1.1 (`OFL.txt` in that folder). The Workshop's lesson text, the track guides on learnhypersheets.com, is not in this repo and stays Hyper Sheets'; this licence does not cover it. HyperFrames itself is Apache-2.0. GSAP is not in this repo; the template loads it while rendering, under GSAP's own licence.

## For reviewers and maintainers

```
.claude-plugin/plugin.json        the plugin (name, version)
.claude-plugin/marketplace.json   the marketplace "hypersheets"; the plugin's source is the repo root, "./"
skills/video-promo/SKILL.md       the only text Claude reads
skills/video-promo/template/      the video project Claude copies; it renders as is
dev/                              the Haiku trial tools (learners never run them)
docs/TRIAL-2026-11-15.md          the trial report: rubric, runs, tokens and cost
```

- The `.js` files next to each scene in `template/compositions/` are the video's timeline. They run inside HyperFrames' headless browser while it checks, snapshots and renders. From v0.2 the page scene also reads the learner's copied page in `video/assets/page/`, in an unseen second frame, to take its colour and to find where the name and the list sit; nothing leaves the computer.
- `claude plugin validate .` checks both manifests.
- A new release: raise `version` in `.claude-plugin/plugin.json`, tag the commit `vX.Y.Z`, and change the tag in the track guides. Claude Code replaces an installed copy only when that version changes.
