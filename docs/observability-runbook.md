# Production Observability Runbook

## Scope

The web API and worker emit one-line structured JSON telemetry through `@drugdeal/observability`. Console output is always available for container log collection. Optional HTTP sinks provide vendor-neutral external shipping.

## Configuration

- `OBSERVABILITY_HTTP_ENDPOINT`: receives sanitized operational events.
- `OBSERVABILITY_ALERT_ENDPOINT`: receives warning and critical alerts. Falls back to the event endpoint when omitted.
- `OBSERVABILITY_API_KEY`: optional bearer credential for the configured sinks.
- `OBSERVABILITY_TIMEOUT_MS`: outbound delivery timeout; defaults to 2,000 ms and never blocks request completion.
- `APP_RELEASE`: deployed release, image tag, or commit identifier.

Secrets, authorization headers, cookies, sessions, private message content, email addresses, IP fields, and payment-related keys are redacted recursively before console or transport emission.

## Required production alerts

| Alert | Owner | Initial response |
| --- | --- | --- |
| `api.unhandled_error` | API on-call | Inspect request ID, route, deployment release, and adjacent database/Redis health. Roll back when errors correlate with a release. |
| `api.server_error` | API on-call | Confirm whether the response was expected degradation or an unhandled dependency failure. |
| `worker.start_failed` | Platform on-call | Restart once after checking environment and database connectivity; roll back if startup failure follows deployment. |
| `worker.tick_exhausted` | Gameplay operations | Inspect tick name, dead-letter row, database health, and retry history. Reprocess only after correcting the cause. |

## Correlation workflow

1. Capture `x-request-id` from the client response or support report.
2. Search structured logs for the same `requestId`.
3. Correlate with `APP_RELEASE`, route, duration, and status.
4. Review database audit records and worker events within the same time window.
5. Do not paste raw user messages, cookies, tokens, email addresses, or IP addresses into incident channels.

## Health verification

`GET /api/health` exposes whether event and alert sinks are configured, but never returns endpoint URLs or credentials. Production health should report:

- `runtime.observability.enabled: true`
- `runtime.observability.eventSinkConfigured: true`
- `runtime.observability.alertSinkConfigured: true`
- `runtime.observability.releaseConfigured: true`

## Deployment verification

1. Deploy with a unique `APP_RELEASE`.
2. Call `/api/health` and retain the request ID.
3. Confirm `api.request.completed` reaches the external event sink.
4. Trigger a controlled non-production alert and verify routing and ownership.
5. Start the worker and confirm `worker.started` plus all `worker.tick.scheduled` events.
6. Terminate the worker gracefully and confirm shutdown events.

## Failure and rollback

Telemetry transport failures are logged locally as `telemetry.transport_failed` or `telemetry.alert_transport_failed`. They do not fail API requests or worker ticks. If telemetry configuration causes resource pressure, remove the endpoint variables and redeploy; structured stdout logs remain active.
