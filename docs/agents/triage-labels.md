# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `🔍 분류 필요`         | Maintainer needs to evaluate this issue  |
| `needs-info`               | `❓ 정보 필요`         | Waiting on reporter for more information |
| `ready-for-agent`          | `🤖 에이전트 착수가능`  | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `🧑 사람 착수필요`      | Requires human implementation            |
| `wontfix`                  | `🚫 처리 안 함`        | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Exact-string warning

These label names contain emoji, and the tracker matches them as **exact strings**. Two rules follow:

- **Copy the label from this table** — never retype it from memory. A visually identical emoji with a different codepoint sequence is a different label and the lookup silently fails.
- The five emoji here were chosen as **single codepoints with no variation selector** (U+FE0F), which is the most common way emoji strings drift apart. Keep that property if you swap one in.

Quote the whole label in shell commands, since the names contain spaces:

```bash
gh issue edit 42 --add-label "🤖 에이전트 착수가능"
gh issue list --label "🔍 분류 필요"
```

This repo uses **only** these five labels — the GitHub default set (`bug`, `enhancement`, `wontfix`, …) was removed during setup.
