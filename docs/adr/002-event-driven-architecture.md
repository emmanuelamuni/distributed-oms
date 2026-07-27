# ADR-002: Event-Driven Inter-Service Communication via Kafka

## Status
Accepted

## Context
Order, inventory, and every future bounded context run as separate NestJS processes with separate databases (see ADR-006). They must coordinate a multi-step workflow (create order, reserve inventory, confirm or cancel) without sharing memory or a database connection.

## Decision
All cross-process communication happens exclusively through Kafka. No app ever calls another app's HTTP endpoint or imports another app's handler directly. Every meaningful state change (order created, inventory reserved, reservation failed) produces an integration event, published to a topic, consumed by whichever app needs to react.

Two categories of hop exist:
- **Straight pipe**: one trigger, one deterministic next action. The producer writes directly to the topic the consumer needs, with no intermediary. Example: `order-capture` writes `inventory.commands.reserve` directly to its own outbox; `inventory` consumes it directly. No orchestrator sits between them, because there's no decision being made, only routing.
- **Decision point**: one class of incoming outcome (success or failure) must route to different commands against different contexts. Only here does an orchestrator app sit in the middle. Example: `order-orchestrator` consumes `inventory.reservation.succeeded` or `.failed` and decides whether to confirm or cancel the order.

## Consequences
- Every app is symmetrically both a publisher and a consumer, based on what it needs to produce and react to, not a fixed role.
- Kafka's at-least-once delivery guarantee means every consumer must be idempotent (see ADR-005).
- No synchronous cross-service call exists anywhere in the system. A slow or down consumer degrades gracefully (messages queue in Kafka) rather than cascading a synchronous failure back to the caller.
- Adding a new consumer to an existing topic (e.g., a future analytics service subscribing to `order.created`) requires zero changes to the producer.
