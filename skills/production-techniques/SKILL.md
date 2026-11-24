---
name: production-techniques
description: How to make a mixing, production, or mastering move, with starting values. Kick and bass, compression, EQ, stereo and width, reverb and delay, movement and arrangement, groove, loudness and limiting, and how to judge your own work. Use when the user asks how to fix or shape a sound (muddy kick, weak low end, harsh top, flat mix, too quiet), even when there is no audio file. Pairs with mix-master-review, which finds the problem.
---

# Production Techniques

This skill answers "how do I make that move?". It works without an audio file.

## Steps

1. Know the genre. If the user did not say, ask. Genre tags in `techniques.md` show where a move fits.
2. Read [references/techniques.md](references/techniques.md). Find the section for the problem.
3. Give a starting value. Say it is a starting point. Tell the user to set the final value by ear, with the effect bypassed at the same loudness.
4. If the user has an audio file and no diagnosis yet, load `audio-forensics`, then `mix-master-review`, to find the problem first.

## Where numbers come from

Numbers from books carry a claim ID such as `K-0042`. The full list is in `knowledge/claims.jsonl` at the repo root. Run `node <repo-root>/scripts/kb.mjs search "sidechain"` to find claims by word, or `show K-0042` for one claim with its book and page.

How the genre reads in the numbers is in `../mix-master-review/references/genre-profiles.md`.
