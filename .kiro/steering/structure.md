---
inclusion: always
---

# Encarta Reborn — Project Structure & Working Laws

## Directory layout
```
kiroween_26/
├─ .kiro/
│  ├─ steering/        # product, tech, structure principles (always included)
│  ├─ specs/           # the encarta-reborn spec (requirements/design/tasks)
│  ├─ hooks/           # agent hooks (source-citation guard, a11y lint, task tests)
│  └─ agents/          # custom agents (source-curator)
├─ scripts/            # build-time open-data fetch + snapshot pipeline
├─ src/
│  ├─ app/             # app shell, routing, boot screen
│  ├─ features/
│  │  ├─ explore/      # globe / map place picker
│  │  ├─ article/      # sourced article + facts + citations
│  │  ├─ trails/       # curiosity-link rail (graph-derived, not algorithmic)
│  │  └─ log/          # expedition log + personal notes
│  ├─ data/            # schema.ts, snapshot loader, validators
│  ├─ ui/              # retro design system (tokens, primitives, sounds)
│  └─ lib/             # helpers, storage, graph utilities
├─ public/
│  └─ data/            # the bundled licensed snapshot JSON (built by scripts/)
└─ tests/
```

## Working laws (apply to every change)
1. **Honor the anti-feed manifesto in product.md.** It outranks convenience.
2. **No unsourced facts.** Any code path that renders a fact, summary, or media
   must read a record that carries >=1 valid `Source`. Guarded by a hook.
3. **Offline-first.** Do not introduce a runtime dependency on a third-party API
   in the critical path. Data access goes through the snapshot loader.
4. **Accessibility is not optional.** New interactive UI ships keyboard-navigable
   with semantic markup and respects prefers-reduced-motion.
5. **Keep the loop coherent.** Every feature should serve boot → explore → article
   → trails → log. If it doesn't, question whether it belongs.
6. **Document the Kiro story.** When a spec task is completed, note which Kiro
   feature (spec/steering/hook/agent/MCP) drove it, for the submission write-up.

## Naming
- Features are folders under `src/features/<feature>`.
- Data types are PascalCase; the canonical schema is `src/data/schema.ts`.
- Tests live beside the code as `*.test.ts(x)` or under `tests/`.
