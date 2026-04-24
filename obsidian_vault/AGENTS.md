# OpenSwarm Wiki Schema

This vault follows the LLM wiki pattern:

- `raw/` stores immutable source material and downloaded assets.
- `wiki/` stores LLM-maintained markdown pages only.
- `index.md` is the content map of the wiki.
- `log.md` is the append-only chronological history.

## Agent rules

1. Never edit or delete files in `raw/`.
2. Update `index.md` whenever a wiki page is created or materially changed.
3. Append a dated entry to `log.md` for ingests, queries that create durable outputs, and lint passes.
4. Prefer cross-links between relevant wiki pages using Obsidian `[[Page Name]]` format.
5. File durable synthesis back into `wiki/` instead of leaving it only in chat.
6. Record contradictions and stale claims explicitly when new sources change the picture.

## Recommended workflow

1. Add source material to `raw/sources/`.
2. Create or update a summary page in `wiki/sources/`.
3. Update related concept/entity pages in `wiki/concepts/`, `wiki/entities/`, or `wiki/projects/`.
4. Refresh `index.md`.
5. Append a timestamped entry to `log.md`.
