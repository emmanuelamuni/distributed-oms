# ADR-003: Saga Orchestration in Per-Context Orchestrator Apps, Not Choreography

## Status
Accepted

## Context
Creating an order is a multi-step distributed workflow: create order, reserve inventory, then confirm or cancel based on the outcome. Two patterns exist for coordinating this: choreography (each service reacts to the previous service's event with no central coordinator) or orchestration (one service owns the sequence and makes the routing decisions).

Choreography avoids an extra hop but scatters the workflow's logic across every participating service, making it difficult to answer "what happens when payment fails" without reading every service's code. Debugging a stuck order means searching logs across N services with no single place that knows the intended sequence.

## Decision
Orchestration, via a dedicated app per bounded context that owns a genuinely branching saga: `order-orchestrator` for the order lifecycle. `order-orchestrator` consumes `inventory.reservation.succeeded`/`.failed` and decides whether to dispatch `ConfirmOrderCommand` or `CancelOrderCommand`. This decision logic lives in a single, named class (`OrderSaga`, in `libs/order/application`), not scattered inline in Kafka consumer wiring, and not duplicated in `inventory` or any other context.

**Naming rule established during Phase 1 build:** an app earns the `-orchestrator` suffix only if it consumes an outcome it did not produce and routes to different commands, against different bounded contexts, based on that outcome. An app with many handlers or complex internal logic is not automatically an orchestrator; `inventory` has both `reserve` and `release` operations but never decides between them itself, it only executes whichever command it's given.

**Centrality is scoped, not systemic.** `order-orchestrator` is the central decision authority for the order lifecycle saga specifically, not for the system as a whole. It has command authority over what other contexts do next (e.g., dispatching `ReleaseReservationCommand` to inventory in Phase 2's compensation matrix) but zero visibility into how those contexts execute those commands internally. Future sagas (fulfillment routing, returns refund routing) get their own orchestrator apps scoped to their own context, not folded into `order-orchestrator`.

## Consequences
- Exactly one place to look when an order-creation saga misbehaves: `order-orchestrator`'s consumer and `OrderSaga`.
- `order-orchestrator` shares its database connection with `order-capture` (both connect to `doms_order`, separately) because it needs write authority over the order aggregate's state transitions; this is the direct consequence of it owning the order lifecycle decision, not a database-sharing violation of ADR-006, since no other context's database is touched.
- Adding a new saga branch (e.g., Phase 2's payment outcome) means adding a new consumer and a new `OrderSaga` method, not touching `order-capture` or `inventory` at all.
- Compensation logic (what to undo when a later step fails) is explicit code in the orchestrator, not implicit or automatic. This must be tested directly, not assumed correct.
