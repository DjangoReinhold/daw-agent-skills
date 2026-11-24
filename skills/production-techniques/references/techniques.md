# Techniques: how to make the move

> **Claim IDs.** A tag like `[K-0801]` points to a sourced fact (book and page) in `knowledge/claims.jsonl`. Run `node scripts/kb.mjs show K-0801` to read it. Lines without a tag have no ID yet.

Use the `mix-master-review` skill first to find the problem (its `engineer-playbook.md`). Use this file for how to fix it. Genre tags in square brackets show where a move fits. [all] means it fits any style.

Every number is a starting point from the books listed under [Sources](#sources). Tell the user to set the final value by ear, and to compare with the effect bypassed at the same loudness. A louder version always sounds better for a moment.

---

## 1. Kick and bass

The kick and bass share the same low space. Fix the clash before you add weight.

- **Offset them in time.** Bass notes land between kick hits. In trance the bass sits about an eighth note after each kick, so the low end alternates kick, bass, kick, bass. [trance, house]
- **Duck the bass from the kick (sidechain).**
  - Starting point: ratio 3:1, fast attack, medium release. [house, hip-hop, big beat] [K-0801]
  - Stronger version: ratio 8:1, fast attack and release, threshold set so every kick triggers it. [all dance] [K-1043]
  - Gentle version: about 2 dB of duck for a moment is often enough. [all]
- **Pump the kick and bass together.** Run the kick and bass through one compressor, with the hats left out. Ratio about 9:1, attack about 5 ms, release about 200 ms. Aim for about 3 to 6 dB of gain reduction on each kick. A shorter release pumps the bass more. [house, trance] [K-0927]
- **Let the release recover before the next kick.** The gain-reduction meter should return to 0 dB between kicks. If it does not, the compressor is working harder than it needs to. [K-0829]
- **High-pass the kick near 44 Hz** when its deepest energy masks the bass. Automate it if needed. [metal and heavy styles; try on dance]
- **Tame the sub on the kick.** A small amount of distortion on an 808-style kick pushes energy up to about 120 to 140 Hz, so small speakers can hear it. [hip-hop, urban] [K-0229]
- **Add weight with a gated sine** that starts near 50 Hz. Keep it in tune with the bass line. [dance, urban] [K-0230]
- **Keep the bass click short.** A transient click under about 30 ms keeps the kick and bass from blurring. [K-0902]
- **Short kick decay.** A long kick tail runs into the bass and makes the low end muddy. [house, trance]
- **Layer bass parts by range.** One layer holds the lows. The other is high-passed so its lows do not clash.
- **Sub on top of a bass:** use a mono sine or triangle. Remove the original bass fundamental (steep high-pass or notch) or the two can cancel. [electronic, hip-hop]
- **Layered kicks:** line up the timing and check polarity. A wrong polarity costs low-end weight. [all]
- **Do not boost below 40 to 60 Hz** on near-field monitors. They cannot show you what is there. Check on a full-range system. [all dance] [K-1001]

---

## 2. Compression starting points

Set the threshold so the compressor works on the peaks. Set make-up gain by hand.

| Source | Ratio | Attack | Release | Gain reduction | Note |
| --- | --- | --- | --- | --- | --- |
| Drum loop | 5:1 to 10:1 | 1-10 ms | 40-100 ms | 5-15 dB | Dance. Run the kick alone first. |
| Bass | 5:1 to 10:1 (hard knee) | 1-10 ms | 40-100 ms | 5-15 dB | Dance |
| Lead synth | 4:1 to 12:1 (soft knee) | 1-10 ms | about 20 ms or auto | 6-13 dB | Dance |
| Vocal (dance) | 2:1 to 8:1 | 3-10 ms | about 40 ms or auto | 8-10 dB | Dance |
| Rap vocal | 4:1 (up to 6:1) | fast | about 200 ms | about 5 dB | [hip-hop] | [K-0933]
| Hip-hop drums | 8:1 only if needed | fast | short | about 2 dB | Most are left raw | [K-0931]
| Hip-hop bass | 4:1 | 5 ms | about 150 ms | a couple of dB | No low-end pumping | [K-0932]
| Techno bus | 12:1 | 5 ms | about 200 ms | at least 5 dB on kick and snare | [techno] Aggressive | [K-1036]
| Chill loops | 4:1 | slow | medium | 4-5 dB | Usually left uncompressed | [K-0934]

More rules:

- **Soft knee:** 6 to 9 dB of knee sounds the most natural. [K-0834]
- **Snare thwack:** low threshold and high ratio. Use a slower attack so the compressor grabs the decay and misses the front. [trance, techno, house]
- **Hi-hats and cymbals:** do not compress them. It dulls the top.
- **Two compressors in series** give a crunch: a high ratio with pushed gain first. [big beat, hip-hop, techno drums]
- **A limiter after the compressor** catches stray peaks. Use 3 to 6 dB of limiting at most.
- **Keep the kick's punch.** Heavy compression with all hits at one level gives a loud but flat track with a weak kick. Compress the kick less than the mids.
- **Mix-bus pump:** attack 20 to 30 ms, release about 250 ms, low threshold, low ratio, about 2 dB of reduction. [dance] [K-0831]
- **Bus glue:** 2 to 3 dB at most, ratio under 2:1, slow attack, automatic release. [all] [K-0240]
- **Do not use fast attack and release together (both under about 50 ms) on bass.** It distorts the waveform. [K-0518]

### Parallel compression

- Threshold near -50 dBFS, attack 1 ms or less, ratio about 2:1 to 2.5:1, release about 250 to 350 ms. [K-0526]
- Blend the compressed signal low (about -5 to -15 dB). A signal 20 dB down barely changes the level. [K-0633]
- Delay the dry path to match the compressor, usually 5 to 10 samples. Find it by checking polarity for a null. Without it, the blend comb-filters. [K-0529]
- Judge the blend, not the compressed signal alone.

### Expansion and gates

- Upward expansion is gentle: ratios of about 1:1.01 to 1:1.2. [K-0530]
- Gate chatter: add a few ms of hold time.
- Gate release is usually 50 to 200 ms. Add a few ms of look-ahead so a gate does not clip a hit. [K-0839]

---

## 3. EQ moves

- **High-pass method:** raise the cutoff until the low end changes, then back off about 15%. Use 6, 12, or 18 dB per octave. Avoid steep or resonant filters on most tracks. [all] [K-0110]
- **Find a resonance:** boost a lot with a wide Q, sweep to find it, narrow the Q, then cut. [all]
- **Mud:** cut in the 200 to 800 Hz area first. In mastering, small cuts near 180 to 225 Hz (mud), near 1.8 kHz (harsh), and near 500 Hz (nasal) are common. [K-1025]
- **Q:** about 1.0 is a good default (one octave). Vocals about 2 octaves, drums about half an octave. For mastering, a Q of about 0.4 to 0.9. Use Q above 2 only for surgical fixes. [K-1029]
- **Hiss:** a narrow dip of 1 to 4 dB at 3 to 5 kHz beats a low-pass. [K-0555]
- **Boosts for volume:** keep them to about 5 dB. A larger need means the part should be fixed another way.
- **Boost-only EQ** adds phase problems. Cut instead.
- **Air:** a wide lift at the very top (a "shelf" near 15 to 20 kHz) can add air. Use a small amount in mastering. Too much makes cymbals jump out.

### Common starting areas by source [dance]

| Source | Moves |
| --- | --- |
| Kick | Body 100-200 Hz. Click 1-2.5 kHz or 3-6 kHz. Low impact 40-120 Hz | [K-1007]
| Snare | High-pass near 150 Hz. Snap 2-10 kHz. Body 400 Hz to 1 kHz. Cuts near 400 and 800 Hz help | [K-1017]
| Hats and cymbals | High-pass near 300 Hz. Presence 1-6 kHz. Brightness 8-12 kHz. Roll off above 15 kHz | [K-1016]
| Toms, congas | Shelf below 200 Hz. A wide peak at 300-800 Hz for presence | [K-1018]
| Synth bass | Fatten at 60-80 Hz (narrow). Punch at 120-180 Hz. Rasp at 200-300 Hz | [K-1019]
| Vocal | Cut about 2 dB near 400 Hz for mud. Lift near 10 kHz (with a de-esser). Sibilance near 5-7 kHz |
| Pads, leads | Weight 50-100 Hz. Mud 250-800 Hz. Crunch 1-6 kHz. Brightness 8-12 kHz | [K-1024]

---

## 4. Stereo and width

- **Mono first.** Centered sources gain about 3 dB when the mix is summed to mono. Check the mono sum after every width move.
- **Mono sources for most parts.** Stereo sources fight for space and lower the definition. Keep kick, snare, bass, and lead vocal in the center. [all]
- **Bass effects in mono.** Do not widen the bass. [all dance]
- **Mid/side:** Mid = 0.5 x (Left + Right). Side = 0.5 x (Left - Right). More Mid sounds more centered. More Side sounds wider.
- **High-pass the Side signal** (below about 90 to 120 Hz) to fix low-end phase problems in mono.
- **Pan space:** two parts in the same range can sit about two hours apart on a pan dial (for example 11 and 1 o'clock). Hats stay near the center. Cymbals go about 1 to 2 o'clock. Trance leads can spread from about 2 to 4 o'clock. [dance] [K-1059]
- **Pan law:** a centered part loses about 3 to 6 dB under some pan laws. Re-check the fader after you pan. [K-1058]
- **Mono-friendly widening ideas:**
  - A delay under about 30 ms with low feedback widens a lead or a driving bass without audible repeats. [dance] [K-0843]
  - A delay of about 20 ms with one side polarity-flipped widens a part, but check mono. [all]
  - Pitch widening: +5 cents on one side and -5 cents on the other, or double a vocal detuned by 2 to 5 cents each way. [all] [K-0945]
  - Slow auto-pan: 5 to 10 Hz with low depth. [all] [K-0269]
  - Chorus, flanger, or phaser on a send, with low depth. Flanging and phasing is a house staple, but never on the bass. [house]
- **Close sources have a narrower reverb.** A wide reverb on a close sound collapses its image. A distant sound can use a mono reverb with a long tail and high cut.
- **Vectorscope limits:** it shows overall width, not which part collapses in mono and not which band. Use a stereo or mid/side spectrum analyzer for that.
- **Phase flip check:** if one channel is polarity-flipped, the mix sounds thin with a hole in the middle. Flip one channel in mono. The version with more bass is right.
- **Masters for wide stereo:** wider highs and less width in the mids and bass.

---

## 5. Reverb and delay

- **Reverb return EQ:** cut below about 300 Hz (a roll-off at 200 to 300 Hz) to protect the bass. In mastering, a low cut at 80 to 120 Hz and a high cut at 2 to 4 kHz are common. The right amount depends on genre. Check against a reference. [K-0226]
- **Dark returns** are less obvious as an effect. Bright returns give the effect away.
- **Pre-delay:**
  - Blend (short natural reverb): 10 to 20 ms. [K-0308]
  - Size (tail): 50 ms or more.
  - A close source with stereo reverb: 50 to 90 ms. [dance] [K-1061]
  - A trance lead: about 50 ms and a short tail. [trance]
- **Reverb on every part** smears the gaps and cuts impact. Keep one wide, wet lead and leave the rest dry for contrast. [dance]
- **Short staccato sounds** read as louder and closer than long ones.
- **Tempo-synced delays** sit in the mix. Unsynced ones pop out.
- **Delay time:** `quarter note in ms = 60000 / BPM`. An eighth is half. A sixteenth is a quarter. A triplet eighth is a third of a quarter.

| BPM | Quarter | Eighth | Triplet eighth | Sixteenth |
| --- | --- | --- | --- | --- |
| 120 | 500 | 250 | 167 | 125 |
| 128 | 469 | 234 | 156 | 117 |
| 140 | 429 | 214 | 143 | 107 |
| 174 | 345 | 172 | 115 | 86 |

Times are in milliseconds, rounded.

---

## 6. Movement and arrangement moves

- **Filter movement:** open the low-pass in builds and close it on drops. The sound goes duller, then brighter. Sync LFOs and filter changes to the tempo. [dance]
- **Static sounds bore.** Add slow movement with an LFO, a filter, or a tempo-synced effect.
- **Snare roll:** 16th notes, then 32nd notes, with rising velocity. Use a 4-bar or 8-bar roll before a reprise. A crash marks every 4th bar. [trance, house] [K-0911]
- **Drop out the kick or most percussion** in a breakdown. Bring back hats and snares near the 4th bar of the return. [trance]
- **Build-ups** should use density, tone, width, and effects, not only level. Loudness processing flattens level rises.
- **Keep the build's peak at the track's long-term peak.** Drop the energy before the build.
- **Open the bandwidth in the chorus.** Filter the verse and open to full range in the chorus. [electronic]
- **Make repeats different.** Add a fill, a drop, or a new sound before a part repeats more than about three times. Filter sweeps, skips, small breaks, and crashes all help.
- **No more than about three focal elements** at a time.
- **Silence gives energy.** Do not fill every gap.
- **Contrast fast and slow attacks.** Trance, techno, and big beat use fast attack and release on bass, kick, and snare. House, drum and bass, lo-fi, and chill use a longer bass release so notes almost join.

---

## 7. Groove and drive

- **Push the kick, snare, or bass a tick or two early** for drive. Behind the beat sounds laid back. Ahead sounds nervous or intense.
- **Vary the velocity** of hats. Keep kick and snare near full velocity in trance.
- **Do not over-quantize.** Perfect repetition sounds sterile. Offset notes a few ticks. [all dance]
- **Short bass stabs** (16th notes) feel more frantic than long notes. [K-0799]
- **Strong, weak, medium, weak** is a common house kick velocity pattern.
- **Swing:** heavy swing can make a 4/4 feel like 3/4. [hip-hop, trip-hop, chill]
- **Change the timing offset with a time-offset control, not by dragging regions.** It can be undone.

---

## 8. Level, loudness, and the master

- **Match loudness before you compare.** Use integrated loudness (LUFS), not peak meters.
- **Limiter:** 1 to 4 dB of gain reduction is a sensible range. Set the release long, then shorten it until you hear distortion. Soft limiting is more natural than hard clipping. [K-1047]
- **Do not normalize.** It raises noise and ignores average level.
- **Mastering chain order (one guide):** noise reduction, EQ, reverb (rarely), dynamics, exciter, stereo widening, maximizer.
- **Multiband in mastering:** one or two bands are usually enough. A dance book gives these as starting points. Use them only for a clear reason.
  - Four bands: 0-120 Hz at 4:1. 120 Hz-2 kHz at 2.5:1 to 3:1. 2-10 kHz at 3:1. 10-16 kHz at 2:1 to 3:1.
  - Five bands: 0-180 Hz at 5:1. 180-650 Hz at 2.5:1 to 3:1. 650 Hz-1.5 kHz at 3:1. 1.5-8 kHz at 2:1 to 3:1. 8-16 kHz at 2:1 to 3:1.
  - Fast attack on the lows and highs. A longer attack on the mids.
- **Multiband on the mix bus** hides balance problems. Leave it to mastering.
- **For sibilance,** compress only about 2.5 to 9 kHz. [K-0539]
- **Peak ceiling:** a true peak near -1 dBTP is safe for lossy delivery. Intersample peaks can sit about 3 dB above the highest sample. Use an oversampling limiter or meter. [K-0469]
- **Distortion and clipping** can add loudness with little peak change. They also add harshness and can veil the mids. Use sparingly.
- **Mid/side fixes in mastering:** EQ the Mid channel only to lift a centered vocal. Compress only the Mid, or compress the Mid and expand the Side, to bring up the center. Use this only when a remix is not possible.
- **Tempo change for radio:** stations may speed a track up by a few BPM. Consider that when choosing a master tempo.
- **Time-stretch limits:** avoid stretching riffs or vocals by more than about 25 BPM. Pitch shifts beyond 5 or 6 semitones sound unnatural. Vocals with vibrato stretch badly. [K-0870]

---

## 9. How to judge your own work

- **Listen at a steady level.** Check low and high volume. Quiet checks show if key parts are loud enough. Loud checks show harshness and impact.
- **Do not judge EQ by an instant A/B.** Play each setting for at least 30 seconds before you switch. [K-0560]
- **Check in mono**, on a small speaker, and on headphones.
- **Use a secondary small speaker** or a cheap pair side by side as an intelligibility test.
- **Compare at the end.** Use a few references early to tune your ears. Do detailed references when the first section is nearly done.
- **Use blind A/B or ABX** to fight bias.
- **Rest.** Take breaks. Do not finish a mix late in the day. Listen again the next morning.
- **If a flaw bothers you on three full plays in a row, fix it.**

---

## Sources

Summarized in the author's own words. The numbers are the books' typical values.

- Huber, D. M. and Runstein, R. E., *Modern Recording Techniques*, 7th ed.
- Senior, M., *Mixing Secrets for the Small Studio*.
- Katz, B., *Mastering Audio: The Art and the Science*.
- Snoman, R., *The Dance Music Manual*.
