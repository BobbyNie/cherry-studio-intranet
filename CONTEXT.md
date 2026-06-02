# Cherry Studio Intranet Edition — Domain Context

## Glossary

| Term | Definition |
|------|------------|
| **内网模式 (Intranet Mode)** | Build/runtime flag (`CHERRY_INTRANET_MODE` or `CHERRY_OFFLINE_MODE`). Disables auto-update, telemetry, marketplace, external links, and most third-party integrations. Does **not** mean “localhost only”. |
| **完全离线版 (Fully Offline Edition)** | Same runtime family as intranet mode. Default network posture is **deny-all**, with exceptions only for explicitly configured model provider API endpoints. |
| **模型 Provider 端点 (Provider Endpoint)** | A base URL configured on an enabled model provider (`apiHost`, `anthropicApiHost`). Protocol, host, port, and configured path prefix are the unit of network allowlisting in offline/intranet builds. |
| **企业内网模型服务 (Intranet Model Provider)** | Built-in OpenAI-compatible provider entry for enterprise gateways. It is one way to configure a provider endpoint; it is **not** the only allowed destination. |

## Network Policy (Offline / Intranet)

1. **Default deny**: When public network is disabled, the app blocks outbound HTTP(S)/WS(S) unless the target matches a configured provider endpoint.
2. **Provider-configured allowlist**: Any URL whose protocol/host/port/path prefix matches an **enabled** model provider’s configured `apiHost` or `anthropicApiHost` is allowed. This includes:
   - `localhost` / `127.0.0.1` / `::1`
   - Private IPs (`10.x`, `172.16–31.x`, `192.168.x`)
   - **Internal domain names** (e.g. `llm-gateway.intranet.local`)
3. **Not localhost-only**: Intranet mode does **not** restrict models to the local machine. Users choose the actual API address in provider settings; the runtime trusts those configured endpoints.
4. **Enterprise boundary**: Reachability to the public internet, if undesired, is enforced by enterprise DNS/firewall/proxy — not by hard-coded localhost rules in the app.

## What This Repo Does *Not* Mean

- Do **not** describe intranet/offline mode as “只能访问本机模型”.
- Do **not** require localhost + port whitelist as the sole network exception when a provider already declares its API base URL.

## Related Docs

- `docs/intranet-deployment.md` — build & deployment
- `INTRANET_CHANGES.md` — fork-specific change log
