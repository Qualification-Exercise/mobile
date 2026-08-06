# Project instructions

## Code review convention: AI-REVIEW / AI-ANSWER

The user leaves inline comments in the code prefixed with `AI-REVIEW:`. These are
questions, doubts, or observations directed at me.

When I see an `AI-REVIEW:` comment I must:

1. Analyze it and decide whether there is real room for improvement or a fix.
2. Write my response directly **below** the `AI-REVIEW:` comment, prefixed with
   `AI-ANSWER:`.
3. Keep the answer in clear, human-readable, plain language — explain the "why",
   not just restate the code. Avoid jargon where a simple explanation works.
4. If a fix is warranted, make it and explain what changed. If the current code
   is already correct, defend the choice honestly and note it's fine as-is.
5. Do not remove the original `AI-REVIEW:` comment — leave it above my
   `AI-ANSWER:`.

## State & eventing: prefer MobX over custom pub/sub

Use a MobX store for reactive state and cross-component eventing — observable
state, actions, and `observer` components. Do **not** hand-roll pub/sub
solutions (listener `Set`s, subscribe/publish functions, event emitters) when a
store can do the job.
