# ADR-001: Nx Monorepo with Per-Context, Per-Layer Libraries

## Status
Accepted

## Context
DOMS spans multiple bounded contexts (order, inventory, and more in later phases), each following Clean/Hexagonal Architecture with distinct domain, application, and infrastructure layers. These layers need enforced separation, not just conventional separation, since a developer under deadline pressure will otherwise import infrastructure code into domain code the first time it's convenient.

## Decision
Use an Nx monorepo. One Nx library per bounded context per layer: `libs/order/domain`, `libs/order/application`, `libs/order/infrastructure`, and equivalently for every other context. Shared cross-cutting code lives under `libs/shared/*`. Every library carries Nx tags (`scope:order`, `type:lib`, etc.) and `@nx/enforce-module-boundaries` is configured so that:
- `domain` can only depend on `shared/kernel`
- `application` can depend on its own context's `domain` plus `shared/*`
- `infrastructure` can depend on its own context's `domain` and `application` plus `shared/*`
- No context's libraries may depend on another context's libraries directly

Apps (`apps/order-capture`, `apps/order-orchestrator`, etc.) are composition roots only: they wire DI tokens to concrete adapters and expose a transport boundary (HTTP or Kafka). They contain no business logic.

## Consequences
- The dependency direction (`domain <- application <- infrastructure <- app`) is machine-enforced, not just documented. A violation fails the Nx lint/boundary check, not a code review.
- Cross-context communication is forced through events (Kafka) or explicit shared contracts, never a direct import, because the module boundary makes a direct import a build error.
- Nx's affected-graph (`nx affected`) becomes accurate: a change to `libs/order/domain` correctly triggers rebuilds only for `order-capture` and `order-orchestrator`, not `inventory` or `notification`.
- Cost: more libraries to scaffold and more `project.json` files to maintain than a single flat `src/` tree would require. Judged acceptable given the system's stated goal of multi-year extensibility across many bounded contexts.
