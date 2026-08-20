# Cherry Studio Intranet Edition — Domain Context

## Glossary

| Term | Definition |
|------|------------|
| **内网模式 (Intranet Mode)** | Build/runtime flag (`CHERRY_INTRANET_MODE` or `CHERRY_OFFLINE_MODE`) that enables the deny-all network guard. Auto-update, telemetry, marketplace, and external links are controlled by separate `CHERRY_DISABLE_*` flags used by intranet release builds. Does **not** mean “localhost only”. |
| **完全离线版 (Fully Offline Edition)** | Same runtime family as intranet mode. Default network posture is **deny-all**, with exceptions only for hostnames/IPs explicitly configured in the runtime network allowlist. |
| **模型 Provider 端点 (Provider Endpoint)** | A base URL configured on a model provider (`apiHost`, `anthropicApiHost`). It selects the request destination, but does **not** automatically add that destination to the runtime allowlist. |
| **企业内网模型服务 (Intranet Model Provider)** | Built-in OpenAI-compatible provider entry for enterprise gateways. Its host must be present in the runtime network allowlist like any other destination. |

## Network Policy (Offline / Intranet)

1. **Default deny**: When public network is disabled, the app blocks outbound HTTP(S)/WS(S) unless the target hostname/IP matches the runtime allowlist.
2. **Settings-managed allowlist**: Administrators manage hostname/IP rules under **Settings → General → Intranet network allowlist**. Exact hosts, IPs, and wildcard domains such as `*.corp.example.com` are supported. Rules do not grant arbitrary protocols, and URLs containing credentials are rejected. Typical allowed targets include:
   - `localhost` / `127.0.0.1` / `::1`
   - Private IPs (`10.x`, `172.16–31.x`, `192.168.x`)
   - **Internal domain names** (e.g. `llm-gateway.intranet.local`)
3. **Not localhost-only**: Intranet mode does **not** restrict models to the local machine. Users choose the API address in provider settings, and administrators separately allow its hostname/IP in the network allowlist.
4. **Enterprise boundary**: Reachability to the public internet, if undesired, is enforced by enterprise DNS/firewall/proxy — not by hard-coded localhost rules in the app.

## What This Repo Does *Not* Mean

- Do **not** describe intranet/offline mode as “只能访问本机模型”.
- Do **not** assume that configuring or enabling a provider automatically changes the runtime network allowlist.

## Related Docs

- `docs/intranet-deployment.md` — build & deployment
- `INTRANET_CHANGES.md` — fork-specific change log
