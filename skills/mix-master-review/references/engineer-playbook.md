# Engineer's Playbook: from `report.json` to a DAW move

> **Claim IDs.** A tag like `[K-0801]` points to a sourced fact (book and page) in `knowledge/claims.jsonl`. Run `node scripts/kb.mjs show K-0801` to read it. Lines without a tag have no ID yet.

Use this file after you have read `report.json` and the two PNGs. It turns measurements into the order a mixing or mastering engineer works in, and into moves the producer can try.

Rules of thumb here are starting points, not laws. Measured numbers describe the file. They do not describe taste. Say what you measured, what it may mean, and what to try. Never claim to have heard the audio.

The ideas come from standard recording, mixing, and mastering practice. See [Sources](#sources) at the end. All wording is original.

---

## 0. Ask the genre, then decide the stage

**Ask the genre first.** If the user did not name one, ask. The same number can be healthy in one style and wrong in another. Read [genre-profiles.md](genre-profiles.md) once you know it. For how to make a fix, see [techniques.md](../../production-techniques/references/techniques.md).

If you cannot ask, guess from the tempo range, the sub note, and the tone. Say plainly that it is a guess. Keep loudness and tone advice genre-neutral, and give the user the questions that would settle it.

Then pick the delivery stage before you judge anything. The same number can be fine at one stage and wrong at another.

| If `loudness.ebur128.integratedLufs` is... | Treat the file as... | Judge it by... |
| --- | --- | --- |
| below about -14 | Pre-master / mix bounce | Headroom, balance, translation. Do not ask for loudness. |
| about -14 to -9.5 | Streaming-level master | Peak ceiling, dynamics, tone. |
| above about -9.5 | Club-level master | Limiter damage, harshness, crest factor. |

These cut-offs match the benchmark table in the `audio-forensics` skill. Then take the numbers for that stage from that table. Use the "Pre-Master" row for a pre-master, even in a warm or deep style. The "Warm / Analog / Deep Dub" row is for finished masters in that style. If the user says what the file is for, trust the user over this table.

### Field paths used in this file

Some fields are named without their full path below. Here is where they live in `report.json`:

| Short name | Full path |
| --- | --- |
| `integratedLufs`, `truePeakDbtp`, `lraLu` | `loudness.ebur128.*` |
| `crestFactorDb`, `monoFoldDownLossDb`, `clippedSamplesLeft/Right` | `dynamics.*` |
| overall RMS | `dynamics.rmsStereoDbfs` |
| `centroidHz`, `rolloff85Hz`, `bands` | `spectral.*` |
| `frequencySplit`, `fullBandCorrelation` | `stereo.*` |
| `rmsDbfs`, `crestDb`, `subSharePct`, `centroidHz` (per block) | `timeline[]` |

`timeline[].subSharePct` is the share of spectral power at or below about 120 Hz in that block. It is a share of that block's own power, so it can read high in a quiet block.

A mix and a master are different jobs. A mix that is not finished cannot be fixed at the master stage. Master-bus processing changes the mix balance. If the report shows a balance problem, send the user back to the mix.

---

## 1. Check order

Work from the most serious problem to the least. Stop and report a hard fault before you give taste notes.

1. **File health.** `container`, clipped samples, DC offset, `truePeakDbtp`.
2. **Level and headroom.** Loudness, peak ceiling, crest factor.
3. **Low end and mono.** Sub energy, sub correlation, mono fold-down loss.
4. **Tonal balance.** Bands, centroid, rolloff.
5. **Dynamics over time.** Timeline, short-term percentiles, LRA.
6. **Stereo image.** Per-band correlation, Side/Mid ratio.
7. **Arrangement.** Timeline shape, energy arc.
8. **Key and tempo.** Context only. Say so when confidence is low.

---

## 2. File health

| Signal | Likely meaning | Try |
| --- | --- | --- |
| Clipped samples above 0, or `truePeakDbtp` above 0 | Digital clipping or inter-sample overs | Lower the output ceiling. Turning a clipped file down does not remove the clipping. Re-export from the source with a lower level. |
| `truePeakDbtp` between -0.3 and 0 | Hot ceiling. Lossy encoders can add small overs | Ceiling near -1 dBTP. A ceiling near -0.2 dBFS is only for files that get no further processing. |
| DC offset above about 0.005 | A device adds a constant offset | High-pass near 20 Hz (steep) before any limiter. DC offset eats headroom. |
| 16-bit file meant for mastering | Early dither or truncation | Ask for the 24-bit bounce at the project sample rate. |
| Sharp cutoff near 16 kHz in `spectrogram.png` | File came from an MP3 or AAC | Ask for the original lossless bounce. |

Dither rule: dither once, at the very last step, when you cut to 16-bit. A second dither adds noise for no gain. Sample-rate conversion goes second to last, just before dither.

---

## 3. Level, headroom, dynamics

Read these together. One number alone misleads.

- **Peak level is not loudness.** Two files with the same peak can sound several dB apart. Average level drives loudness.
- **Crest factor is peak minus average.** For recorded music, 10 to 18 dB is common. Mixes straight from the DAW often sit at 14 to 18 dB, and sparse or dynamic material can reach 20 dB or a little more. The `audio-forensics` pre-master range (14 to 22 dB) is the benchmark. A value just above it is not a fault. [K-0521]
- **Pre-master with `integratedLufs` between about -22 and -14 and `truePeakDbtp` between about -6 and -3:** healthy. Do not suggest limiting. Say how much gain the mastering stage will need.
- **Gain the mastering stage will need:** target LUFS minus `integratedLufs`. Invented example: from -19.0 to -14 LUFS is 5 dB. Add that gain to `truePeakDbtp` to see where the peaks land. Then the limiter must take down the amount above the ceiling. With a true peak of -4.0 dBTP, the peaks land at +1.0 dBTP, so a -1 dBTP ceiling needs about 2 dB of peak reduction. A club-level target needs more gain, so more limiting and a lower crest factor. Give the user these numbers and let them choose the target.
- **High crest factor (above about 14 dB):** open transients. Normal at the pre-master stage.
- **Low crest factor (below about 8 dB):** heavy limiting. Look at `waveform.png` for flat tops. Ask whether the kick and snare still hit. Flat-topped peaks cannot be repaired later.
- **Pop or club music with crest well below about 14 dB:** do not push the peaks to full scale. The loudness comes from the average, not the peak. [K-0686]
- **Large `lraLu` with a loud main section:** quiet parts may vanish in a car or club. Check the timeline.
- **Short-term percentiles (`dynamics.shortTermRms3sAllPercentilesDbfs`, `p10` to `p99`):** a wide gap between `p10` and `p90` means the track moves a lot. A narrow gap means a steady, dense track.
- **Loudness war:** over-compressed masters sound small, flat, and tiring. Streaming services turn loud files down, so extra squash buys nothing there.

### Compression starting points

Use these only when the report points to a dynamics problem. Tell the user to adjust by ear and to compare against bypass at matched loudness.

- Gentle balance: ratio near 1.5:1 to 3:1. Firm: around 4:1 or more. A ratio of 10:1 or higher acts like a limiter.
- Set make-up gain by hand. Auto make-up makes the processed sound seem better only because it is louder.
- Very fast attack and release (under about 50 ms) can follow the waveform and add distortion. Bass is the most at risk. [K-0518]
- A slow attack lets the front of a hit through. A fast attack calms it.
- Use the slowest release that does not pump. Pumping is level changing in time with the loud hits.
- A fast-attack limiter with a carefully set release can bring a 18 to 20 dB crest factor down to about 14 dB with little damage. Pushing past that gets audible.
- Bus "glue": about 2 to 3 dB of gain reduction at most, ratio under about 2:1. More than that is a style choice. [K-0240]
- Level changes by hand are small. Steps of 1/4 to 1/2 dB are common. Take the dip in the quiet passage just before a loud part, not at the peak.
- Build-ups should lean on arrangement, tone, width, and effects, not only on level. Level rises get flattened by loudness processing.

---

## 4. Low end and mono

| Signal | Likely meaning | Try |
| --- | --- | --- |
| `stereo.frequencySplit` "Sub" correlation of 0.9 or higher | Mono-safe low end | Leave it alone. |
| Sub correlation 0.6 to 0.9 | Some width below 120 Hz | Narrow the Side signal below about 90 to 120 Hz. |
| Sub correlation below 0.6 | Out-of-phase or very wide low end | Sum to mono below about 100 to 120 Hz. Check for a stereo bass patch or a phase-flipped layer. |
| `monoFoldDownLossDb` below about -2 | Elements vanish in mono | Check wide synths, chorus, short delays, polarity-inverted widening. |
| Sub fundamental sits between two notes (`spectral.dominantSubNote.cents` near 50) | Kick or bass may be out of tune | Tune the kick or bass to the track key. |
| High `timeline[].subSharePct` (above about 40%) with a peak ceiling that is already tight | Sub energy eats headroom (a loud sub can cost about 3 dB) | High-pass tracks that do not need the sub. Keep sub energy on as few tracks as possible. |

More low-end notes:

- Compare the sub note (`spectral.dominantSubPeakHz`) with `key`. A mismatch is a thing to check, not a fault.
- Kick and bass fight for the same space. Two common fixes: lower the kick by about 1.5 to 2 dB, or high-pass the kick near 44 Hz where its sub energy squashes the bass. A short kick-triggered duck on the bass (about 2 dB) is another.
- Most tracks need a high-pass, often between 20 and 150 Hz depending on the part. This is a per-track move. Do not high-pass the whole master across the board.
- A sub synth on top of a bass can cancel the bass fundamental. High-pass or notch the bass first.
- Boosting 20 to 30 Hz makes bass notes sound longer. Cutting there makes them tighter.
- Vinyl and mono systems need low end that stays near the center.

---

## 5. Tonal balance

Group the 7 bands into four zones. Engineers talk in these zones.

| Zone | Range | Bands in the report |
| --- | --- | --- |
| Low | 20-200 Hz | Sub-Bass, most of Bass |
| Low-mid | 200-1000 Hz | Low-Mid, part of Mid |
| High-mid | 1-5 kHz | Mid, Upper-Mid |
| High | 5-20 kHz | Presence, Air |

What each zone does, and what too much or too little sounds like:

- **Low:** weight and power. Too much turns to boom. Too little sounds thin.
- **Low-mid:** body and fullness. Excess near 200 to 400 Hz sounds muddy or boxy. Boxy often sits around 300 to 800 Hz. Thin can mean a hole between about 75 and 600 Hz.
- **High-mid:** clarity and edge. Excess near 2 to 4 kHz sounds harsh or tiring.
- **High:** air and shimmer. Excess near 4 to 10 kHz sounds edgy, sibilant, or brittle. Too little sounds dull.

How the bands interact:

- Warmth can come from a lift around 200 to 600 Hz or a dip around 3 to 7 kHz. The two moves feel alike.
- A cut in the lows can make the highs seem brighter. A big boost above 15 kHz can thin the low-mids. Check the whole curve, not one spot.
- The 5 kHz area also has a loudness effect. A lift there makes a mix seem louder. Be careful on a hot master.
- Hiss is easiest to hear around 3 to 5 kHz. A narrow dip there beats a low-pass for hiss. [K-0555]
- Sibilance usually lives between about 2.5 and 10 kHz. A small narrow dip, or a de-esser, goes late in the vocal chain.
- Do not copy a reference curve exactly. Mixes in the same genre can have different spectra. Use the reference to find big gaps only.

### EQ habits that the books agree on

- Judge EQ in the full mix, not solo.
- Prefer cuts to boosts. A boost makes the sound louder, and that fools your ear.
- Keep boosts under about 6 dB, and avoid stacking several boosts on one track.
- Use shelves for broad problems. Use narrow peaks for single resonances.
- Gentle Q values (about 0.6 to 0.7) sound natural. Use Q above 2 only for surgical fixes. [K-0548]
- Changes under 1/2 dB are audible on good monitors. A tiny move can matter in a mastering chain. [K-0559]
- If you spent about five minutes on one track's EQ, the fix is probably somewhere else (level, pan, or another track that masks it).
- Masking: a loud part can hide the same band in another part. Cut the masker or boost the hidden part.
- Mains hum sits at 50 or 60 Hz plus its harmonics. Notch it. [K-0120]

### Where problems usually live (by source)

These are common trouble spots. Use them to turn a vague tonal note into a specific source to check.

| Source | Weight / body | Bite / clarity | Common trouble |
| --- | --- | --- | --- |
| Kick | 60-80 Hz | about 2.5 kHz | Boxy near 300 to 400 Hz |
| Snare | about 240 Hz | about 5 kHz | Ring in the low-mids |
| Bass | 60-80 Hz | 700 Hz to 1 kHz | String noise near 2.5 kHz |
| Vocal | about 120 Hz | about 5 kHz | Boom near 200-240 Hz, sibilance near 7.5-10 kHz |
| Hi-hats / cymbals | n/a | 7.5-12 kHz shimmer | Clank near 200 Hz |
| Guitar / keys | 80-240 Hz | 2.5-5 kHz | Honk when a narrow band near 2.5 kHz is boosted |

A full-mix report cannot tell which source causes a problem. Name the likely suspects and ask the user to solo or mute to confirm.

### Reading `centroidHz` and `rolloff85Hz`

- Low centroid and low rolloff: dark or warm. That suits deep house and dub.
- High centroid and high rolloff: bright. Check hats and vocals at high playback volume.
- A fast change in centroid between timeline blocks marks a section change. A drop usually means a filtered breakdown.
- The whole-file `spectral.centroidHz` weights by amplitude over every block, while `rolloff85Hz` uses power. A quiet, bright intro can pull the centroid far above the rolloff (for example 4000 Hz against 1000 Hz). Trust the rolloff and the band table for the overall tone. Use the centroid mainly to compare timeline blocks.

---

## 6. Stereo image

- Full-band correlation near +1 is mono-like. Near 0 is very wide. Negative values warn of cancellation.
- Compare the three splits. A good mix often has high correlation in the low band and lower correlation in the mids and highs.
- Side/Mid near -6 to -12 dB is a normal range for many styles. Treat it as context.
- Centered sources gain about 3 dB when a stereo mix is summed to mono, compared with sources at the edges. That shifts balance. Check the mono sum.
- Kick, snare, bass, and lead vocal usually sit in the center. They survive mono and one-sided playback best.
- A part panned hard to one side loses about 3 dB in mono and can vanish on a single earbud.
- Widening tricks that use a polarity flip can erase a part in mono. Ask the user to check mono after any widening move.
- Boosts on the Side signal in the highs can ruin the mono tone.
- Short delays (about 10 to 40 ms) fuse with the sound and widen it. Very short delays (under about 5 ms) blur the center and cause comb filtering in mono. [K-0710]
- A small left/right level error (about 0.2 dB or more) can be audible. Tell the user to check pan and balance moves by ear, not by a meter alone.
- Check width in each frequency region, not only overall.

---

## 7. Arrangement and energy arc

Use `timeline` to label sections.

- A jump in `subSharePct` marks the point where the bass or kick enters.
- A drop in `subSharePct` and `centroidHz` together marks a breakdown.
- A rise in `rmsDbfs` and a lower `crestDb` marks a fuller, denser section.
- A long tail of low `rmsDbfs` at the end is an outro or a fade. Check that the fade does not cut a note.
- A slow rise from a very low `rmsDbfs` in the first blocks can be a deliberate build or a fade-in on the master bus. The report cannot tell which. Ask the user. If it is a fade, a mastering stage wants the file without it.
- An intro with no sub (`subSharePct` near 0) and a high centroid is a highs-only intro. That may be a DJ-style or filtered intro. Ask whether it is intended. Do not call it a fault.
- A final section that is no louder than earlier sections may lack lift. Contrast between sections is a mixing choice: thin the early parts so later parts feel bigger.
- Many arrangement guides suggest no more than about three main focal elements at once, and a change (fill, drop, or new sound) before a part repeats more than about three times.

The last `timeline[]` block is usually shorter than the others (for example 4 seconds). Its sub share and centroid are noisy. Do not read much into it.

State section times as ranges (for example 0:40 to 1:30). Never invent bar numbers. The report has no bar grid.

---

## 8. Key and tempo: how much to trust them

- Trust the key when every entry in `key.quarterStability` (Q1 to Q4) agrees and the top score is clearly above the second. As a rule of thumb, "clearly" means at least about 20% higher. A closer second place (often the relative or neighbouring key on the Camelot wheel) is a reason to say "likely" and not "is".
- Treat the sub note as a hint. The sub peak comes from a finite frequency grid, so its `spectral.dominantSubNote.cents` value is uncertain by tens of cents at 40 to 60 Hz. A reading near 50 cents (halfway between two notes) is worth a check by ear. A reading within about 30 cents of a note is not worth chasing.
- Treat tempo as low confidence when the top two scores are within about 25% of each other, or when the top candidates are a double or half of each other (for example 70 and 140 with scores 0.010 and 0.009). A stable result across Q1 to Q4 does not settle a half/double doubt, because every quarter can make the same mistake. A third candidate in a 3:2 relation to the top one is also a sign of confusion. Report both, say which is likelier for the genre (use the BPM range in [genre-profiles.md](genre-profiles.md)), and ask the user to confirm. Do not build delay or sidechain advice on an unconfirmed tempo.

---

## 9. Mix hand-off checklist (to the mastering stage)

Ask for, or check, these before a mix goes to mastering:

1. Peaks around -3 dBFS or lower. No overs. Plug-in clip lights checked.
2. 24-bit linear PCM (WAV or AIFF), at the project sample rate. No MP3. No 32-bit float if the receiver cannot read it.
3. No normalizing. No dither on the mix.
4. No fades and no cut-off tails. Leave room tone: about 4 seconds is the minimum, 10 is better. Start the first sound at least 1 second into the file.
5. Master bus lightly processed. If a bus compressor is on, also send a version with it off.
6. Alternates when useful: vocal up and vocal down (about 1/2 to 1 dB apart), and stems that start at the same time and line up to the sample.
7. A sub that is mono below about 100 to 120 Hz.
8. No section far louder than the rest, unless that is the point.
9. A short written note about intent: fades, edits, and anything unusual.
10. File names that start with the track number and use plain letters, digits, and underscores.

When matching the level of several tracks, match by loudness (LUFS) and by ear. Peak normalization sets only the highest sample. It does not make tracks sound equally loud. For an album, set the loudest song first, then fit the others to it.

Final-format notes:

- Keep the highest resolution as long as you can. Go back a generation instead of adding a process on top of a process.
- Sample-rate convert second to last. Dither last. Dither once.
- Check the final file with a mono fold-down before sign-off.
- Radio and some playback systems turn the sound mono or narrow, so mono safety matters more than width.

---

## 10. Comparing against a reference (`--compare`)

- Match loudness first. A louder file always seems better, so compare at equal loudness or the result is worthless.
- Prefer a lossless reference. A streamed or compressed reference sets an easier target.
- Pick references by style and era. Use different ones for low end, vocal level, and top end.
- A loud, heavily limited reference can hide problems. Use a lightly mastered reference, or turn your own mix up to match.
- Compare big things first: overall tone, then balance, then each instrument, then reverb and delay, then stereo image.
- Read the deltas in the report as hints for where to look. They are not targets to hit.

---

## 11. What the report cannot tell you

Say so when it matters:

- Which instrument causes a tonal problem.
- Whether a balance (for example, lead vocal level) is right. This is the most common revision request. Tell the user to check it on more than one system and at low and high volume.
- Room, monitor, and headphone problems. A mix can look fine on a report and still translate badly.
- Whether sound is distorted by the mix itself or by the capture.
- Taste.

Mixes also get judged badly when you mix for too long without a break, and when you finish late in the day. Tell the user to rest, then listen top to tail on a system they know.

---

## 12. How to write the answer

Use the layout in `audio-forensics` ("Output Format Guidelines"): verdict, metrics table, band profile, timeline, moves. Use the rules below for the content of each part. Where they differ, the layout comes from `audio-forensics` and the content rules come from here.

1. State the stage (pre-master, streaming master, club master).
2. List hard faults first, if any.
3. Give 3 to 5 moves. Tie each move to a number from `report.json`.
4. Name the likely source of each tonal issue and ask the user to check it by ear.
5. Say what you did not measure.
6. In `--compare` mode, say what improved and what shifted by accident.

---

## Sources

The ideas above are summarized in the author's own words from these works. Numbers are the books' typical values, so treat them as starting points.

- Huber, D. M. and Runstein, R. E., *Modern Recording Techniques*, 7th ed.
- Senior, M., *Mixing Secrets for the Small Studio*.
- Katz, B., *Mastering Audio: The Art and the Science*.
- Snoman, R., *The Dance Music Manual* (used mainly in `genre-profiles.md` and in the `production-techniques` skill).
