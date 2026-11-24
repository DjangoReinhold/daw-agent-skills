# daw-agent-skills

**Give Claude Code and Google Antigravity a real pair of mastering ears—without Python, `librosa`, or `npm install` bloat.**

`daw-agent-skills` is a zero-dependency Node.js + FFmpeg audio DSP forensics skill and CLI designed for music producers, mixing/mastering engineers, and anyone using an AI coding agent alongside their DAW (Ableton Live, Logic Pro, FL Studio, Bitwig, Reaper, Cubase, Pro Tools).

Most CLI coding agents (like Claude Code) **cannot natively listen to `.wav` or `.mp3` files**, which makes them blind when you bounce a mix. `daw-agent-skills` solves that in one command by generating:

1. **Deterministic DSP Telemetry (`report.json`)** — ITU-R BS.1770 / EBU R128 loudness (`LUFS-I`, `LRA`, `dBTP`), `astats`, sample peaks, stereo vs. mono fold-down loss, crest factor, 3-second short-term percentiles, 7-band spectral balance, sub-bass fundamental pitch (Hz + musical note + cents), `<120 Hz` mono sub phase correlation, autocorrelation BPM + quarter stability, Krumhansl-Schmuckler Key + Camelot code + quarter stability, and a 10-second arrangement timeline.
2. **Visual Vision Plots (`waveform.png` & `spectrogram.png`)** — High-resolution split-channel waveforms and log-frequency magma spectrograms so Claude Code / Antigravity can *visually inspect* transient density, brickwall limiting, low-mid buildup, high-end rolloff, and drop energy using native image vision.
3. **A/B Mix Revision & Reference Comparison (`--compare`)** — Diff your new mix bounce (`v9.wav`) against yesterday's bounce (`v8.wav`) or a commercial reference track (`ref.flac`), outputting exact deltas across LUFS, True Peak, Crest Factor, all 7 EQ bands, sub fundamental Hz, and stereo width.

---

## 2-Minute Setup (macOS & Windows)

### 1. Prerequisites
You only need **Node.js `>= 20`** (already installed if you run Claude Code) and **FFmpeg / FFprobe** on your `PATH`.

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Windows (WinGet):**
```powershell
winget install Gyan.FFmpeg
```
*(Restart your terminal after installing FFmpeg on Windows so `ffmpeg` and `ffprobe` are on `PATH`.)*

**Linux (Ubuntu / Debian):**
```bash
sudo apt update && sudo apt install -y ffmpeg
```

Verify both work:
```bash
node -v && ffmpeg -version && ffprobe -version
```

---

### 2. Install as a Skill (Claude Code or Antigravity)

#### For Claude Code (Personal Global Skill — works in every project)
```bash
git clone https://github.com/justadakaje/daw-agent-skills.git ~/.claude/skills/daw-agent-skills
```
Or on **Windows PowerShell**:
```powershell
git clone https://github.com/justadakaje/daw-agent-skills.git "$HOME\.claude\skills\daw-agent-skills"
```

*(Want it per-project inside a specific DAW/music workspace instead? Clone it to `.claude/skills/daw-agent-skills` inside that folder.)*

#### For Google Antigravity
```bash
git clone https://github.com/justadakaje/daw-agent-skills.git ~/.gemini/config/skills/daw-agent-skills
```
Or on **Windows PowerShell**:
```powershell
git clone https://github.com/justadakaje/daw-agent-skills.git "$HOME\.gemini\config\skills\daw-agent-skills"
```

Because `analyze-audio.mjs` uses only built-in Node.js modules (`node:fs`, `node:path`, `node:os`, `node:child_process`) and global `fetch`, **you do not even need to run `npm install`.**

---

## Example Prompts for Your DAW Copilot

Once installed, open Claude Code (or Antigravity) in your studio folder and ask things like:

- **Single bounce mastering check:**
  > *"Analyze my latest bounce `~/Music/Bounces/track-v9.wav` using the daw-audio-forensics skill and tell me if the low end, headroom, and top-end tilt are ready for mastering."*

- **Before/after revision check (`--compare`):**
  > *"Compare `track-v9.wav` against `track-v8.wav` and check whether my 300 Hz cut cleaned up the low-mid mud without thinning out the sub weight."*

- **Commercial reference match (`--compare`):**
  > *"Compare my WIP bounce `my-mix.wav` against `~/Music/References/club-reference.flac` and give me exact EQ, M/S imaging, and limiter targets."*

- **Shared Dropbox / cloud review links:**
  > *"Run audio forensics on this Dropbox bounce link and give me key, Camelot code, BPM, LUFS, and arrangement breakdown: `https://www.dropbox.com/...`"*

---

## Standalone CLI Usage

You can also run the analyzer directly from any terminal:

