# Hyper Sheets Workshop plugin

> **Draf rilis / release draft.** Dua hal masih menunggu keputusan pemilik dan ditandai **(menunggu pemilik)**: nama repo di baris pasang, dan lisensinya. Two things still wait on the owner and are marked **(owner to decide)**: the repo name in the install lines, and the licence.

[Bahasa Indonesia](#bahasa-indonesia) · [English](#english)

## Bahasa Indonesia

Plugin Claude Code untuk jalur-jalur Workshop di [learnhypersheets.com/workshop](https://learnhypersheets.com/workshop).

### Isinya

- **Dua skill.** Yang pertama, `video-promo`: petunjuk teks yang dibaca Claude Code saat kamu meminta video promo untuk halamanmu, ditambah templat video yang Claude Code salin ke folder halamanmu: berkas HTML, CSS, dan JavaScript, satu berkas JSON, dan huruf Finlandica. Hasilnya video tegak 20 detik (1080 x 1920, MP4) yang dibuat dengan [HyperFrames](https://hyperframes.heygen.com) 0.9.51.
- **Yang kedua, `motion-kit`.** Petunjuk teks yang dibaca Claude Code saat kamu meminta video pendek dari sebuah brief (promo, pengumuman, menu atau daftar harga, tanya jawab, rekap dalam angka, penjelasan, tips, kode, testimoni, sebelum dan sesudah), ditambah sebuah kit: tujuh belas adegan jadi (judul, halaman, gambar, foto sebelum dan sesudah, daftar, daftar harga, info, tanggal, beberapa angka, langkah, satu angka, kutipan, tanya jawab, perbandingan, kode, kode salah dan benar, penutup), tiga tampilan, skrip Node tanpa dependensi (`kit/build.mjs`, `kit/stills.mjs`, `kit/sound.mjs`, dan lapisan suara di `kit/sound/`), sepuluh contoh storyboard, 87 bunyi efek, dan empat huruf berlisensi OFL. Claude Code hanya menulis satu berkas, `storyboard.json`: kata-katanya, urutan adegan, dan tampilan. Tata letak, warna, gerak, dan efek suara sudah ada di kit, jadi model kecil seperti Haiku 5.5 pun cukup. Hasilnya video tegak 10 sampai 30 detik (1080 x 1920, MP4) dengan efek suara, dan dengan narasi kalau kamu memintanya. Videonya dirakit dari kit ini, bukan dirancang dari nol oleh AI.
- **Tidak ada hook, server MCP, perintah, agen, atau folder `bin/`.** Plugin ini tidak menjalankan apa pun sendiri. Claude Code membaca sebuah skill hanya saat kamu meminta video, dan setiap perintah yang ia jalankan tetap melewati permintaan izin Claude Code.
- **Folder `dev/` dan `docs/`** berisi alat uji dan laporan uji untuk pengelola. Karena plugin ini ada di akar repo, kedua folder itu ikut tersalin saat dipasang, tapi Claude Code tidak memuat atau menjalankannya, dan kamu tidak perlu menjalankannya.

### Yang diminta `video-promo` di komputermu

Berurutan, dan masing-masing lewat permintaan izin:

1. `cp -R "<folder skill>/template" video`: menyalin templat ke folder `video` di dalam folder halamanmu.
2. `cp index.html video/assets/page/index.html`: menyalin halamanmu (dan gambar atau CSS-nya kalau ada), supaya adegan kedua menampilkan halamanmu yang asli.
3. Perubahan teks di `video/compositions/`, satu per satu. Hanya kata di antara tag yang punya `data-slot`.
4. `npx hyperframes@0.9.51 telemetry disable`: mematikan data pemakaian HyperFrames (lihat di bawah).
5. `npx hyperframes@0.9.51 check video`, lalu `npx hyperframes@0.9.51 snapshot video ...`: memeriksa proyek dan menyimpan lima bingkai diam yang dilihat Claude Code.
6. Menulis `video/REVIEW.md`, lalu `npx hyperframes@0.9.51 render video ...`: membuat `video/promo.mp4`.

### Yang diminta `motion-kit` di komputermu

Berurutan, dan masing-masing lewat permintaan izin:

1. Menulis `storyboard.json` di foldermu: isi videonya.
2. `node "<folder skill>/kit/build.mjs" storyboard.json`: memeriksa storyboard (panjang tiap teks, isian yang wajib ada, berkas yang disebut, susunan adegan) dan menulis proyek HyperFrames ke folder `video`. Kalau ada yang salah, ia hanya mencetak daftar perbaikan, satu kalimat per masalah, dan tidak menulis apa-apa. Ia menyalin halaman atau gambarmu ke `video/assets/`, memasang efek suara video itu ke `video/assets/audio/mix.wav`, tidak memakai internet, tidak menulis di luar `video`, dan menolak menimpa folder `video` yang bukan buatannya. Satu-satunya program lain yang ia jalankan adalah FFmpeg, kalau ada, untuk mengukur kekerasan suaranya.
3. `node "<folder skill>/kit/stills.mjs"`: menjalankan `npx hyperframes@0.9.51 telemetry disable`, lalu `npx hyperframes@0.9.51 snapshot` dua kali, dan menulis `video/frames/` serta `video/sheet.png`: satu lembar berisi satu bingkai tiap adegan, dengan kalimat di bawahnya tentang apa yang seharusnya terlihat. Label dan kalimat itu mengikuti bahasa videonya: `BINGKAI 1 · 1,94 dtk · adegan 1 (title)` dan `Seharusnya tampil: ...` untuk video berbahasa Indonesia, `FRAME 1 · 1.94 s · scene 1 (title)` dan `Should show: ...` untuk video berbahasa Inggris.
4. Menulis `video/REVIEW.md`.
5. Hanya kalau kamu meminta narasi: `node "<folder skill>/kit/sound.mjs"`. Ia membuat tiap kalimat narasi, lalu menjalankan `kit/build.mjs` lagi supaya tiap adegan cukup panjang untuk kalimatnya. Ia tidak mengunduh apa-apa (lihat "Suara di `motion-kit`").
6. `npx hyperframes@0.9.51 render video --quality standard --workers 1 -o video/video.mp4`: membuat videonya.

Videonya punya efek suara. Narasi hanya ada kalau kamu memintanya, dan musik hanya kalau kamu memberi berkas musikmu sendiri. Setiap nama, angka, kutipan, dan alamat di video berasal dari brief atau berkasmu; kalau brief tidak punya angka atau kutipan, adegan itu tidak dipakai.

### Suara di `motion-kit`

**Efek suara** sudah ada di setiap video. `kit/build.mjs` memasangnya sendiri setiap kali dijalankan: bunyi kecil saat judul masuk, saat butir daftar muncul, saat tombol ditekan, saat adegan berganti. Bunyinya ikut tampilan videonya: `warnet` bunyi 8-bit, `kertas` bunyi kertas dan buku, `panggung` bunyi kayu dan logam. Tidak ada yang diunduh untuk ini; 87 berkas bunyinya (1,7 MB) ada di dalam plugin. Kalau kamu mau video tanpa suara, bilang saja, dan Claude Code menulis `"sound": "off"` di storyboard.

**Narasi** hanya dibuat kalau kamu memintanya. Pilihannya:

| Kamu minta | Yang dipakai | Unduhan | Boleh dipakai untuk |
|---|---|---|---|
| narasi bahasa Indonesia, suara ringan | Piper `news_tts` | 41 MB | latihan dan pemakaian non-komersial |
| narasi bahasa Inggris, suara ringan | KittenTTS nano 0.8 | 52 MB | apa saja, termasuk video yang dijual |
| suara Inggris yang lebih bagus di komputermu | Kokoro 82M v1.0 | 370 MB | apa saja, termasuk video yang dijual |
| ElevenLabs | akun ElevenLabs-mu sendiri | tidak ada | tergantung paketmu di ElevenLabs |
| suaramu sendiri | rekamanmu, satu berkas per kalimat | tidak ada | apa saja: itu suaramu |
| draf cepat di Mac | suara bawaan macOS | tidak ada | mengecek tempo saja, bukan untuk dipublikasikan |

Ukuran itu sudah termasuk program suaranya (20 MB di Mac), yang hanya diunduh sekali; suara kedua jadi lebih kecil.

Skripnya, semuanya Node tanpa dependensi:

- `kit/sound.mjs`: satu-satunya perintah tambahan untuk video bernarasi (langkah 5 di atas). Kalau suaranya belum ada di komputermu, atau berkas ElevenLabs dan rekamanmu belum ada, ia berhenti dan menyebut apa yang kurang.
- `kit/sound/voice.mjs` dan `kit/sound/mix.mjs`: yang bekerja di belakang `sound.mjs` dan `build.mjs`. `voice.mjs` membuat satu berkas WAV per adegan di `video/voice/` dan, kalau `whisper-cli` ada, mengecek tiap kalimat dengan mendengarkannya. `mix.mjs` menggabungkan efek, narasi, dan musik menjadi satu berkas suara pada -16 LUFS dengan puncak di bawah -1,5 dBTP; efek saja, yang pendek dan jarang, dibiarkan lebih pelan.
- `kit/sound/device.mjs`: melihat komputermu (memori, inti prosesor, sisa disk) dan menyebut suara mana yang cocok. Tidak memasang apa-apa.
- `kit/sound/install.mjs`: satu-satunya skrip yang mengunduh.

**Yang diunduh `install.mjs`, dan dari mana.** Hanya yang tercatat di `kit/sound/engines.json`, dan tiap berkas dicek dengan SHA-256 sebelum dipakai:

- program suara sherpa-onnx 1.13.8 (20 MB di Mac, 25 MB di Windows, 28 MB di Linux), dari halaman rilisnya di github.com/k2-fsa/sherpa-onnx;
- berkas suara yang dipilih (Piper `news_tts` 21 MB, KittenTTS 31 MB, Kokoro 350 MB), dari halaman rilis yang sama;
- hanya kalau kamu menjalankannya sendiri dengan `install.mjs whisper`: model whisper 190 MB dari huggingface.co/ggerganov/whisper.cpp, untuk pengecekan kalimat.

Semuanya disimpan di `~/.hypersheets/sound`, di luar foldermu. Program dan suaranya tidak ikut di dalam plugin ini. `engines.json` juga mencatat dua suara yang tidak ditawarkan kit, Piper Kristin dan Supertonic 3; `install.mjs list` menampilkan semuanya.

**Claude Code tidak memasang suara tanpa izinmu.** Kalau suara yang diminta belum ada, ia berhenti dan bertanya dulu, lengkap dengan nama suara, ukuran unduhan, sumber, dan folder tujuannya, misalnya: "Suara Piper news_tts belum ada di komputermu. Kalau kamu setuju, aku unduh 41 MB dari github.com ke folder ~/.hypersheets/sound, dan tidak mengunduh yang lain. Boleh aku unduh sekarang?" `install.mjs` baru dijalankan setelah kamu menjawab ya. ElevenLabs dan suaramu sendiri tidak perlu unduhan.

**ElevenLabs.** Tanpa kunci, kit mencetak tiap kalimat dan nama berkasnya (`my-voice/1.mp3`, `my-voice/2.mp3`, sesuai nomor adegan); kamu membuatnya di elevenlabs.io dan menyimpannya di sana. Kalau kamu punya kunci API, setel sendiri `ELEVENLABS_API_KEY` dan `ELEVENLABS_VOICE_ID` di shell sebelum membuka Claude Code: kit membacanya dari sana, mengirimnya hanya ke elevenlabs.io bersama teks kalimatnya, dan tidak pernah menulis atau menampilkannya. Jalur kunci ini belum diuji dengan layanan aslinya. Claude Code tidak akan meminta kuncimu di percakapan.

**Lisensi suara dan bunyi**

| Apa | Lisensi | Sumber |
|---|---|---|
| Efek suara rekaman (palet `soft`, `paper`, `bold`) | CC0, dari paket audio Kenney | kenney.nl; tiap berkas tercatat di `kit/sound/sfx/SOURCES.md` |
| Efek suara 8-bit (palet `pixel`) dan desis | buatan synthesizer kit ini sendiri | `kit/sound/dev/synth.mjs` |
| Program suara sherpa-onnx 1.13.8 | Apache-2.0, dengan espeak-ng (GPL-3.0-or-later) di dalamnya. Diunduh dari pembuatnya, tidak dibagikan oleh plugin ini | github.com/k2-fsa/sherpa-onnx |
| Piper `id_ID-news_tts-medium` | tidak ada lisensi yang tertulis untuk suara ini; kit memperlakukannya sebagai suara latihan, non-komersial | huggingface.co/rhasspy/piper-voices |
| KittenTTS nano 0.8 | Apache-2.0 | huggingface.co/KittenML/kitten-tts-nano-0.8 |
| Kokoro 82M v1.0 | Apache-2.0 | huggingface.co/hexgrad/Kokoro-82M |
| Whisper small (opsional) | MIT | huggingface.co/ggerganov/whisper.cpp |
| ElevenLabs | Syarat Layanan ElevenLabs, tergantung paketmu | elevenlabs.io/terms-of-use |
| Suara bawaan macOS | lisensi macOS: untuk pemakaian pribadi, bukan untuk dipublikasikan | apple.com/legal/sla |

**Dua pemberitahuan** yang ditampilkan kit saat suaranya dipakai, dan ditulis ke `video/voice/NOTICE.txt`:

- Piper bahasa Indonesia: "Suara ini untuk latihan dan pemakaian non-komersial. Untuk video yang dijual atau dipakai klien, pakai suaramu sendiri atau ElevenLabs."
- ElevenLabs: "Paket gratis ElevenLabs hanya untuk pemakaian non-komersial dan wajib menulis "elevenlabs.io" di judul; untuk video yang dijual atau dipakai klien perlu paket berbayar."

Belum ada orang yang mendengarkan suara dan bunyi ini. Yang diukur: kekerasan, puncak, ketepatan waktu, dan apakah pendengar otomatis (whisper) menangkap kalimatnya. Enak atau tidaknya di telinga, kamu yang menilai. Rinciannya ada di `docs/SOUND.md`.

### Internet dan yang kamu butuhkan

Yang memakai internet: `npx` mengunduh `hyperframes@0.9.51` saat pertama dipakai, `npx hyperframes@0.9.51 browser ensure` mengunduh browser tanpa layar untuk merender (sekitar 200 MB), dan saat render videonya memuat GSAP 3.15.0 dari cdn.jsdelivr.net. Kedua skill tidak mengunduh musik atau gambar. Suara narasi diunduh hanya setelah kamu mengizinkannya, dan dengan kunci ElevenLabs teks narasinya dikirim ke elevenlabs.io (lihat "Suara di `motion-kit`").

Yang kamu butuhkan: Claude Code, Node.js 22 atau lebih baru, FFmpeg, dan sekitar 200 MB ruang disk.

### Data pemakaian HyperFrames

HyperFrames mengirim data pemakaian ke pembuatnya kecuali dimatikan. Menurut teks bantuannya sendiri (`npx hyperframes@0.9.51 telemetry`), isinya nama perintah, lama dan kualitas render, pilihan templat, sistem operasi, versi Node.js dan versi HyperFrames; email dan nama pengguna HeyGen hanya kalau kamu masuk ke akun HeyGen. Isi video, nama proyek, dan lokasi berkas tidak dikirim.

Skill ini menjalankan `npx hyperframes@0.9.51 telemetry disable` sebelum perintah HyperFrames lainnya. Perintah itu sendiri tidak mengirim apa-apa; ia menyimpan pilihanmu di `~/.hyperframes/config.json`, jadi check, snapshot, dan render sesudahnya tidak mengirim data pemakaian. Panduan jalur video memintamu menjalankannya sendiri dulu, sebelum `doctor`. Cara lain: setel `HYPERFRAMES_NO_TELEMETRY=1` atau `DO_NOT_TRACK=1`. Untuk melihat keadaannya: `npx hyperframes@0.9.51 telemetry status`.

### Memasang

Di Claude Code, ketik dua baris ini, satu per satu:

```text
/plugin marketplace add ivqonsanada/hypersheets-workshop#v0.5.1
/plugin install hypersheets-workshop@hypersheets
```

**(menunggu pemilik)** Nama repo `ivqonsanada/hypersheets-workshop` belum final.

`#v0.5.1` mengunci plugin ke rilis itu. Claude Code menyalin repo di tag tersebut, dan plugin, yang ada di akar repo, diambil dari salinan itu. Jadi yang terpasang persis v0.5.1, juga setelah `/plugin marketplace update`. Pembaruan otomatis mati secara bawaan untuk marketplace ini.

Kunci yang paling ketat: pakai hash commit lengkap (40 karakter) dari tag `v0.5.1` sebagai ganti nama tag. Butuh Claude Code 2.1.324 atau lebih baru.

```text
/plugin marketplace add ivqonsanada/hypersheets-workshop#<hash commit lengkap dari v0.5.1>
```

Bedanya: pemegang repo bisa memindahkan sebuah tag ke commit lain, sedangkan hash commit tidak bisa berubah.

### Melepas

```text
/plugin uninstall hypersheets-workshop@hypersheets
/plugin marketplace remove hypersheets
```

Menghapus marketplace juga melepas plugin yang dipasang darinya. Yang tetap ada di komputermu karena jalurnya sendiri:

- folder `video` di dalam folder halamanmu: hapus sendiri kalau tidak dipakai lagi;
- suara yang pernah kamu izinkan untuk diunduh, di `~/.hypersheets/sound`: hapus folder itu kalau tidak dipakai lagi;
- salinan `hyperframes@0.9.51` di cache `npx`, dan pengaturannya di `~/.hyperframes` (kalau ingin menyalakan lagi data pemakaiannya: `npx hyperframes@0.9.51 telemetry enable`);
- browser HyperFrames di `~/.cache/puppeteer`, yang juga dipakai alat lain berbasis Puppeteer. Hapus hanya kalau tidak ada alat lain yang memakainya.

### Lisensi (menunggu pemilik)

Usulan, menunggu keputusan pemilik: semua isi repo ini memakai Apache-2.0 (`LICENSE`), kecuali huruf di `skills/video-promo/template/assets/fonts/` dan `skills/motion-kit/kit/runtime/fonts/` (Finlandica, Fraunces, Big Shoulders Display, JetBrains Mono), yang memakai SIL Open Font License 1.1 (berkas `OFL*.txt` di tiap folder), dan bunyi efek di `skills/motion-kit/kit/sound/sfx/`, yang rekamannya CC0 dari Kenney (`SOURCES.md` di folder itu). Program dan berkas suara narasi tidak ada di repo ini; lisensinya ada di tabel "Lisensi suara dan bunyi". Teks pelajaran Workshop, yaitu panduan jalur di learnhypersheets.com, tidak ada di repo ini dan tetap milik Hyper Sheets; lisensi ini tidak mencakupnya. HyperFrames sendiri berlisensi Apache-2.0. GSAP tidak ada di repo ini; templatnya memuat GSAP saat render, dengan lisensi GSAP sendiri.

## English

A Claude Code plugin for the Workshop tracks on [learnhypersheets.com/workshop](https://learnhypersheets.com/workshop).

### What it contains

- **Two skills.** The first, `video-promo`: text instructions Claude Code reads when you ask for a promo video of your page, plus a video template Claude Code copies into your page folder: HTML, CSS and JavaScript files, one JSON file and the Finlandica typeface. The result is a 20-second vertical video (1080 x 1920, MP4) made with [HyperFrames](https://hyperframes.heygen.com) 0.9.51.
- **The second, `motion-kit`.** Text instructions Claude Code reads when you ask for a short video from a brief (promo, announcement, menu or price list, questions and answers, recap in numbers, explainer, tips, code, testimonial, before and after), plus a kit: seventeen ready-made scenes (title, page, image, before and after photos, list, price list, info, date, several numbers, steps, one number, quote, questions and answers, compare, code, wrong and right code, end), three looks, Node scripts with no dependencies (`kit/build.mjs`, `kit/stills.mjs`, `kit/sound.mjs` and the sound layer in `kit/sound/`), ten example storyboards, 87 sound effects and four typefaces under the OFL. Claude Code writes one file only, `storyboard.json`: the words, the order of the scenes and the look. Layout, colour, motion and sound effects are already in the kit, so a small model such as Haiku 5.5 is enough. The result is a vertical video of 10 to 30 seconds (1080 x 1920, MP4) with sound effects, and with a spoken voice when you ask for one. The video is assembled from this kit, not designed from nothing by an AI.
- **No hooks, MCP servers, commands, agents or `bin/` folder.** The plugin runs nothing by itself. Claude Code reads a skill only when you ask for a video, and every command it runs still goes through Claude Code's permission prompts.
- **The `dev/` and `docs/` folders** hold the maintainers' trial tools and trial report. Because the plugin sits at the repo root, both are copied when you install it, but Claude Code never loads or runs them, and you never need to run them.

### What `video-promo` asks to do on your computer

In order, each one through a permission prompt:

1. `cp -R "<skill folder>/template" video`: copies the template into a `video` folder inside your page folder.
2. `cp index.html video/assets/page/index.html`: copies your page (and its pictures or CSS, if any), so scene 2 shows your real page.
3. Text edits in `video/compositions/`, one at a time. Only the words between tags that carry `data-slot`.
4. `npx hyperframes@0.9.51 telemetry disable`: turns off HyperFrames' usage data (see below).
5. `npx hyperframes@0.9.51 check video`, then `npx hyperframes@0.9.51 snapshot video ...`: checks the project and saves five still frames for Claude Code to look at.
6. Writing `video/REVIEW.md`, then `npx hyperframes@0.9.51 render video ...`: makes `video/promo.mp4`.

### What `motion-kit` asks to do on your computer

In order, each one through a permission prompt:

1. Writing `storyboard.json` in your folder: what the video says.
2. `node "<skill folder>/kit/build.mjs" storyboard.json`: checks the storyboard (the length of every text, the fields that must be there, the files it names, the order of the scenes) and writes the HyperFrames project into a `video` folder. If something is wrong it only prints what to fix, one sentence per problem, and writes nothing. It copies your page or picture into `video/assets/`, lays the video's sound effects into `video/assets/audio/mix.wav`, uses no internet, writes nowhere outside `video`, and refuses to replace a `video` folder it did not make. The only other program it starts is FFmpeg, when there is one, to measure the loudness.
3. `node "<skill folder>/kit/stills.mjs"`: runs `npx hyperframes@0.9.51 telemetry disable`, then `npx hyperframes@0.9.51 snapshot` twice, and writes `video/frames/` and `video/sheet.png`: one sheet with a frame of every scene and, under each, a sentence that says what it should show. The label and the sentence are in the video's language: `FRAME 1 · 1.94 s · scene 1 (title)` and `Should show: ...` for an English video, `BINGKAI 1 · 1,94 dtk · adegan 1 (title)` and `Seharusnya tampil: ...` for an Indonesian one.
4. Writing `video/REVIEW.md`.
5. Only when you asked for a voice: `node "<skill folder>/kit/sound.mjs"`. It makes each spoken line, then runs `kit/build.mjs` again so every scene lasts as long as its line. It downloads nothing (see "Sound in `motion-kit`").
6. `npx hyperframes@0.9.51 render video --quality standard --workers 1 -o video/video.mp4`: makes the video.

The video has sound effects. It has a voice only when you ask for one, and music only when you give a music file of your own. Every name, number, quote and address in the video comes from the brief or your files; when the brief has no number or quote, that scene is left out.

### Sound in `motion-kit`

**Sound effects** are in every video. `kit/build.mjs` lays them itself on every run: a small sound when the title lands, when a list line appears, when the button is pressed, when the scene changes. The sounds follow the video's look: `warnet` gets 8-bit blips, `kertas` paper and books, `panggung` wood and metal. Nothing is downloaded for this; the 87 sound files (1.7 MB) are inside the plugin. If you want a silent video, say so, and Claude Code writes `"sound": "off"` in the storyboard.

**A voice** is made only when you ask for one. The choices:

| You ask for | What speaks | Download | May be used for |
|---|---|---|---|
| Indonesian narration, the light voice | Piper `news_tts` | 41 MB | practice and non-commercial use |
| English narration, the light voice | KittenTTS nano 0.8 | 52 MB | anything, videos you sell included |
| a better English voice on your computer | Kokoro 82M v1.0 | 370 MB | anything, videos you sell included |
| ElevenLabs | your own ElevenLabs account | none | depends on your ElevenLabs plan |
| your own voice | your recordings, one file per line | none | anything: it is your voice |
| a quick draft on a Mac | the macOS system voice | none | checking the timing only, never for publishing |

Those sizes include the speech program (20 MB on a Mac), which is downloaded once; a second voice is smaller.

The scripts, all Node with no dependencies:

- `kit/sound.mjs`: the one extra command for a video with a voice (step 5 above). When the voice is not on your computer, or the ElevenLabs files or your recordings are not there yet, it stops and says what is missing.
- `kit/sound/voice.mjs` and `kit/sound/mix.mjs`: what works behind `sound.mjs` and `build.mjs`. `voice.mjs` makes one WAV file per scene in `video/voice/` and, when `whisper-cli` is installed, checks each line by listening to it. `mix.mjs` joins effects, voice and music into one sound file at -16 LUFS with peaks under -1.5 dBTP; effects alone, which are short and far apart, are left quieter.
- `kit/sound/device.mjs`: looks at your computer (memory, processor cores, free disk) and says which voice suits it. It installs nothing.
- `kit/sound/install.mjs`: the only script that downloads.

**What `install.mjs` downloads, and from where.** Only what `kit/sound/engines.json` names, and every file is checked against a SHA-256 before it is used:

- the speech program sherpa-onnx 1.13.8 (20 MB on a Mac, 25 MB on Windows, 28 MB on Linux), from its releases page at github.com/k2-fsa/sherpa-onnx;
- the files of the chosen voice (Piper `news_tts` 21 MB, KittenTTS 31 MB, Kokoro 350 MB), from the same releases page;
- only if you run `install.mjs whisper` yourself: a 190 MB whisper model from huggingface.co/ggerganov/whisper.cpp, for the line check.

Everything goes to `~/.hypersheets/sound`, outside your folder. The program and the voices are not part of this plugin. `engines.json` also names two voices the kit does not offer, Piper Kristin and Supertonic 3; `install.mjs list` shows them all.

**Claude Code installs no voice without your yes.** When the voice you asked for is not there, it stops and asks first, with the voice's name, the size of the download, its source and the folder it goes to, for example: "The voice KittenTTS nano 0.8 is not on your computer yet. If you agree, I will download 52 MB from github.com into ~/.hypersheets/sound, and nothing else. May I download it now?" `install.mjs` runs only after you answer yes. ElevenLabs and your own voice need no download.

**ElevenLabs.** Without a key, the kit prints each line and the name to save it under (`my-voice/1.mp3`, `my-voice/2.mp3`, the scene's number); you make them on elevenlabs.io and save them there. If you have an API key, set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in your own shell before you start Claude Code: the kit reads them from there, sends the key only to elevenlabs.io together with the lines' text, and never writes or shows it. The key path has not been tested against the real service. Claude Code will not ask for your key in the conversation.

**Licences of the voices and sounds**

| What | Licence | Source |
|---|---|---|
| Recorded sound effects (palettes `soft`, `paper`, `bold`) | CC0, from Kenney's audio packs | kenney.nl; every file is listed in `kit/sound/sfx/SOURCES.md` |
| 8-bit sound effects (palette `pixel`) and whooshes | made by the kit's own synthesiser | `kit/sound/dev/synth.mjs` |
| The speech program sherpa-onnx 1.13.8 | Apache-2.0, with espeak-ng (GPL-3.0-or-later) inside. Downloaded from its makers, not distributed by this plugin | github.com/k2-fsa/sherpa-onnx |
| Piper `id_ID-news_tts-medium` | no licence is documented for this voice; the kit treats it as a practice voice, non-commercial | huggingface.co/rhasspy/piper-voices |
| KittenTTS nano 0.8 | Apache-2.0 | huggingface.co/KittenML/kitten-tts-nano-0.8 |
| Kokoro 82M v1.0 | Apache-2.0 | huggingface.co/hexgrad/Kokoro-82M |
| Whisper small (optional) | MIT | huggingface.co/ggerganov/whisper.cpp |
| ElevenLabs | ElevenLabs' Terms of Service, by your plan | elevenlabs.io/terms-of-use |
| The macOS system voice | the macOS licence: for personal use, not for publishing | apple.com/legal/sla |

**The two notices** the kit shows when that voice speaks, and writes to `video/voice/NOTICE.txt`:

- Piper, Indonesian: "This voice is for practice and non-commercial use. For videos you sell or make for a client, use your own voice or ElevenLabs."
- ElevenLabs: "ElevenLabs' free plan is for non-commercial use only and needs "elevenlabs.io" in the title; videos you sell or make for a client need a paid plan."

Nobody has listened to these voices and sounds yet. What was measured: loudness, peaks, timing, and whether an automatic listener (whisper) hears each line. Whether they sound good is yours to judge. The details are in `docs/SOUND.md`.

### Internet, and what you need

What uses the internet: `npx` downloads `hyperframes@0.9.51` the first time, `npx hyperframes@0.9.51 browser ensure` downloads the headless browser it renders with (about 200 MB), and while rendering, the video loads GSAP 3.15.0 from cdn.jsdelivr.net. Neither skill downloads music or pictures. A voice is downloaded only after you allow it, and with an ElevenLabs key the spoken lines' text goes to elevenlabs.io (see "Sound in `motion-kit`").

What you need: Claude Code, Node.js 22 or later, FFmpeg, and about 200 MB of disk.

### HyperFrames usage data

HyperFrames sends usage data to its makers unless it is turned off. By its own help text (`npx hyperframes@0.9.51 telemetry`), that is command names, render time and quality, template choices, operating system, Node.js and HyperFrames versions; your HeyGen email and username only if you sign in to HeyGen. Video content, project names and file paths are not sent.

The skill runs `npx hyperframes@0.9.51 telemetry disable` before any other HyperFrames command. That command sends nothing itself; it saves your choice in `~/.hyperframes/config.json`, so the check, snapshot and render after it send no usage data. The video track's guide asks you to run it yourself first, before `doctor`. Another way: set `HYPERFRAMES_NO_TELEMETRY=1` or `DO_NOT_TRACK=1`. To see where it stands: `npx hyperframes@0.9.51 telemetry status`.

### Install

In Claude Code, type these two lines, one at a time:

```text
/plugin marketplace add ivqonsanada/hypersheets-workshop#v0.5.1
/plugin install hypersheets-workshop@hypersheets
```

**(owner to decide)** The repo name `ivqonsanada/hypersheets-workshop` is not final.

`#v0.5.1` pins the plugin to that release. Claude Code clones the repo at that tag, and the plugin, which sits at the repo root, is taken from that clone. So what you install is exactly v0.5.1, also after `/plugin marketplace update`. Auto-update is off by default for this marketplace.

The strictest pin: use the full 40-character commit hash of the `v0.5.1` tag instead of the tag's name. It needs Claude Code 2.1.324 or later.

```text
/plugin marketplace add ivqonsanada/hypersheets-workshop#<full commit hash of v0.5.1>
```

The difference: whoever controls the repo can move a tag to another commit, while a commit hash cannot change.

### Remove

```text
/plugin uninstall hypersheets-workshop@hypersheets
/plugin marketplace remove hypersheets
```

Removing the marketplace also uninstalls the plugins installed from it. What stays on your computer from the track itself:

- the `video` folder inside your page folder: delete it yourself when you no longer need it;
- any voice you allowed to be downloaded, in `~/.hypersheets/sound`: delete that folder when you no longer need it;
- the copy of `hyperframes@0.9.51` in the `npx` cache, and its settings in `~/.hyperframes` (to turn its usage data back on: `npx hyperframes@0.9.51 telemetry enable`);
- HyperFrames' browser in `~/.cache/puppeteer`, which other Puppeteer-based tools use too. Delete it only if nothing else needs it.

### Licence (owner to decide)

Proposed, waiting on the owner's decision: everything in this repo under Apache-2.0 (`LICENSE`), except the typefaces in `skills/video-promo/template/assets/fonts/` and `skills/motion-kit/kit/runtime/fonts/` (Finlandica, Fraunces, Big Shoulders Display, JetBrains Mono), which are under the SIL Open Font License 1.1 (the `OFL*.txt` files in each folder), and the sound effects in `skills/motion-kit/kit/sound/sfx/`, whose recordings are CC0 from Kenney (`SOURCES.md` in that folder). The speech program and the voices are not in this repo; their licences are in the table "Licences of the voices and sounds". The Workshop's lesson text, the track guides on learnhypersheets.com, is not in this repo and stays Hyper Sheets'; this licence does not cover it. HyperFrames itself is Apache-2.0. GSAP is not in this repo; the template loads it while rendering, under GSAP's own licence.

## For reviewers and maintainers

```
.claude-plugin/plugin.json        the plugin (name, version)
.claude-plugin/marketplace.json   the marketplace "hypersheets"; the plugin's source is the repo root, "./"
skills/video-promo/SKILL.md       the text Claude reads for a promo of the learner's own page
skills/video-promo/template/      the video project Claude copies; it renders as is
skills/motion-kit/SKILL.md        the text Claude reads for a video from a brief
skills/motion-kit/reference/      scenes.md (fields and limits), writing.md (how the lines read), sound.md (a voice, read only when one is asked for), custom-scene.md (a scene of one's own, not for Haiku)
skills/motion-kit/examples/       one finished storyboard per recipe
skills/motion-kit/kit/build.mjs   checks storyboard.json and writes the HyperFrames project into video/, sound effects included (rules in kit/lib/spec.mjs)
skills/motion-kit/kit/stills.mjs  one frame per scene on a sheet, with what each should show, in the video's language (the labels and the page in kit/lib/sheet.mjs, the sentences in kit/lib/spec.mjs)
skills/motion-kit/kit/sound.mjs   the one extra command for a video with a voice: makes the spoken lines, then builds again
skills/motion-kit/kit/sound/      the sound layer: voice.mjs, mix.mjs, device.mjs, install.mjs, engines.json (every download, with size, checksum and licence), sfx/ (87 sounds in four palettes)
skills/motion-kit/kit/test/       node --test: kit.test.mjs for the kit and its sound together, rules.test.mjs for what the builder accepts and refuses, scene by scene, sheet.test.mjs for the check sheet's labels and sentences in both languages; kit/sound/test/ for the sound layer alone
skills/motion-kit/kit/runtime/    what runs inside the video: mk.js (text fitting, colour, motion), scenes.js, page.js, wrap.js (how a long line of code wraps; the builder uses it too), kit.css, fonts/
dev/                              the Haiku trial tools (learners never run them): run-trial.sh and score.mjs for video-promo, run-kit-trial.sh and score-kit.mjs for motion-kit
docs/TRIAL-2026-11-15.md          video-promo's trial report: rubric, runs, tokens and cost
docs/MOTION-KIT.md                motion-kit: what the kit holds, its contracts, and its Haiku trials (pictures, sound, the use cases of 0.5.0, then the sheet's language in 0.5.1)
docs/KIT-V05-NOTES.md             working notes of the 0.5.0 round and of 0.5.1: what went in, what was left out and why
docs/SOUND.md                     the sound layer: voices and their licences read at the source, what was measured, what only ears can judge
```

- `kit/build.mjs`, `kit/stills.mjs`, `kit/sound.mjs` and everything in `kit/sound/` use Node's built-in modules only. The builder reads `storyboard.json` and the files it names, and writes only inside `video/`; the stills script runs `npx hyperframes@0.9.51` and nothing else. `kit/sound/install.mjs` is the only script that uses the network, and the skill lets Claude run it only after the user's yes.
- `node --test` at the repo root runs the four test files (69 tests). They need only Node; two use FFmpeg and skip without it. No voice is synthesised and nothing is downloaded.
- The kit's default for sound effects is one constant, `SOUND_DEFAULT` in `kit/lib/spec.mjs`. Set it to `"off"` and a video is silent unless its storyboard says `"sound": "on"`; `SKILL.md`'s "Sound" section then needs its first line changed to match.

- The `.js` files next to each scene in `template/compositions/` are the video's timeline. They run inside HyperFrames' headless browser while it checks, snapshots and renders. From v0.2 the page scene also reads the learner's copied page in `video/assets/page/`, in an unseen second frame, to take its colour and to find where the name and the list sit; nothing leaves the computer.
- `claude plugin validate .` checks both manifests.
- A new release: raise `version` in `.claude-plugin/plugin.json`, tag the commit `vX.Y.Z`, and change the tag in the track guides. Claude Code replaces an installed copy only when that version changes.
