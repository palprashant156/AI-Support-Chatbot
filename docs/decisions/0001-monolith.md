# ADR 0001 — Modular monolith, no microservices for MVP

Date: 2026-10-10. Status: Accepted.
Context: Solo portfolio, ₹0, single dev machine.
Decision: One Express app with module folders (chat/conversations/knowledge/orders/...), Postgres + memory fallback.
Consequences: Simple deploy/test, clear import boundaries (services never import provider SDKs). Split later only if a module needs independent scaling.
