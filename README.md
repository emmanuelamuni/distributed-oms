# Distributed Order Management System

Phase 1 [Core]: A single order enters via HTTP, reserves inventory, and confirms, with every foundational distributed-systems pattern (outbox, idempotency, saga orchestration) proven end to end.

## Prerequisites

- Node.js 20+
- pnpm
- Docker + Docker Compose

## Services

![Service Map](docs/service_map.svg)

## System Shape

Four bounded contexts, one saga orchestrator:

| App | Role | Consumes | Produces |
|---|---|---|---|
| `order-capture` | HTTP intake, order creation | — | `order.created`, `inventory.commands.reserve` |
| `order-orchestrator` | Order lifecycle saga | `inventory.reservation.succeeded`, `inventory.reservation.failed` | `order.confirmed`, `order.cancelled` |
| `inventory` | ATP, reservation, distributed locking | `inventory.commands.reserve` | `inventory.reservation.succeeded`, `inventory.reservation.failed` |
| `notification` | Stub log consumer | `order.confirmed`, `order.cancelled` | — |

Full architectural reasoning lives in `docs/adr/`. Read `001` through `007` in order for the complete picture of why the system is shaped this way.


## Local Setup

```bash
pnpm install

# Start Postgres, Kafka, Zookeeper, Redis, Kafka UI
pnpm infra:up

# Run migrations (per bounded context, each owns its database)
pnpm migration:run:order
pnpm migration:run:inventory

# Seed local inventory data
pnpm seed:inventory

# All necessary commands can be found in root package.json
```

## Running the Apps

Each app is a separate NestJS process. Run each in its own terminal:

```bash
pnpm start:order-capture
pnpm start:order-orchestrator
pnpm start:inventory
pnpm start:notification
```

Kafka UI is available at `http://localhost:8080` to inspect topics and consumer groups directly.  
Swagger is available at `http://localhost:3001/docs`.

## Submitting a Test Order

```bash
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 00e54f05-5f72-446b-8c50-aeabcfb61ef5" \
  -d '{
    "customerId": "995bb3ef-422c-48d2-a92f-872dbc8400e5",
    "channel": "web",
    "shippingAddress": {
      "street": "1 Main St",
      "city": "London",
      "state": "LDN",
      "postcode": "E1 1AA",
      "country": "GB"
    },
    "lines": [{ "sku": "WIDGET-0001", "quantity": 2, "unitPrice": 10.99, "currency": "GBP" }]
  }'
```

Response returns immediately with `status: "DRAFT"`. Poll for the final state:

```bash
curl http://localhost:3001/api/v1/orders/{orderId}
```

Expect `CONFIRMED` almost immediately. To see the failure path, submit an order for `GADGET-0001` (intentionally seeded with zero stock), expect `CANCELLED` with reason `INSUFFICIENT_STOCK` or `INVENTORY_UNAVAILABLE`.

## Running Tests

```bash
pnpm test
```

## Known Gaps (Phase 1)

- No authentication. `customerId` is client-supplied and unverified.
- Customer-initiated cancellation has no endpoint (system-initiated only, on inventory failure).
- No dead-letter queue. A consumer error that survives its try/catch is logged and dropped, not retried (Phase 2 scope).
- Idempotency key collision across customers is mitigated by scoping the key to `customerId` from the request body, not yet to a verified identity (see ADR-005).

