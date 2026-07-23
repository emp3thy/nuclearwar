## Branching (MANDATORY)

`main` is protected: direct pushes are blocked (GitHub branch protection, admins included) and merging requires a PR with the Claude BugBot check green. Never commit feature work straight to `main` — branch, push the branch, open a PR, let it merge.

After a fresh clone, install the local hooks once: `sh scripts/install-git-hooks.sh`. It adds a `pre-push` guard (rejects direct pushes to main before the round-trip) alongside graphify's hooks. Emergency bypass is `git push --no-verify`; the server rule still catches it.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
