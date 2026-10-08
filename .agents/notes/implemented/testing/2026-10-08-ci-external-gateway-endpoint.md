# Agent Note: Secret-bearing CI runs against the Threerouter gateway

Status: implemented

English | [中文](2026-10-08-ci-external-gateway-endpoint.zh.md)

## Problem

The repository's credential-bearing CI steps authenticate with the `DEEPSEEK_API_KEY_EXTERNAL` secret, which now holds a Threerouter key. The two workflows that map that secret — [.github/workflows/e2e.yml](../../../../.github/workflows/e2e.yml) and [.github/workflows/build-exe-for-python-sdk.yml](../../../../.github/workflows/build-exe-for-python-sdk.yml) — still pinned `DEEPSEEK_BASE_URL` to the first-party endpoint `https://api.deepseek.com/anthropic`, the value recorded when the secret was a first-party key ([that decision](2026-06-19-real-api-e2e-ci.md)). A Threerouter key cannot authenticate against the first-party host, so the pin pointed every credential-bearing step at an endpoint that rejects its own key: the endpoint move belongs to the same change as the key, not to a follow-up.

The Python black-box smoke adds a second constraint. It requires an explicit `DEEPSEEK_BASE_URL` (it refuses to run without one) and drives a model id compiled into the script, so the endpoint move alone does not make it runnable against a new host.

## Decision

Both secret-bearing workflows pin `DEEPSEEK_BASE_URL` to the gateway, `https://www.threerouter.com`. The Python smoke gains a `DSH_SMOKE_MODEL` environment override — defaulting to its previous built-in id — and both installed-wheel live steps pin that variable to `deepseek-v4.1-flash`. The real-API suites that drive first-party DeepSeek surfaces detect the pin and skip themselves.

### The gateway needs no path suffix

[messages-api.ts](../../../../packages/llm/llm-deepseek/src/messages-api.ts) normalizes a base URL to a `.../v1` root and the adapter posts to `/messages`. The bare gateway origin therefore resolves to `POST https://www.threerouter.com/v1/messages`, verified live returning 200 — the same request shape the adapter sends to the first-party `/anthropic` base. Nothing else about the request changes; the wire protocol is Anthropic Messages either way.

### The smoke's model id is pinned, not assumed

The smoke hardcoded `deepseek-v4-flash`. The gateway owns its model catalog, so the id the smoke requires is now an explicit CI input rather than an assumption about a third party's routing. Verified live at the gateway: both the built-in `deepseek-v4-flash` and the pinned `deepseek-v4.1-flash` return 200 and complete an Anthropic `tool_use` turn, which is what the smoke's two tool-using turns need. The pin is the same hermetic reasoning as the base-URL pin — the CI boundary states the model it needs instead of inheriting one.

### First-party DeepSeek suites skip themselves

Five `*.e2e.ts` files assert first-party behavior that is not the gateway's to provide: [llm-deepseek `adapter.e2e.ts`](../../../../packages/llm/llm-deepseek/tests/adapter.e2e.ts), [llm-deepseek `runtime.e2e.ts`](../../../../packages/llm/llm-deepseek/tests/runtime.e2e.ts), [llm-pi-ai `adapter.e2e.ts`](../../../../packages/llm/llm-pi-ai/tests/adapter.e2e.ts), [subagent-claude-code `real-deepseek.e2e.ts`](../../../../packages/subagent/subagent-claude-code/tests/real-deepseek.e2e.ts), and [subagent-codex `real-deepseek.e2e.ts`](../../../../packages/subagent/subagent-codex/tests/real-deepseek.e2e.ts). Each gates its suite on the same predicate:

```ts
const OFFICIAL_ENDPOINT_CONFIGURED = process.env.DEEPSEEK_BASE_URL?.startsWith('https://api.deepseek.com') ?? true
```

When the environment pins a different host, these suites skip instead of running against a gateway that would answer with different models and a different source-block wire format — and, for the subagent smoke, instead of redirecting a spawned agent SDK that is hardwired to the first-party Messages URL. Skipping is honest: the first-party surface is unconfigured in that environment, exactly as a missing key already makes a suite skip. An unpinned local run keeps `undefined`, so the default `true` still exercises them.

The suites' remaining `DEEPSEEK_VISION_E2E`-gated cases are unaffected: the gateway serves `deepseek-v4-flash-vision-exp` with 404 `model_not_found`, but that id is already off the default CI path.

### Restoring the official endpoint

The move is reversible and the reversal conditions are explicit. If the repository secret becomes a first-party key again — or a distinct first-party secret is added and mapped into these steps — restore `DEEPSEEK_BASE_URL` to the first-party endpoint, drop the `DSH_SMOKE_MODEL` pin, and remove the endpoint predicate from the five suites. Until then, `https://www.threerouter.com` is the only host this repository's secrets authenticate against, and the `ci-workflow.spec.ts` assertion pins it so the two cannot silently drift apart.

## Alternatives considered

**Move only the e2e workflow and leave the installed-wheel smoke on the first-party endpoint.** Rejected: both steps read the same secret, so one of them would keep failing for the same reason. Splitting the change would also leave two endpoints in force against one key.

**Change every model id in the e2e suite to a gateway-served name.** Rejected: the suite spans far more ids than a single variable can override, and rewriting them would couple the suites to one gateway's catalog. Skipping the first-party suites and pinning the one smoke id keeps the gateway coupling in two places.

**Delete the first-party suites instead of skipping them.** Rejected: they are the evidence for the first-party endpoint, still valid whenever it is configured; a skip preserves that without pretending a gateway run is equivalent evidence.

**Keep the official pin and add a gateway key alongside it.** Rejected: the repository holds one external secret. Two secrets would claim the same purpose and let the two workflows diverge silently.

## Consequences

CI's real-API coverage now runs against a third-party gateway: the merge signal describes the gateway's behavior with the harness, not the first-party endpoint's. Two consequences follow. First, the first-party DeepSeek suites no longer run in CI at all — they skip under the pin — so regressions specific to the first-party endpoint reach CI only through a local run or a restored official secret; their unit coverage still runs keyless. Second, CI depends on the gateway staying reachable and continuing to serve the pinned model id, a dependency the base URL no longer hides.

The change also makes the secret's scope legible: the two workflow files, the smoke's model override, and one spec assertion are the complete set of places the external host is named, and the endpoint predicate in the five suites is the complete set of places that opt out.
