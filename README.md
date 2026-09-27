# Orders Ingestion Backend — Sharded CSV Pipeline

A production-grade **Node.js + TypeScript** backend that ingests CSV order files via streaming, distributes records across **3 PostgreSQL shards** using application-level hashing, and archives the raw CSV to **Google Cloud Storage**.

---

## Architecture Overview

```
                          ┌──────────────────┐
                          │   Client / curl   │
                          └────────┬─────────┘
                                   │ POST /upload-orders (multipart CSV)
                                   ▼
                          ┌──────────────────┐
                          │   Express API     │
                          │   (Multer upload) │
                          └──┬───────────┬───┘
                             │           │
             ┌───────────────┘           └───────────────┐
             ▼                                           ▼
    ┌─────────────────┐                        ┌─────────────────┐
    │  GCS Archival    │                        │  CSV Stream      │
    │  (pipe upload)   │                        │  Parser          │
    │                  │                        │  (csv-parser)    │
    └─────────────────┘                        └────────┬────────┘
                                                        │
                                               Row-by-row validation
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Shard Router    │
                                               │  MD5(customer_id)│
                                               │  % 3             │
                                               └──┬────┬────┬───┘
                                                  │    │    │
                                    ┌─────────────┘    │    └──────────────┐
                                    ▼                  ▼                   ▼
                             ┌───────────┐     ┌───────────┐      ┌───────────┐
                             │  Shard 1   │     │  Shard 2   │      │  Shard 3   │
                             │ shard_1 DB │     │ shard_2 DB │      │ shard_3 DB │
                             │ :5432      │     │ :5432      │      │ :5432      │
                             └───────────┘     └───────────┘      └───────────┘
```

---

## Tech Stack

| Layer            | Technology                                       |
| ---------------- | ------------------------------------------------ |
| Runtime          | Node.js + TypeScript                             |
| Framework        | Express 5                                        |
| Database         | PostgreSQL (3 shards via Prisma ORM)             |
| Object Storage   | Google Cloud Storage (fake-gcs-server in Docker) |
| File Upload      | Multer (multipart/form-data)                     |
| CSV Parsing      | csv-parser (streaming)                           |
| Shard Routing    | MD5 hash of `customer_id` mod 3                  |
| Dev Tools        | ts-node, nodemon, Prisma CLI                     |

---

## Project Structure

```
├── docker-compose.yml              # GCS emulator (fake-gcs-server)
├── .env / .env.example             # Environment variables
├── prisma/
│   └── schema.prisma               # Order model schema
├── scripts/
│   ├── migrate.ts                  # Push schema to all 3 shard databases
│   ├── generate-csv.ts             # Generate 3,000-row test CSV
│   └── test-gcs.ts                 # Smoke-test GCS emulator connectivity
└── src/
    ├── config/
    │   ├── env.ts                  # Centralized env config (dotenv)
    │   ├── gcs.ts                  # GCS client (ADC in prod, emulator in dev)
    │   └── prisma.ts               # 3 Prisma clients + shard routing
    ├── utils/
    │   ├── hasher.ts               # MD5 shard index calculator
    │   └── validator.ts            # CSV row validation & type coercion
    ├── middlewares/
    │   ├── upload.middleware.ts     # Multer config (50 MB limit)
    │   ├── logger.middleware.ts     # HTTP request logger
    │   └── error.middleware.ts      # Global error handler
    ├── services/
    │   ├── gcs.service.ts          # Stream-upload file to GCS bucket
    │   ├── parser.service.ts       # Streaming CSV parser with backpressure
    │   └── order.service.ts        # Batch buffer + flush to shards
    ├── controllers/
    │   └── order.controller.ts     # Route handlers
    ├── routes/
    │   ├── order.routes.ts         # API route definitions
    │   └── index.ts                # Root router
    ├── app.ts                      # Express app setup
    └── server.ts                   # HTTP server + graceful shutdown
```

---

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** installed locally (or via pgAdmin)
- **Docker** (for the GCS emulator)

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example env file and adjust credentials if needed:

```bash
cp .env.example .env
```

Default `.env`:
```env
PORT=3000
NODE_ENV=development

GCS_BUCKET_NAME=orders-bucket
STORAGE_EMULATOR_HOST=http://localhost:4443

DATABASE_URL_SHARD_1=postgresql://postgres:root@localhost:5432/shard_1?schema=public
DATABASE_URL_SHARD_2=postgresql://postgres:root@localhost:5432/shard_2?schema=public
DATABASE_URL_SHARD_3=postgresql://postgres:root@localhost:5432/shard_3?schema=public
```

