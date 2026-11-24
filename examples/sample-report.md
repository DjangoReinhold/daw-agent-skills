# Example DAW Forensic Audit & A/B Revision Report

> *Synthetic/anonymized example output showing how an agent turns `analyze-audio.mjs` telemetry and PNG plots into actionable mixing and mastering notes.*

---

## 1. Single-Track Pre-Master Audit (`deep-house-wip-v4.wav`)

### Executive Verdict
- **Format & Headroom:** Clean **44.1 kHz / 24-bit PCM WAV** (`3:52`). Integrated loudness sits at **`-19.8 LUFS-I`** with **`-3.6 dBTP`** True Peak, **`0`** digital clips, and **`19.1 dB`** Crest Factor—healthy unmastered pre-master headroom ready for mastering or bus-compression polish.
- **Tempo & Harmonic Key:** Locked **`123.0 BPM`** across all four quarters (`Q1–Q4: 123.0`) in **`F# minor` (Camelot `11A`)** (`Q1–Q4` consistent).
- **Low-End Architecture:** Dominant sub fundamental centers at **`46.30 Hz` (`F#1 +2 cents`)**, locked onto the root note of F# minor with **`+0.9985` correlation below `120 Hz`** (rock-solid mono club translation).

---

### Core Technical Metrics

| Metric | Measured Value | Interpretation |
| --- | --- | --- |
| **Integrated Loudness (EBU R128)** | `-19.8 LUFS` | Pre-master dynamic bounce (~6–10 dB to go for streaming/club masters) |
| **Loudness Range (LRA)** | `7.8 LU` | Expressive verse/breakdown contrast (`-26.1` to `-18.3 LUFS`) |
| **True Peak** | `-3.6 dBTP` | Zero inter-sample overs; clean DAC headroom |
| **Crest Factor** | `19.10 dB` | Punchy, uncrushed kick and clap transients |
| **Mono Fold-Down Loss** | `-0.14 dB` | Negligible level drop when summed to mono |
| **Sub `<120 Hz` Correlation** | `+0.9985` (`-28.4 dB S/M`) | Dead-center mono sub-bass |
| **Highs `2–20 kHz` Correlation** | `+0.6140` (`-7.2 dB S/M`) | Tasteful stereo percussion, pads, and reverb width |

---

### 7-Band Spectral Balance

| Band | Energy % | Relative to Total | Notes |
| --- | --- | --- | --- |
| **Sub-Bass (`20–60 Hz`)** | `34.2%` | `-4.66 dB` | Deep, clean `F#1` weight |
| **Bass (`60–250 Hz`)** | `41.8%` | `-3.79 dB` | Solid kick punch and warm bassline body |
| **Low-Mid (`250–500 Hz`)** | `11.4%` | `-9.43 dB` | Controlled warmth without noticeable mud |
| **Mid (`500–2000 Hz`)** | `6.1%` | `-12.15 dB` | Open pocket for pads/vocals |
| **Upper-Mid (`2–6 kHz`)** | `3.3%` | `-14.81 dB` | Smooth synth leads without harsh bite |
| **Presence (`6–12 kHz`)** | `2.1%` | `-16.78 dB` | Soft shaker/hat transients |
| **Air (`12–20 kHz`)** | `1.1%` | `-19.59 dB` | Warm analog-style top rolloff (`85%` rolloff @ `1,920 Hz`) |

---

### DAW Recommendations
1. **Top-End Air Decision:** With `Air (12–20 kHz)` at `1.1%` and `85%` rolloff below `2 kHz`, the mix leans intentionally warm and dark. If you want modern club sheen on big rigs, try a gentle **+1.5 dB high shelf around `10–12 kHz`** on the drum/top-synth bus rather than the master—leave the sub and low-mids untouched.
2. **Pre-Master Limiting Target:** When testing loudness against references, `8–9 dB` of clean gain reduction into a `-1.0 dBTP` true-peak limiter brings this mix cleanly to roughly **`-10.5 LUFS`** without choking the `F#1` sub fundamental.

---

## 2. Example A/B Revision Delta (`wip-v5.wav` vs `--compare wip-v4.wav`)

```text
------------------------------------------------------------
A/B COMPARISON DELTAS (Primary minus deep-house-wip-v4.wav)
------------------------------------------------------------
LUFS-I Delta : +0.8 LU | True Peak Delta: +0.5 dB | Crest Delta: -1.1 dB
Tempo/Key    : 123 vs 123 BPM (exact) | F# minor [11A] vs F# minor [11A] (Camelot compat: true)
Band Deltas (percentage points / relative dB):
  Sub-Bass (20-60 Hz)      +0.6 pp   (+0.08 dB)
  Bass (60-250 Hz)         -0.4 pp   (-0.04 dB)
  Low-Mid (250-500 Hz)     -1.8 pp   (-0.74 dB)
  Mid (500-2000 Hz)        +0.3 pp   (+0.21 dB)
  Upper-Mid (2000-6000 Hz) +0.6 pp   (+0.72 dB)
  Presence (6000-12000 Hz) +0.4 pp   (+0.75 dB)
  Air (12000-20000 Hz)     +0.3 pp   (+1.05 dB)
```

**Takeaway:** The `v5` low-mid trim pulled `-0.74 dB` out of `250–500 Hz` while keeping the `F#1` sub weight intact (`+0.08 dB`) and lifting top-end air by `+1.05 dB` relative without triggering any true-peak clipping (`-3.1 dBTP`).
