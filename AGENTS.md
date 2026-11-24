# Using this repo with any coding agent

This file is for agents that do not load Claude-style skills (Codex, Gemini, ChatGPT agents, and others). Claude Code and Antigravity can also use the skills in `skills/` directly.

Needs: Node 20 or newer, `ffmpeg` and `ffprobe` on PATH. If the agent has no shell, ask the user to run the commands and paste the output.

## Order of work

1. **Ask the genre.** If you cannot ask, guess and say it is a guess. Never assume it.
2. **Analyze the audio.** Use the bounced `.wav`, not an Ableton `.asd` file (that is only a cache).
   ```
   node scripts/analyze-audio.mjs "<file>" --out-dir "<out-dir>"
   ```
   A 4-minute track takes about 10 to 15 seconds. Read `<out-dir>/report.json`, then `waveform.png` and `spectrogram.png` if you can see images.
3. **Read the skill files in this order:**
   1. `skills/audio-forensics/SKILL.md`: what the report fields mean, and the loudness table by delivery stage.
   2. `skills/mix-master-review/references/engineer-playbook.md`: the order of checks.
   3. `skills/mix-master-review/references/genre-profiles.md`: how the numbers read in the user's genre.
   4. `skills/production-techniques/references/techniques.md`: how to make each fix.
4. **Write the answer** in the layout from `skills/audio-forensics/SKILL.md` ("Output Format Guidelines").
5. **End with a checklist page.** Write `notes.json` (format: `examples/sample-notes.json`), then run:
   ```
   node scripts/make-checklist.mjs --notes notes.json --report <out-dir>/report.json --out <out-dir>/checklist.html
   ```
   Give the user the path to `checklist.html`.

## Which source wins

The user beats the stage table. The stage table beats `genre-profiles.md`. `genre-profiles.md` beats the playbook's rules of thumb.

## Sourced facts

Numbers from books carry IDs like `K-0801`. They live in `knowledge/claims.jsonl`.

```
node scripts/kb.mjs search sidechain --genre house
node scripts/kb.mjs show K-0801
node scripts/kb.mjs check
```

Cite the ID when you quote a book number. To add a fact, use `kb.mjs add`, then cite it where it applies. Book numbers are typical values, not rules. Put no raw book text in this repo.

## Do not

- Do not claim to hear the audio. Anchor every statement in the report or the plots.
- Do not give a number without saying it is a starting point.
