---
name: mix-master-review
description: Review a mix or master the way a mixing or mastering engineer would. Turns audio-forensics telemetry (report.json plus waveform and spectrogram) into a diagnosis and ordered DAW moves. Covers file health, level and headroom, low end and mono, tonal balance, stereo, arrangement, key and tempo trust, a hand-off checklist for mastering, and reference comparison. Use after running the analyzer, or when the user asks if a mix is ready for mastering, why it sounds muddy, thin, harsh or quiet, or how it compares with a reference.
---

# Mix and Master Review

This skill reads the numbers from `audio-forensics` and says what to do about them. It needs a `report.json`. If the user has no report yet, load `audio-forensics` first and run the analyzer.

## Steps

1. **Ask the genre.** If you cannot ask, guess from `tempo`, the sub note, and the spectrum. Say it is a guess.
2. Read [references/engineer-playbook.md](references/engineer-playbook.md). It sets the order of checks and the "if you see X, try Y" moves.
3. Read [references/genre-profiles.md](references/genre-profiles.md) to see how the same numbers read in that genre.
4. For how to make a fix (EQ, compression, width, limiting), load the `production-techniques` skill.
5. Write the answer. Use the layout in `audio-forensics` ("Output Format Guidelines"). The playbook's section 12 sets what goes in each part.
6. **End with a checklist page.** Write a `notes.json` (format and example: `examples/sample-notes.json`). It holds the verdict, the moves in priority order with a "why" and a "check" for each, what the report cannot tell, and your questions. Cite claim IDs on moves that rest on a book number. Then run:
   ```
   node <repo-root>/scripts/make-checklist.mjs --notes notes.json --report <out-dir>/report.json --out <out-dir>/checklist.html
   ```
   The page is one standalone HTML file. The producer can tick moves off, write notes, and print it. In Claude, also publish it as an artifact. In other agents, give the file path.

## Which source wins

What the user says beats the stage table in `audio-forensics`. The stage table beats `genre-profiles.md`. `genre-profiles.md` beats the playbook's rules of thumb.

## Where numbers come from

Numbers from books carry a claim ID such as `K-0042`. The full list is in `knowledge/claims.jsonl` at the repo root. Run `node <repo-root>/scripts/kb.mjs show K-0042` to see the claim, book, and page. Book numbers are typical values. They are not tested on real mixes. Tell the user to trust their ears over any number.
