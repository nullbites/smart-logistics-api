# 🚀 Project: Smart Logistics Routing API

## 📝 Overview

This project is a RESTful API designed to solve a core computer science and logistics problem: **finding the most efficient path** between locations on a predefined network (a **Graph**). The goal is to build a robust, production-ready backend service that accepts route constraints and returns optimal routing solutions.

This project was specifically designed to target **TypeScript** and modern backend frameworks (e.g., NestJS, Fastify, Hono).

## ✨ Key Technical Objectives

Successful completion of this project requires demonstrating proficiency in the following backend domains:

1.  **RESTful API Design:** Implement the requested endpoints.
2.  **Algorithm Implementation:** Implementing a complex graph traversal algorithm.
3.  **Type Safety & Structure:** Utilizing TypeScript to enforce strict contracts across the entire application.
4.  **API Documentation:** Generating industry-standard documentation (OpenAPI/Swagger) directly from the codebase.

## ⚙️ Technology Stack

| Component | Technology | Reasoning |
| :--- | :--- | :--- |
| **Language** | **TypeScript** | Required for type safety and advanced structure. |
| **Database** | **In Memory** or **PostgreSQL** or **MongoDB** | To persist the network data (Nodes, Edges, Weights). If in memory just store the last 5 networks |
| **Testing** | **Jest** | Required for comprehensive unit testing of the core algorithm logic. |
| **Documentation** | Auto-generation of OpenAPI Specification from code. |

## 📐 Project Endpoints

The API will expose two main sets of functionality: **Network Management** (CRUD for the Graph) and **Route Calculation** (the core algorithm).

### 1. Network Management Endpoints

| HTTP Method | Endpoint | Description | Body Example |
| :--- | :--- | :--- | :--- |
| **POST** | `/network/upload` | Uploads a new graph definition (Nodes and Edges) and return the ID of the graph. | `{"edges":[{"from":"A","to":"B","cost":10,"maxWeight":5000,"noHazardous":true,"trafficMultiplier":1.5},{"from":"A","to":"C","cost":5}]}` |
| **GET** | `/network/nodes/{id}` | Retrieves all defined nodes/locations from. | *None* |

### 2. Route Optimization Endpoints

