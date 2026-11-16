# Make your own Wraith app in 15 min

Status: not written yet; written in the app-authoring task after the skeleton exists.

This file is a stub. It holds the planned outline only, so the `skeleton-authoring` steering file can link to it. None of the commands below exist yet.

## About "15 min"

"15 min" is the goal in the title, not a measured result. When the guide is written:

- the `app-smith` agent rehearses it on a scratch app, and that time is reported as **agent time**, labelled as such, whatever it turns out to be;
- the author times one human run of the guide, and the README reports that time next to the agent time, each labelled with who was timed;
- if no human run happens, the README says no human run was timed.

## Planned outline

1. **Scaffold** a new app folder with the `new-app` scaffold script, which copies `skeleton/template/` (the minimal app) to `apps/<name>/`.
2. **Write one source:** a poller with an `expand`, or a webhook route with only an `accept`.
3. **Write one rule:** a pure `evaluate(event, ctx)` that proposes an action.
4. **Write one action kind:** `describe` and `execute`, with no `safety` field, so every action waits for approval.
5. **Run it locally** with the skeleton's Node runtime and DEMO events, and approve one action in the approval UI.
6. **Run the core-integrity test** (`npm test`) to prove the app uses the unmodified core.
7. **Then the optional extension points:** an advisor (`reword` or `extract`), aggregates, record types with `parseValue`, `lookup` and retry policy, views and theme, and a safe action kind with a written reason.

See [PLAN.md](../PLAN.md) sections 5.1 (extension points and the minimal app) and 10.2 (this guide).
