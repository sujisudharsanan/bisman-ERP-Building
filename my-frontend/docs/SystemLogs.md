# System Log Viewer — Diagnostic & Audit View

This page provides real-time monitoring, deep troubleshooting, and historical auditing for technical users. It is wired to the route under System > Server Logs and implemented with a performant, virtualized list and a mini timeline chart.

## Key capabilities

- Columns per entry: Timestamp (UTC/local toggle), Level, Source/Component, Host/Instance, PID, Message (full, copyable). Thread and Trace ID shown in the expanded panel.
- Live tail: Start/stop streaming new logs; auto-scrolls while live.
- Filters: Severity checkboxes, Source dropdown, Query bar with simple structured search (field:value, AND/OR, NOT, quoted strings), and time range presets or custom from/to.
- Timeline: Mini bar chart of log volume over time; click a bar to zoom that minute.
- Detail view: Expand a row for raw message, structured JSON context (pretty), optional stack trace, copy actions, and a Trace ID link (placeholder to tracing tool).
- Export: Download current view as JSON, CSV, or TXT.
- Integrity banner: Persistent note that logs are immutable and retained for audit compliance.

## Query syntax

- Free text: error timeout
- Field-specific: level:ERROR source:"Auth-Service" host:web-1 pid:1234 trace:abcd
- Boolean: level:ERROR AND source:"Auth-Service" AND NOT host:"10.0.0.1"
- Context fields: context.tenant:acme context.latencyMs:200

Fields: level|severity, source|component, host|instance, pid, thread, message, trace, timestamp, context.*

## Backend integration

Replace the mock stream with your backend:
- Streaming: swap `useMockStream` with a WebSocket/SSE that pushes LogEntry objects.
- Historical fetch: hydrate `allLogs` from a paginated API using the same fields. Server-side filtering is recommended for large datasets.
- Trace deep link: set `traceId` and point the anchor to your tracing UI.

Minimal contract for a log entry:
- id: string
- timestamp: number (epoch ms)
- level: CRITICAL|ERROR|WARNING|INFO|DEBUG|TRACE
- source: string
- host: string
- pid: number
- message: string
- optional: thread, traceId, context (object), stack (string)

## Performance notes

- The list is clipped by container height with lightweight DOM rows; keep server-side pagination for millions of rows.
- Timeline bins by minute to keep rendering fast.
- DEBUG and TRACE are hidden by default; toggling reduces noise in high-traffic scenarios.

## Where to find it

- Component: `src/components/system/SystemLogViewer.tsx`
- Page wrapper: `src/modules/system/pages/server-logs.tsx`

## Next enhancements

- Stack the timeline by severity colors.
- Add server-driven query DSL and pagination cursors.
- Add a CSV/JSON NDJSON stream export for large ranges.
- Wire the Trace ID to your distributed tracing system (e.g., Jaeger/Tempo/Zipkin).
