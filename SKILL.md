---
name: daw-audio-forensics
description: Analyze DAW bounces, pre-masters, masters, or reference tracks using zero-dependency Node.js + FFmpeg DSP telemetry (EBU R128 LUFS, True Peak dBTP, Crest Factor, 7-band spectral balance, sub-bass note Hz, stereo/mono phase correlation, BPM + Camelot key stability, 10s arrangement timeline, and A/B mix comparison) plus visual waveform and log-frequency spectrogram PNGs. Use whenever the user asks to analyze an audio file, inspect a mix bounce, check mastering readiness, or compare a WIP mix against an earlier revision or commercial reference track.
---

# DAW Audio Forensics & Mix/Master Copilot

Use this skill to give coding agents deterministic mixing/mastering telemetry **and** visual waveform/spectrogram plots without Python or `npm install` dependencies.

Because many CLI coding agents (including Claude Code) cannot natively hear raw `.wav` or `.mp3` files, running this analyzer first gives the agent exact ITU-R BS.1770 / EBU R128 loudness meters, FFT spectral/stereo splits, and high-resolution images that can be inspected natively with `Read` / `read_file`.

---

## Workflow

### 1. Locate the Analyzer Script
Find `scripts/analyze-audio.mjs` inside this skill folder:
- **Claude Code:** `~/.claude/skills/daw-agent-skills/scripts/analyze-audio.mjs` (or `.claude/skills/daw-agent-skills/scripts/analyze-audio.mjs`)
- **Google Antigravity:** `~/.gemini/config/skills/daw-agent-skills/scripts/analyze-audio.mjs`

Confirm `node` (`>=20`), `ffmpeg`, and `ffprobe` are available on `PATH`. If `ffmpeg` is missing, stop and give the user the install command printed by the script (`brew install ffmpeg` on macOS, `winget install Gyan.FFmpeg` on Windows).

### 2. Run the Analyzer

**Single track / bounce audit:**
```bash
node <skill-dir>/scripts/analyze-audio.mjs "<input-file-or-url>" --out-dir "<out-dir>"
```

**A/B mix revision check or reference track comparison (`--compare`):**
```bash
node <skill-dir>/scripts/analyze-audio.mjs "<wip-mix>" --compare "<prev-bounce-or-reference>" --out-dir "<out-dir>"
```

**Useful flags:**
- `--out-dir <dir>` — Output directory (use a temp/analysis directory outside clean git working trees, e.g., `/tmp/mix-audit` or `./analysis-out`, to avoid leaving artifacts in project repos).
- `--listen-mp3` — Also emits a 128 kbps MP3 preview (`*-listen.mp3`) for multimodal models (such as Gemini in Antigravity) that can listen directly to audio.
- `--bucket-sec <N>` — Change arrangement timeline resolution from the `10`s default (e.g. `--bucket-sec 5` for short drops or loops).
- `--no-plots` — Skip rendering PNGs when only JSON metrics are needed.
- `--json-only` — Suppress human summary logs and emit only JSON on stdout.

### 3. Inspect Telemetry & Visual Plots

1. Read `<out-dir>/report.json` completely. Pay close attention to:
   - `container` — format, sample rate, bit depth, channels, bitrate.
   - `loudness.ebur128` & `loudness.astats` — Integrated LUFS, LRA (LU), True Peak (dBTP), sample peak, noise floor, entropy.
   - `dynamics` — Sample peak L/R/max, stereo RMS vs. mono-sum RMS fold-down loss (dB), Crest Factor (dB), clipped samples, DC offset, 400 ms momentary max, 3 s short-term max & percentiles (`p10`/`p50`/`p90`/`p99`).
   - `spectral` — 7-band energy distribution (`Sub-Bass 20-60 Hz` through `Air 12-20 kHz`), dominant sub fundamental peak (Hz + nearest musical note + cents), spectral centroid, 85% rolloff Hz, and Wiener spectral flatness.
   - `stereo` — Full-band L/R correlation + Side/Mid ratio (dB), plus 3-band split (`Sub <120 Hz`, `Mids 120-2000 Hz`, `Highs 2-20 kHz`).
   - `tempo` & `key` — Top 3 BPM candidates + Q1–Q4 stability, top 4 Krumhansl-Schmuckler keys + Camelot Wheel codes + Q1–Q4 stability.
   - `diagnostics` — Automated headroom, true peak, mono sub, stereo compatibility, top-end tilt, and dynamics flags.
   - `timeline` — Section-by-section RMS, crest factor, sub share %, centroid Hz, and transients/sec across the arrangement.
   - `comparison` (when `--compare` is used) — Deltas between primary and reference (`primary - reference`).

