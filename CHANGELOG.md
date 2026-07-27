# Changelog

All notable changes to DOMS are documented here, phase by phase. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each release corresponds to a completed phase, tagged in git as `vX.0.0`.

Entries are never rewritten after release. A later phase that changes earlier behavior gets a new entry describing the change, the old entry stays as an accurate record of what was true at the time.

## [Unreleased]

Work in progress on the next phase. Move to a dated, versioned section below on tag.

## [1.0.0] - The Core 2026-07-27

### Added
- Nx monorepo scaffolding, per-context per-layer library structure (ADR-001)
- `shared/kernel` — aggregate root, domain event, value object, entity base classes
- `shared/events` — typed Kafka integration event contracts
- `shared/idempotency` — HTTP interceptor and Redis-backed store, scoped per-customer (ADR-005)
- `shared/outbox` — outbox pattern with `SELECT FOR UPDATE SKIP LOCKED` polling to support multiple pollers against one table safely (ADR-004)
- `order` bounded context — full domain/application/infrastructure layers, `Order` aggregate, state machine, create/confirm/cancel use cases
- `inventory` bounded context — full domain/application/infrastructure layers, `InventoryNode` aggregate, ATP calculation, Redis-backed distributed locking
- `apps/order-capture` — HTTP intake for order creation and retrieval
- `apps/order-orchestrator` — order lifecycle saga, consumes inventory reservation outcomes and confirms or cancels accordingly (ADR-003)
- `apps/inventory` — Kafka consumer for reservation commands, ATP-checked reservation with distributed locking
- `apps/notification` — stub log-only consumer, proves the notification contract
- Docker Compose local dev stack — Postgres (dual database), Kafka, Zookeeper, Redis, Kafka UI
- Database migrations per bounded context, isolated by schema (ADR-006)
- Inventory seed script for local development
- Full success path and failure path proven end to end: order creation, inventory reservation, confirm/cancel
- Domain layers unit tests with 100% invariant coverage
- ADRs 001 through 007

### Known Gaps
- No authentication; `customerId` is client-supplied and unverified
- Customer-initiated cancellation has no endpoint (system-initiated only)
- No dead-letter queue; failed consumer messages are logged and dropped, not retried
- Idempotency key scoping relies on unverified `customerId`, not a verified identity

## [0.1.0] - Project Inception 2026-05-15

### Added
- Technology stack selected: TypeScript, NestJS, Nx, PostgreSQL, Kafka, Redis, TypeORM
- Architectural philosophy established: DDD, Clean/Hexagonal Architecture, CQRS, Saga orchestration, Outbox, Idempotency