### 3. Start the GCS Emulator

```bash
npm run docker:up
```

This launches the `fake-gcs-server` Docker container on port **4443** with the `orders-bucket` pre-created.

### 4. Create Shard Databases & Apply Schema

Create 3 databases in PostgreSQL (`shard_1`, `shard_2`, `shard_3`), then push the Prisma schema to all shards:

```bash
npm run generate          # Generate Prisma Client
npm run migrate:shards    # Push schema to all 3 shard databases
```

### 5. Start the Dev Server

```bash
npm run dev
```

Server starts on `http://localhost:3000`.

---

## API Endpoints

### `POST /upload-orders`

Upload a CSV file for ingestion into the sharded database.

```bash
curl -X POST http://localhost:3000/upload-orders -F "file=@orders-test-10k.csv"
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded and sharded successfully.",
  "gcsPath": "gs://orders-bucket/orders-1727418900000-orders.csv",
  "metrics": {
    "totalProcessed": 10000,
    "inserted": 10000,
    "skipped": 0
  }
}
```

### `GET /orders?customerId=CUST-1`

Query orders by customer ID (routes directly to the correct shard).

```bash
curl "http://localhost:3000/orders?customerId=CUST-1"
```

### `GET /orders/:orderId`

Look up a single order by ID. Optionally pass `customerId` for a direct shard lookup, otherwise all shards are queried in parallel.

```bash
# Direct shard lookup
curl "http://localhost:3000/orders/ORD-100001?customerId=CUST-1"

# Fan-out across all shards
curl "http://localhost:3000/orders/ORD-100001"
```

### `GET /health`

Health check — verifies connectivity to all 3 PostgreSQL shards.

```bash
curl http://localhost:3000/health
```

---

## CSV Format

The expected CSV header:

```csv
order_id,customer_id,order_date,order_amount,status
ORD-100001,CUST-1,2026-09-15T10:30:00.000Z,129.99,COMPLETED
```

| Column         | Type     | Validation                          |
| -------------- | -------- | ----------------------------------- |
| `order_id`     | String   | Required, trimmed                   |
| `customer_id`  | String   | Required, trimmed, used for sharding|
| `order_date`   | DateTime | Must be a valid parseable date      |
| `order_amount` | Decimal  | Must be ≥ 0                         |
| `status`       | String   | Required, trimmed                   |

Invalid rows are silently skipped and counted in the `skipped` metric.

---

## How Sharding Works

1. Each CSV row's `customer_id` is hashed using **MD5**.
2. The first 8 hex characters are converted to an integer.
3. `shardIndex = integer % 3` determines which PostgreSQL database receives the record.
4. Records are buffered per-shard in batches of **500** and flushed via `createMany` with `skipDuplicates: true`.

This guarantees that **all orders for a given customer always land on the same shard**, enabling efficient single-shard customer lookups.

---

## Google ADC Configuration

The GCS client is initialized in `src/config/gcs.ts` with **zero hardcoded secrets**:

```typescript
// src/config/gcs.ts
const options: StorageOptions = {};

if (ENV.STORAGE_EMULATOR_HOST) {
  delete process.env.STORAGE_EMULATOR_HOST; // prevent SDK legacy emulator mode
  options.apiEndpoint = ENV.STORAGE_EMULATOR_HOST;
  options.projectId = 'emulator-project';
}

export const storage = new Storage(options);
```

**How authentication works across environments:**

| Environment | `STORAGE_EMULATOR_HOST` | What Happens |
|---|---|---|
| **Local Dev** | `http://localhost:4443` | SDK routes all requests to the `fake-gcs-server` Docker container. `apiEndpoint` is set explicitly, `projectId` is a dummy value. No Google credentials needed. |
| **Production (GCP)** | *Unset* | `options` is empty → `new Storage()` automatically uses **Application Default Credentials (ADC)**. On Cloud Run / GKE / Compute Engine, the attached service account's credentials are fetched from the GCP metadata server. No API keys, no JSON files. |
| **Local with real GCP** | *Unset* | Run `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`. The SDK picks these up automatically via ADC. |

**ADC credential lookup order** (when `STORAGE_EMULATOR_HOST` is unset):

