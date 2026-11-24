# Genre profiles: how the same number reads in different styles

> **Claim IDs.** A tag like `[K-0801]` points to a sourced fact (book and page) in `knowledge/claims.jsonl`. Run `node scripts/kb.mjs show K-0801` to read it. Lines without a tag have no ID yet.

Read this after you know the genre. The same report can be healthy in one style and a problem in another. A crest factor of 19 dB is normal for a pre-master, wrong for a club master, and fine for a jazz record.

**Ask first.** If the user did not name a genre, ask. If you must guess, use `tempo`, the sub note, and the spectrum, and say that you guessed.

**About the numbers.** They are typical values from four books (see [Sources](#sources)). Each book leans toward its own world:

- Senior: band, pop, rock, hip-hop and R&B mixing, with some electronic notes.
- Katz: mastering, from classical and acoustic work to pop and rock, from the CD era.
- Snoman: dance music production. It is the only source for dance sub-genres.
- Huber and Runstein: general recording practice.

None of them covers streaming loudness normalization in depth. For modern loudness targets, use the table in the `audio-forensics` skill.

---

## 1. Quick switch

| Genre | Tempo (BPM) | Low end | Dynamics in the report | Stereo | Typical shape |
| --- | --- | --- | --- | --- | --- |
| House, deep house | 110-140 | Short kick, centered bass. Bass often moves under a steady melody | Crest well under 14 dB once mastered. Light pumping is a style choice | Bass and kick mono. Width on leads and effects | Drum-only intro and outro, 16 to 32 bars each | [K-1105]
| Techno | 130-150 | Short, sharp bass, sometimes none. Kick and drums lead | Constant energy. Change comes from filters, not new parts | Bass mono. Heavy loop layering | Flat energy. Slow filter and EQ movement |
| Trance | 125-150 (most 137-145) | Tight kick. Simple off-beat bass. Lead carries the track | Strong kick and bass pumping is normal | Bass mono. Leads wide | Long build, breakdown, big reprise. Blocks of 4, 8, 16, 32 bars |
| Hip-hop, trip-hop | 80-110 (trip-hop 100-120) | Deep, boomy kick (30-60 Hz). Bass often a plain, played line | Drums often uncompressed. Little low-end pumping | Vocal mono center. Doubles panned for emphasis | Short loop repeated. The vocal gives the movement |
| Ambient, chill-out | 80-120 (most 110-120) | Very deep, soft kick (about 40 Hz). Few hard hits | Loops often uncompressed. Wide dynamics are fine | Soft and wide is common. Bass still mono | Often verse and chorus shapes. No fixed form |
| Drum and bass | Very fast (the books give no number) | Bass is like a long-decay kick. Sub is a clean sine | Not covered in detail by the sources | Bass mono | Not covered in detail by the sources |
| Pop, rock | Varies | Kick and bass must share space. Many parts need a high-pass | Crest about 14 dB or less after mastering. Pop dynamic range about 6 to 10 dB | Lead, kick, snare, bass in the center | Verse, chorus, bigger last chorus |
| Classical, acoustic, jazz | Varies | Natural. Little processing | Crest up to about 20 dB. Wide dynamics expected | Natural image. Stay compatible with mono | Follows the music |

Dubstep is not covered by these sources. Say so if the user asks about it.

---

## 2. Reading the report by genre

### Loudness and crest factor

`dynamics.crestFactorDb` is peak minus average level. The books use the same idea.

- **Classical, acoustic, jazz:** crest of 17 to 20 dB is normal. Do not ask for compression. Do not peak a low-crest file to full scale. [K-0685]
- **Pop, rock, folk:** crest near 14 dB is a common target for a moderately compressed master. Dynamic range of 6 to 10 dB is typical. Soft passages 8 to 15 dB below the peak do not last long in pop. [K-0508]
- **Dance:** loud and flat is part of the style, but one source says the peak-to-average gap should not fall under about 4 to 5 dB. Below that, the kick loses its punch and the track sounds flat. [K-1046]
- **Hip-hop:** a raw, less-compressed drum sound is part of the style. Heavy compression can remove it.

Over-compression shows up as low crest, flat tops in `waveform.png`, a weak kick, and a track that sounds loud but small. Radio and streaming turn loud files down or squash them, so extra loudness often buys nothing.

### Low end and sub

- **Kick sine, by style:** hip-hop thud 30-60 Hz, lo-fi 50-80 Hz, club kick 70-100 Hz, trance kick near 90 Hz with a falling pitch. Compare with `spectral.dominantSubPeakHz`. [K-0892]
- **Chill and slow styles:** a deep kick near 40 Hz. A tight kick can sound too urgent there. [K-0894]
- **House, trance, hip-hop, big beat:** the kick and bass often fight. See the `production-techniques` skill.
- Sub under about 50 Hz is cut by many club systems and most small monitors. It still counts for club music, so check it on a full-range system. [K-1004]
- A heavy bass pairs with a tight kick. A light bass pairs with a looser kick.

### Tone

- **Deep house, dub, chill:** a dark top end is fine. Low `Air` energy is not a fault.
- **Trance:** the lead holds the mid and upper-mid range. Other parts must leave that space. Sparse percussion is deliberate.
- **Techno:** the sound is shaped with cuts, filters, and EQ more than with melody.
- **Hip-hop:** less top end on the rap vocal than on a pop vocal. Vinyl crackle, bit-crushing, and lo-fi are on purpose.
- **Slow, relaxed masters:** one book suggests a mid cut so the lows and highs stand out. For aggressive tracks it suggests the opposite: less bass and hats so the mids lead.

### Stereo

- **All dance:** kick, snare, bass, and vocals sit in the center. Width goes on leads. Mono sources for most parts keep the mix clear.
- **Hip-hop:** vocal in the center. Double-tracked phrases can go left and right.
- **Radio and FM:** mono is loudest and cleanest. Wide stereo loses loudness. Mix dry for broadcast.
- **Vinyl:** keep kick and bass near the center and below about 40 Hz out of the groove. Heavy bass shortens the side length.

---

## 3. Arrangement by genre

Use `tempo` and `timeline` together. To turn bars into seconds:

`seconds = bars x 4 x 60 / BPM`

At 124 BPM, 32 bars last about 62 seconds. At 130 BPM, 16 bars last about 30 seconds.

Dance tracks use blocks of 4, 8, 16, or 32 bars. A new part that enters at bar 7 or 13 sounds wrong to dancers.

**Club structure (house, techno, trance, general):**

| Section | Typical length | What changes |
| --- | --- | --- |
| Intro | 16 to 32 bars | Drums only, so a DJ can mix in |
| Body 1 | 16 to 32 bars | Bass joins. First melody comes later |
| Drop or breakdown | 4 to 32 bars | Drums thin out. Kick may stay. A filtered hook or pads enter |
| Build | 4 to 8 bars | Snare roll that gets faster and louder. Filter opens | [K-0908]
| Body 2 and reprise | 32 bars, sometimes 64 | The fullest section. A crash often marks every 4th bar | [K-0909]
| Outro | 16 to 32 bars | Drums only, so a DJ can mix out |

- Total length for a club track is about 6 to 8 minutes.
- Many guides want at least 16 bars of clean percussion at the start and end, and prefer 32. [K-1107]
- A filter that closes on a drop and opens on a build is a common move. In the report this shows as a fall and then a rise in `centroidHz`.
- Techno holds the energy level steady. A flat `rmsDbfs` timeline is normal there.
- Hip-hop repeats the same bars. Look for few changes in the timeline, not a big arc.
- Pop-style shapes (verse 16 bars, chorus 8 bars) also show up in chill-out and trip-hop. [K-0974]
- If the user wants a radio or A&R cut, the main elements should start within about 20 to 30 seconds. [K-0988]

---

## 4. Where the books disagree

Context decides, not the book. When two numbers clash, check the job.

| Topic | One view | Other view | How to choose |
| --- | --- | --- | --- |
| Compressor attack | Mastering: attack about 50 to 300 ms, release about 50 to 500 ms | Dance kick: fastest attack | Mastering a full mix vs shaping one kick. A fast attack is a style tool on a single hit. | [K-0516]
| Bus compression | Glue: 2 to 3 dB, ratio under 2:1, slow attack | Rock or aggressive: up to about 8 dB of pumping | Pumping is a style choice. Dance often wants about 2 dB of rhythmic pump. |
| Multiband | Mastering: one or two bands is usually enough | A dance book gives four-band and five-band starting points | Fewer bands is safer. Use more only for a clear reason. |
| Low-end high-pass | Katz: sharp high-pass below about 40 Hz only on a calibrated monitor | Senior: raise the cutoff until the low end changes, then back off about 15% | Per-track high-pass is fine. Do not filter a master blind. | [K-0565]
| Loudness | Katz: keep dynamics, do not chase loudness | Dance: loud and in your face | Genre and delivery decide. Check the loudness table in the `audio-forensics` skill. |

---

## 5. Sources

Summarized in the author's own words. The numbers are the books' typical values.

- Huber, D. M. and Runstein, R. E., *Modern Recording Techniques*, 7th ed.
- Senior, M., *Mixing Secrets for the Small Studio*.
- Katz, B., *Mastering Audio: The Art and the Science*.
- Snoman, R., *The Dance Music Manual*.