2. **Visually inspect PNG plots** using your image/file reading tool (`Read` in Claude Code, `read_file` in Antigravity):
   - `<out-dir>/waveform.png` (and `compare-waveform.png` in A/B mode) — Check macro arrangement arc (intro/build/drop/breakdown/outro), L/R balance, flat-top brickwall limiting vs. open peaks, and audible headroom.
   - `<out-dir>/spectrogram.png` (and `compare-spectrogram.png` in A/B mode) — Check sub continuity (`30-60 Hz`), low-mid congestion (`200-400 Hz`), transient column crispness, sibilance bands (`5-9 kHz`), MP3/AAC codec shelf cutoffs (`16-20 kHz`), and noise floor during quiet breakdowns.

3. *(Optional, multimodal models only)* If `listenMp3` was generated with `--listen-mp3` and your runtime natively supports audio files, read the MP3 to complement DSP facts with tonal/TIMBRE, groove, vocal, and stylistic impressions. Never fabricate auditory impressions if your runtime cannot hear audio; clearly anchor insights in verified DSP telemetry and spectrogram/waveform observations.

---

## Genre & Target Reference Benchmarks

Use these engineering ranges as sanity checks when giving DAW mix/master feedback (never treat them as rigid rules—always respect artistic intent):

| Delivery Stage / Context | Integrated LUFS | True Peak Ceiling | Crest Factor | LRA | Sub `<120 Hz` Corr | Air (`12-20 kHz`) |
| --- | --- | --- | --- | --- | --- | --- |
| **Pre-Master Mix Bounce** | `-22` to `-14` LUFS | `-6.0` to `-3.0` dBTP | `14` to `22` dB | `6` to `12` LU | `>= +0.90` | `1.0%` to `4.5%` |
| **Streaming Master (Spotify/Apple)** | `-14` to `-9.5` LUFS | `-1.0` dBTP | `9` to `14` dB | `5` to `9` LU | `>= +0.90` | `1.5%` to `6.0%` |
| **Club / Beatport Electronic Master** | `-9.5` to `-6.5` LUFS | `-1.0` to `-0.3` dBTP | `7` to `10` dB | `4` to `7` LU | `>= +0.92` | `2.0%` to `7.0%` |
| **Warm / Analog / Deep Dub Aesthetic** | `-12` to `-8.5` LUFS | `-1.0` dBTP | `9` to `13` dB | `5` to `8` LU | `>= +0.90` | `0.8%` to `2.5%` |

---

## Output Format Guidelines for the User

When presenting an analysis back to a producer/engineer:
1. **Executive Verdict First:** Genre/vibe signals, mix readiness (pre-master vs. mastered), key/Camelot + BPM, integrated LUFS, True Peak, Crest Factor, and overall health in 3–5 bullet points.
2. **Core Technical Metrics Table:** Container, EBU R128, Dynamics, Sub Fundamental Hz/Note, Stereo Correlation Split (`<120 Hz` / Mids / Highs), Tempo/Key stability.
3. **7-Band Spectral Profile:** Show % energy and relative dB tilt with plain-English tonal interpretation (e.g., sub weight, low-mid mud risk around `250-500 Hz`, air shelf headroom).
4. **Arrangement & Dynamics Timeline:** Group 10s buckets into structural sections (Intro, Verse/Build, Drop 1, Breakdown, Drop 2, Outro) showing how RMS, Crest, Sub %, and Centroid evolve over time.
5. **Actionable DAW Moves:** Specific, surgical EQ/compression/imaging/limiting suggestions tied to exact measured numbers (e.g., *"Sub fundamental centers at 46.2 Hz (F#1) with +0.99 mono correlation—safe for club PAs; -20.4 LUFS and -3.8 dBTP leave plenty of headroom for mastering..."*).
6. **In `--compare` mode:** Highlight *what improved* and *what shifted unintentionally* between revision A and B (loudness-matched spectral tilt changes, crest factor loss/gain, sub weight deltas, and stereo width shifts).