1. `GOOGLE_APPLICATION_CREDENTIALS` env → service account JSON file
2. `gcloud auth application-default login` → cached user credentials
3. GCP metadata server → attached service account (Cloud Run, GKE, etc.)

This design ensures the **exact same application code** runs unchanged across local development, CI, and production — only the environment variables change.

Test GCS emulator connectivity:

```bash
npm run test:gcs
```

---

## NPM Scripts

| Script              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Start dev server with hot-reload (nodemon)       |
| `npm run build`     | Compile TypeScript to `dist/`                    |
| `npm start`         | Run compiled production build                    |
| `npm run generate`  | Generate Prisma Client                           |
| `npm run migrate:shards` | Push Prisma schema to all 3 shard databases |
| `npm run generate:csv`   | Generate a 3,000-row test CSV file          |
| `npm run test:gcs`  | Smoke-test GCS emulator upload/download          |
| `npm run docker:up` | Start GCS emulator Docker container              |
| `npm run docker:down` | Stop Docker containers                         |

---

## Database Schema

```prisma
model Order {
  order_id     String   @id
  customer_id  String
  order_date   DateTime
  order_amount Decimal  @db.Decimal(12, 2)
  status       String
  created_at   DateTime @default(now())

  @@index([customer_id])
  @@map("orders")
}
```

The same schema is applied to all 3 shard databases (`shard_1`, `shard_2`, `shard_3`).

---

## Design Decisions

### 1. Application-Level Sharding (over Database-Level Partitioning)

**Decision:** Shard routing is performed in Node.js using `MD5(customer_id) % 3`, with each shard being a completely separate PostgreSQL database and Prisma client.

**Why:** Application-level sharding gives full control over data placement without requiring PostgreSQL extensions (like Citus) or managed sharding services. Each shard is an independent database that can be hosted on separate servers, scaled independently, and backed up individually.

### 2. MD5 Hash-Based Shard Key

**Decision:** Use `MD5(customer_id)` as the hash function for shard routing.

**Why:** MD5 produces a uniform distribution across the hash space, ensuring roughly equal data distribution across shards. Using `customer_id` as the shard key guarantees **data locality** — all orders for a given customer reside on the same shard, enabling single-shard joins and queries.

### 3. Streaming CSV Parsing (over Loading Entire File into Memory)

**Decision:** Use `csv-parser` with `for await...of` async iteration for row-by-row processing with natural backpressure.

**Why:** Streaming ensures constant memory usage regardless of file size. A 50 MB CSV with millions of rows uses the same memory as a 1 KB file. The `for await...of` pattern automatically pauses the read stream when the processing pipeline (validation → batching → database insert) is busy.

### 4. Batch Inserts with `createMany` + `skipDuplicates`

**Decision:** Buffer validated records per-shard in batches of 500, then flush with Prisma's `createMany({ skipDuplicates: true })`.

**Why:** Individual `INSERT` per row would create thousands of database round-trips. Batching reduces this to `ceil(totalRecords / 500)` round-trips. `skipDuplicates: true` makes re-uploads idempotent — uploading the same CSV twice won't cause primary key violations.

### 5. GCS Archival with Graceful Fallback

**Decision:** Upload the raw CSV to GCS before processing, but wrap it in a try/catch so ingestion proceeds even if GCS is unavailable.

**Why:** In development, the GCS emulator may not be running. In production, a transient GCS outage shouldn't block order ingestion into the database. The `gcsPath` field in the response is `null` when the upload is skipped, making it clear to the caller.

### 6. Prisma ORM (over Raw SQL)

**Decision:** Use Prisma as the database ORM with separate `PrismaClient` instances per shard.

**Why:** Prisma provides type-safe queries, auto-generated TypeScript types from the schema, connection pooling, and migration tooling. Multiple clients with different `datasources.db.url` values cleanly model the multi-database shard topology.

### 7. Express 5 with Multer for File Upload

**Decision:** Use Express 5 with Multer middleware configured to write uploads to `os.tmpdir()` with a 50 MB size limit.

**Why:** Writing to a temp file (rather than memory storage) prevents large CSV uploads from exhausting server memory. The temp file is cleaned up in a `finally` block after processing. The 50 MB limit provides a reasonable guardrail.

---

## Production Deployment Notes

1. **Remove `STORAGE_EMULATOR_HOST`** from environment — the GCS SDK will then use ADC.
2. Point `DATABASE_URL_SHARD_*` to your production PostgreSQL instances.
3. Build and run:
   ```bash
   npm run build
   npm start
   ```
