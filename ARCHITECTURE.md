# QuoteFlow Architecture & System Design

## 1. Role-Based Access Control (RBAC) Design
> **Three-Role Model (`ADMIN` / `MANAGER` / `SALES`) Justification:** We retain an explicit `ADMIN` role beyond the two-role operational spec (`MANAGER` / `SALES`) to strictly decouple system-level user provisioning, role assignments, and audit log governance from day-to-day quotation approval workflows.