| HTTP Method | Endpoint | Description | Core Requirement | Body Example | Suggested Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/route/optimize/{id}` | Submits an asynchronous job to calculate the optimal path, potentially through multiple waypoints. | **Must be asynchronous.** | `{"originNodeId": "A", "destinationNodeId": "E", "waypoints": ["C"], "vehicleProfile": {"type": "truck", "weight": 4000, "hazardous": false}, "departureTime": "08:00"}` | `{"jobId":"job-987"}` (Status 202 Accepted) |
| **GET** | `/route/status/{jobId}` | Polls for the result of the asynchronous route calculation job. | **Must implement the algorithm.** | *None* | `{"status":"COMPLETED", "result":{"graphId":"uuid-123","totalCost":25.5,"path":["A","C","D","E"],"durationMs":4}}` |
| **GET** | `/docs` | Serves the generated **Swagger UI**. | **Must be auto-generated.** | *None* | *None* |

## 🧠 The Core Algorithm Challenge

The primary challenge lies in implementing the logic for the `/route/optimize` endpoint.

### Algorithm Requirement
The backend service must implement **Dijkstra's Algorithm** or **A\* Search** to find the shortest path between the `originNodeId` and the `destinationNodeId`.
If `waypoints` are provided, the algorithm must calculate the optimal path visiting each waypoint in the specified order (Multi-Stop Routing).

### Asynchronous Processing
Route optimization calculations can be resource-intensive. The `/route/optimize` endpoint must not block. It should return a `jobId` immediately (HTTP 202 Accepted), and the client will poll the `/route/status/{jobId}` endpoint to retrieve the calculated route once it is `COMPLETED`.



### Image of Dijkstra Algorithm Graph
![alt text](docs/resources/dijkstras-image.jpeg)


### Complex Scenarios
The algorithm must be able to handle request bodies that include dynamic constraints and advanced routing logic:

1.  **Vehicle Profiles & Constraints:** The request specifies a `vehicleProfile` (e.g., `weight: 4000`, `hazardous: true`). The graph edges define restrictions (e.g., `maxWeight: 5000`, `noHazardous: true`). Edges that cannot be traversed by the vehicle must be dynamically filtered out of the pathfinding calculation.
2.  **Time-Dependent Edge Weights:** Instead of static costs, edge costs should be influenced by the `departureTime`. For example, applying a `trafficMultiplier` defined on the edge during "peak hours" (e.g., applying a 1.5x penalty if departing between 07:00-09:00 or 17:00-19:00). The algorithm must account for this dynamically.
3.  **Multi-Stop Routing (TSP Variant):** If the request includes `waypoints`, the route must sequentially visit the `originNodeId`, all `waypoints` in the specified array order, and finally the `destinationNodeId`.
4.  **Error Handling:** Gracefully handle cases where the destination is unreachable, the input nodes are invalid, or constraints make the route impossible (return an appropriate error status in the job result).

## 🧪 Validation Example

To help candidates validate their implementation, here is a small test graph and expected outcomes.

**Upload Graph Payload:**
```json
{
  "edges": [
    { "from": "A", "to": "B", "cost": 10, "maxWeight": 10000, "noHazardous": false, "trafficMultiplier": 1.0 },
    { "from": "A", "to": "C", "cost": 15, "maxWeight": 5000, "noHazardous": true, "trafficMultiplier": 1.5 },
    { "from": "B", "to": "D", "cost": 12, "maxWeight": 10000, "noHazardous": false, "trafficMultiplier": 2.0 },
    { "from": "C", "to": "D", "cost": 5, "maxWeight": 5000, "noHazardous": true, "trafficMultiplier": 1.0 },
    { "from": "D", "to": "E", "cost": 10, "maxWeight": 8000, "noHazardous": false, "trafficMultiplier": 1.2 }
  ]
}
```

**Test Case 1 (Standard Path):**
- **Request:** `{"originNodeId": "A", "destinationNodeId": "E", "vehicleProfile": {"type": "van", "weight": 3000, "hazardous": false}, "departureTime": "12:00"}`
- **Expected Route:** A -> C -> D -> E
- **Explanation:** Vehicle is light and non-hazardous. The cost is `A->C` (15) + `C->D` (5) + `D->E` (10) = 30. (The path via B would cost 10 + 12 + 10 = 32).

**Test Case 2 (Weight Constraint):**
- **Request:** `{"originNodeId": "A", "destinationNodeId": "E", "vehicleProfile": {"type": "truck", "weight": 6000, "hazardous": false}, "departureTime": "12:00"}`
- **Expected Route:** A -> B -> D -> E
- **Explanation:** The truck exceeds the `5000` max weight limit on edges `A->C` and `C->D`, forcing it to take the path through B.

**Test Case 3 (Hazardous Constraint):**
- **Request:** `{"originNodeId": "A", "destinationNodeId": "E", "vehicleProfile": {"type": "truck", "weight": 3000, "hazardous": true}, "departureTime": "12:00"}`
- **Expected Route:** A -> B -> D -> E
- **Explanation:** The vehicle carries hazardous materials, so it cannot use `A->C` or `C->D` (`noHazardous: true`).

---

## ✅ Submission Checklist & Workflow

A successful submission should include:

* [ ] Complete source code for the REST API.
* [ ] A working implementation of **Dijkstra's Algorithm** within a service layer.
* [ ] Clear **TypeScript Interfaces** for `Node`, `Edge`, and the various Request DTOs.
* [ ] Unit tests using **Jest** for the core routing algorithm (i.e., testing the function that calculates the path directly).
* [ ] Proof that the Swagger documentation is accessible and accurately reflects all endpoints and data schemas.

### 💻 Submission Workflow

The expected delivery method for this project is as follows:

1.  **Fork this Repository:** Create a private fork of the original project repository (or create a new private repository if the project was provided as a zip/template).
2.  **Develop:** Complete all required features and tests within your private repository.
3.  **Invite:** Once development is complete, **invite the hiring manager/recruiter** (or specific email address, e.g., `[Insert Reviewer Email Here]`) as a **Collaborator** to your private repository.
4.  **Notification:** Notify the reviewer that the code is ready and providing the link to the repository or perform an invitation to your repository.

***Please DO NOT submit the code as a zip file or a Pull Request (PR) to the original repository.*** This process allows us to review your commit history and development workflow directly.

---

## 🛠 Implementation Notes

This section documents the implementation added on top of the brief above.
Everything above this line is the original specification and is unchanged.

### Technology choices beyond the base stack

| Area | Choice | Why |
| :--- | :--- | :--- |
| Web framework | Fastify 5 | Schema-first routing; the route schemas double as the OpenAPI source. |
| Validation & schemas | TypeBox via `@fastify/type-provider-typebox` | One schema per route drives validation and the generated document, with static types inferred. |
| API docs | `@fastify/swagger` + `@fastify/swagger-ui` | Generates the OpenAPI 3.1 document from the route schemas and serves Swagger UI at `/docs`. |
| Database | PostgreSQL 16 | Persists networks, jobs, per-job logs, an audit trail, and the reusable A\* segment cache. |
| ORM / migrations | Prisma 7 with the `@prisma/adapter-pg` driver adapter (`pg`) | Prisma 7 connects through a driver adapter; migrations and the seed command are configured in `prisma.config.ts`. |
| Logging | Pino (`pino`, `pino-pretty`) | Structured service log to stdout; per-job log lines are also stored in the database. |
| Testing | Jest with `ts-jest` | A `unit` project for the pure algorithm and an `integration` project that runs against a real PostgreSQL test database. |
| Tooling | `tsx`, `typescript`, `eslint` + `typescript-eslint`, `prettier`, `dotenv` | Type-checked build, linting, formatting, and `.env` loading. |

### Algorithm

The core routing logic lives in `src/algorithm` as pure, dependency-free functions.

- `aStar` performs A\* search over the directed graph. Node coordinates, when
  present on the network, enable an admissible Euclidean heuristic scaled by the
  smallest cost-per-distance ratio in the graph; without coordinates the
  heuristic is zero and the search behaves as uniform-cost search. A\* with a
  zero heuristic is equivalent to Dijkstra's algorithm, so the requirement is
  satisfied either way.
- `canTraverse` removes edges the vehicle cannot use: an edge whose `maxWeight`
  is below the vehicle weight, or whose `noHazardous` flag conflicts with a
  hazardous load.
- Traffic is time-dependent. Each network defines its own peak windows (see the
  data model); an edge inside a peak window has its `trafficMultiplier` applied.
  The departure time is evaluated once for the whole route.
- `planRoute` visits the origin, every waypoint in the given order, and the
  destination, running the search for each leg and concatenating the results.
- Each leg is resolved through a database cache (`RouteSegmentCache`), keyed by
  the network, the two endpoints, the vehicle weight, the hazardous flag, and
  whether the departure is in a peak window. A hit returns the stored path and
  raises its hit count; a miss is computed and written back.

### Request lifecycle and endpoints

Route optimization is asynchronous.

- `POST /route/optimize/{id}` validates the body, checks that network `{id}`
  exists, stores a job with status `PENDING` and the received payload, enqueues
  it, and returns `202` with `{ "jobId": "job-..." }`.
- An in-process worker claims one pending job at a time (configurable with
  `ROUTE_WORKER_CONCURRENCY`), runs it, and records the result payload, the
  duration, and the log lines it produced. Jobs left `RUNNING` by a previous
  process are requeued on start-up.
- `GET /route/status/{jobId}` returns `{ "status": "PENDING" | "RUNNING" }`
  while the job is in flight, `{ "status": "COMPLETED", "result": { "graphId",
  "totalCost", "path", "durationMs" } }` on success, and
  `{ "status": "FAILED", "error": { "code", "message" } }` on failure. It
  returns `404` only for an unknown job id; the HTTP status is `200` for any
  job that exists.

Failure codes in a job result:

- `INVALID_NODE` — an origin, destination, or waypoint not in the network, or
  the network itself was not found.
- `NO_ROUTE` — the destination is unreachable for the given vehicle and
  constraints.
- `INTERNAL` — an unexpected error while running the job (details in the job
  log).

Other endpoints:

- `POST /network/upload` accepts `edges` and, as an extension, an optional
  `nodes` array with `x`/`y` coordinates and an optional `peakWindows` array of
  `{ "start": "HH:MM", "end": "HH:MM" }` ranges. A start later than its end
  wraps past midnight. When `peakWindows` is omitted the network gets the
  default windows `07:00`–`09:00` and `17:00`–`19:00`; an explicit empty array
  means the network has no peak periods. Malformed times such as `26:99` or
  `7:00` are rejected with `400`.
- `GET /network/nodes/{id}` returns the network's nodes, including coordinates
  when supplied.
- `GET /docs` serves Swagger UI; `GET /docs/json` serves the raw OpenAPI
  document.
- `GET /health` is a liveness probe.

Every request except `/health` and `/docs` is recorded in `RequestLog` with its
method, path, status, client address, duration, and capped request and response
bodies; a route optimization submission also stores the assigned job id on its
audit row. All errors share the shape
`{ "error": { "code": "...", "message": "..." } }`.

### Command line usage

The service is a CLI. After `npm run build`:

```
node dist/cli/index.js [serve] [options]
```

- `-h`, `--help` — print usage and exit.
- `-V`, `--version` — print the version and exit.
- `-v`, `--verbose` — raise the log level to debug, which adds, per optimization
  job, the plan, each leg resolved, whether the segment was a cache hit or was
  computed, and the number of nodes A\* expanded.
- `-p`, `--port <n>` — port to listen on (default `3000`, or `$PORT`).
- `-H`, `--host <addr>` — address to bind (default `0.0.0.0`, or `$HOST`).
- `--migrate` — run `prisma migrate deploy` before starting.
- `--seed` — run the seed before starting.

The process logs the requests it receives, the results it returns, and any
errors, and shuts the server, the worker, and the database connection down
cleanly on `SIGINT` or `SIGTERM`.

Environment variables (see `.env.example`):

- `DATABASE_URL` — PostgreSQL connection string (required).
- `DATABASE_URL_TEST` — connection string for the integration test database.
- `PORT`, `HOST` — listen address (overridden by the flags above).
- `VERBOSE` — `true` for debug-level logging.
- `ROUTE_WORKER_CONCURRENCY` — jobs the worker runs at once (default `1`).

### Data model

All tables are in PostgreSQL and managed by the Prisma migrations in `prisma/`.

- `Network` — a graph. Optional `name`, optional `heuristicScale` (the smallest
  edge cost-per-distance ratio, set when every node has coordinates), and a
  creation timestamp.
- `Node` — a location in a network, identified by a `key` unique within the
  network, with optional `x`/`y` coordinates.
- `Edge` — a directed connection with a `cost`, an optional `maxWeight`, a
  `noHazardous` flag, and a `trafficMultiplier`.
- `NetworkPeakWindow` — a peak time range for a network, stored as `startMinute`
  and `endMinute` (minutes of day); `startMinute` greater than `endMinute`
  denotes a window that wraps past midnight.
- `Job` — one route optimization request: the network id, the status
  (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`), the received `requestPayload`,
  the `responsePayload`, an `errorCode`/`errorMessage` on failure, the
  `durationMs`, an attempt count, and lifecycle timestamps. The id has the form
  `job-<uuid>`.
