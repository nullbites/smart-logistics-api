# Examples

Payloads for exercising the service by hand or with the runner script.

## Single payloads (from the readme validation example)

- `network.json` — the graph to upload.
- `optimize-standard.json`, `optimize-weight.json`, `optimize-hazardous.json` —
  the three readme test-case request bodies.

## Scenario networks

Each `network-<n>-*.json` file bundles one graph plus five route optimizations,
and every optimization carries an `expected` block that states whether it is
solvable and, if so, the exact path and total cost.

### `network-1-freight-corridor.json`

Six nodes **with coordinates** (so the network gets a heuristic scale) and the
**default peak windows** (07:00-09:00, 17:00-19:00). The direct highway leg
`X -> Z` is capped at 4000 kg, bans hazardous loads, and doubles in cost at
peak; two longer bypasses (via `Y`, via `P`) carry no such limits.

| Case | Vehicle | Departure | Feature exercised | Expected |
| :--- | :--- | :--- | :--- | :--- |
| N1-R1 | van 2000 kg | 12:00 | baseline shortest path | `W -> X -> Z -> Q`, cost 24 |
| N1-R2 | truck 6000 kg | 12:00 | weight limit filters the highway | `W -> P -> Z -> Q`, cost 29 |
| N1-R3 | truck 3000 kg, hazardous | 12:00 | hazardous bans filter two edges | `W -> P -> Z -> Q`, cost 29 |
| N1-R4 | van 2000 kg | 08:00 | peak multipliers change the winner | `W -> Y -> Z -> Q`, cost ~31.2 |
| N1-R5 | truck 6000 kg, waypoint `X` | 12:00 | waypoint forces a dead-end leg | **not solvable** — `NO_ROUTE` |

### `network-2-island-grid.json`

Six nodes **without coordinates** (heuristic scale is null, so A\* runs as
uniform-cost search) and a **single custom peak window that wraps past
midnight**, 22:00-05:00. `H -> A2` triples at peak; `A2 -> C2` is capped at
3000 kg; `H -> B2` and `B2 -> D2` ban hazardous loads; `A2 -> D2` is capped at
2000 kg. `K2` has an edge out to `H` but nothing points at it.

| Case | Vehicle | Departure | Feature exercised | Expected |
| :--- | :--- | :--- | :--- | :--- |
| N2-R1 | van 1500 kg | 10:00 | off-peak shortest path | `H -> A2 -> C2 -> D2`, cost 19 |
| N2-R2 | van 1500 kg | 23:30 | wrapping peak window changes the winner | `H -> B2 -> D2`, cost 27 |
| N2-R3 | truck 2500 kg, hazardous | 04:00 | hazardous + weight leave one legal path | `H -> A2 -> C2 -> D2`, cost 39 |
| N2-R4 | van 1000 kg, waypoint `Z9` | 10:00 | unknown waypoint | **not solvable** — `INVALID_NODE` |
| N2-R5 | van 1000 kg, destination `K2` | 10:00 | known node with no inbound edges | **not solvable** — `NO_ROUTE` |

## Running the scenarios

Start the service (it needs the database from `npm run setup`):

```
npm run build && node dist/cli/index.js serve
```

Then, from another shell:

```
node examples/run.mjs                       # against http://localhost:3000
node examples/run.mjs http://127.0.0.1:4130 # against another address
```

The script uploads each `network-<n>-*.json`, submits its optimizations, polls
`/route/status`, and checks each result against the file's `expected` block. It
exits non-zero if any case does not match.
