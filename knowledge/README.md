# Knowledge base: sourced claims

`claims.jsonl` holds short facts from recording and mixing books. One fact per line. Every fact has an ID, a book, and a page, so any number in the skills can be traced back.

## What is in it

- Short claims in our own words. Not quotes, not copied paragraphs.
- Numbers are the books' **typical values**. They are not tested on real mixes.
- Page numbers are **PDF page numbers**, not the printed ones. Katz's book was read by OCR (text recognition on scanned pages), so its numbers and pages can have small errors. Its claims say `ocr` in `confidence`.
- Books so far: Senior (*Mixing Secrets for the Small Studio*), Katz (*Mastering Audio*), Snoman (*The Dance Music Manual*). Huber and Runstein (*Modern Recording Techniques*) shaped the playbook, but has **no claims in this file yet**.
- The raw book text and long notes are **not** in this repo. They are copyrighted and stay private.

## Fields

| Field | Meaning |
| --- | --- |
| `id` | `K-0001`, `K-0002`, ... Never reuse or renumber an ID. Skills cite them. |
| `topic` | Short slug, for example `kick-and-bass-and-sub` |
| `claim` | One fact, our own words, under 400 characters |
| `genre` | Array. `universal` if the fact holds for any style |
| `source` | Book short name |
| `where` | PDF page or page range |
| `confidence` | `book-typical` (default) or `book-typical, ocr` |
| `added` | Date |

## Use it

```
node scripts/kb.mjs show K-0801
node scripts/kb.mjs search sidechain kick --genre house
node scripts/kb.mjs topics
node scripts/kb.mjs stats
node scripts/kb.mjs check
```

## Add a claim

```
node scripts/kb.mjs add --claim "Cut below 30 Hz on non-bass tracks" --topic low-end --source Senior --where "pdf p. 120" --genre universal
```

Then cite the new ID in a skill file, like `[K-1127]`, next to the advice it backs. Run `node scripts/kb.mjs check` before you commit. It catches duplicate IDs, missing fields, and cited IDs that do not exist.

## Known limits

- About 220 bullets in the source notes had no page reference and were left out.
- 17 claims were dropped because they matched the book text too closely. Re-write them in your own words to add them back.
- Only about 70 lines in the skills cite an ID. Many numbers in the docs have no ID yet.
- A claim says what one book says. Two books can disagree. See section 4 of `genre-profiles.md`.