- `JobLog` — one log line produced while a job ran: a level, a message, optional
  structured `data`, and a timestamp, linked to its `Job`.
- `RouteSegmentCache` — a reusable single-leg shortest path, keyed by
  `(networkId, fromKey, toKey, vehicleWeight, hazardous, peak)`, storing the
  `totalCost`, the `path`, the hop count, and a hit count.
- `RequestLog` — the audit trail: method, path, status, optional bodies,
  optional `jobId`, client address, duration, and a timestamp.

`Node`, `Edge`, `NetworkPeakWindow`, `Job`, and `RouteSegmentCache` are removed
with their `Network`; `JobLog` is removed with its `Job`.

### Running from a release

Each merge to `main` publishes a GitHub release with a
`smart-logistics-api-<version>.tar.gz` archive.

1. Download and extract the archive.
2. From the extracted directory, run `bash scripts/bootstrap.sh`. It requires
   Docker and Node.js 20 or newer, and it starts PostgreSQL, installs
   dependencies, applies the migrations, and seeds the validation network.
3. Start the service with `node dist/cli/index.js serve` (or `npm start`).

### Building and running from source

Requirements: Docker with Compose v2, and Node.js 20 or newer.

```
git clone <repository-url>
cd smart-logistics-api
npm run setup        # or: bash scripts/bootstrap.sh, or: make setup
```

`setup` copies `.env.example` to `.env`, starts PostgreSQL in Docker, installs
dependencies, applies the migrations, and seeds the network from the validation
example. Then:

- `npm run dev` — start the service with reload and verbose logging.
- `npm run build && node dist/cli/index.js serve` — start the compiled service.
- `npm test` — run the unit and integration suites (the integration suite needs
  the database from `setup`).
- `npm run migrate` / `npm run seed` — apply migrations or reseed.
- `docker compose --profile full up` — run the database and the service together
  in containers (requires Docker BuildKit / buildx, which ships with current
  Docker).

The `Makefile` collects the same tasks (`make dev`, `make test`, `make package`,
`make docker-build`, and so on). The `examples/` directory holds the validation
graph (`network.json`) and matching optimization requests
(`optimize-standard.json`, `optimize-weight.json`, `optimize-hazardous.json`)
for a quick manual check against a running service.