```bash
# Single track analysis (creates ./my-bounce-analysis/ with report.json + PNGs)
node ~/.claude/skills/daw-agent-skills/scripts/analyze-audio.mjs ./my-bounce.wav

# Compare WIP mix against a commercial reference track into a custom folder
node ~/.claude/skills/daw-agent-skills/scripts/analyze-audio.mjs ./my-mix.wav --compare ./reference.flac --out-dir ./ab-check

# Remote URL (Dropbox links with ?dl=0 are automatically normalized to ?dl=1)
node ~/.claude/skills/daw-agent-skills/scripts/analyze-audio.mjs "https://www.dropbox.com/scl/fi/.../track.wav?dl=0" --out-dir ./review

# Fast JSON-only metering without rendering PNGs
node ~/.claude/skills/daw-agent-skills/scripts/analyze-audio.mjs ./my-bounce.wav --no-plots --json-only
```

### CLI Options

| Flag | Description |
| --- | --- |
| `<input>` / `--input <path\|url>` | Local audio file (`.wav`, `.aiff`, `.flac`, `.mp3`, `.m4a`, `.ogg`) or direct/Dropbox HTTP(S) URL. |
| `--compare <path\|url>` | Second bounce or commercial reference track for full A/B comparison deltas + side-by-side PNG plots. |
| `--out-dir <dir>` | Directory where `report.json` and PNG plots are written (defaults to `./<basename>-analysis`). |
| `--bucket-sec <seconds>` | Timeline grouping interval in seconds (default: `10`). |
| `--no-plots` | Skip rendering `waveform.png` and `spectrogram.png`. |
| `--listen-mp3` | Also generate a 128 kbps MP3 preview (`*-listen.mp3`) for multimodal audio inspection. |
| `--json-only` | Suppress human-readable banner/summary and print only JSON to stdout. |
| `-h`, `--help` | Show CLI usage and exit. |

---

## What It Measures

| Category | Metrics Computed |
| --- | --- |
| **Container & Stream (`ffprobe`)** | Codec, format, sample rate (Hz), bit depth, channel count/layout, bitrate, exact duration, tags. |
| **Loudness & Clipping (EBU R128 + `astats`)** | Integrated LUFS (`I`), Threshold, Loudness Range (`LRA` + Low/High), True Peak (`dBTP`), per-channel DC offset, digital clip counts (`>= 0.9999`), noise floor, bit depth usage, entropy. |
| **Dynamics & Translation** | Left/Right/Stereo RMS (`dBFS`), Mono-sum RMS (`dBFS`), Mono fold-down loss (`dB`), Crest Factor (`dB`), 400 ms momentary max RMS, 3 s short-term max + active/all percentiles (`p10`, `p50`, `p90`, `p99`). |
| **Spectral Balance (`8192-pt FFT`)** | 7-band % energy and relative dB (`20-60 Hz`, `60-250 Hz`, `250-500 Hz`, `500-2000 Hz`, `2-6 kHz`, `6-12 kHz`, `12-20 kHz`), spectral centroid (Hz), 85% roll-off (Hz), Wiener spectral flatness. |
| **Sub-Bass Forensics (`32768-pt FFT`)** | Parabolic-interpolated dominant sub fundamental (`25-100 Hz`) mapped to exact musical pitch & cents offset (e.g., `46.25 Hz -> F#1 (+0 cents)`). |
| **Stereo Imaging Split** | Full-band L/R correlation & Side/Mid ratio (`dB`), plus isolated splits for `Sub (<120 Hz)`, `Mids (120-2000 Hz)`, and `Highs (2-20 kHz)`. |
| **Tempo & Harmonic Key** | Log-flux autocorrelation BPM (`60-185 BPM`, `0.25 BPM` resolution) + quarter-by-quarter (`Q1..Q4`) drift check; `16384-pt` Chromagram + Krumhansl-Schmuckler Key & Camelot Wheel code (`Q1..Q4` stability). |
| **Arrangement Timeline** | Section energy evolution per N seconds (`RMS dBFS`, `Crest dB`, `Sub %`, `Centroid Hz`, `transients/sec`). |
| **Automated Mix Flags** | Rule-based diagnostics (`HEADROOM_PREMASTER`, `SUB_MONO_LOCKED`, `SUB_PHASE_RISK`, `TRUE_PEAK_CLIPPING_RISK`, `DARK_TOP_END`, `HEAVILY_LIMITED`, etc.). |

See [examples/sample-report.md](./examples/sample-report.md) for an example forensic walkthrough and A/B mix revision diff.

---

## Privacy & Git Hygiene

This repository ignores audio files (`*.wav`, `*.flac`, `*.mp3`, `*.m4a`, `*.aiff`), `*-analysis/` folders, and `.env*` by default via `.gitignore`. When analyzing unreleased tracks inside a git-tracked workspace, pass `--out-dir` pointing outside the repo (such as `/tmp/mix-audit`) so unreleased stems or plots never clutter `git status`.

---

## License

[MIT](./LICENSE) — built by [Kenneth Henseler](https://github.com/justadakaje).
