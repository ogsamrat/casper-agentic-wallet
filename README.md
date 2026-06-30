<div align="center">

# Wisp

**An agentic wallet for the Casper network — let AI agents discover and pay for APIs.**

Wisp gives an AI agent a real Casper wallet and the ability to autonomously settle
[x402](https://x402.org) micropayments for paid HTTP APIs — signing an EIP-712
`transfer_with_authorization` so the agent never touches gas.

</div>

---

## What's in the box

| Component | Path | What it is | Deploys to |
|---|---|---|---|
| **Wisp Wallet** | [`wallet/`](wallet/) | MCP server (one-click `.mcpb` for Claude) — the agent's Casper buyer wallet | local / Claude Desktop |
| **Wisp API** | [`seller/`](seller/) | x402-gated pay-per-call resource server | `casper-api.vercel.app` |
| **Wisp Hub** | [`backend/`](backend/) | Treasury ledger + fiat on-ramp credit + service registry | `casper-backend.vercel.app` |
| **Wisp Web** | [`web/`](web/) | CSPR.click dapp — connect, buy CSPR, fund the agent, browse the bazaar | `casperwallet.vercel.app` |

## Live (Casper testnet)

| Service | URL | Status |
|---|---|---|
| Wisp API (seller) | https://casper-api.vercel.app | live |
| Wisp Hub (backend) | https://casper-backend-one.vercel.app | live |
| WISP token | CEP-18 `65bedddde009284db1bd62614afc8bbeb405590ddec1669eca3db38b5e18810f` | deployed |
| Facilitator | https://x402-facilitator.cspr.cloud | hosted (CSPR.cloud) |

> `casper-backend.vercel.app` is held by another Vercel account (`.vercel.app` names are
> globally unique), so the hub is served from `casper-backend-one.vercel.app`.

## How a payment works

```
Agent → GET /resource ──────────────▶ Wisp API
        ◀── 402 Payment Required ──── { network: casper:casper-test, asset: WCSPR, payTo, amount }
Agent signs an EIP-712 TransferWithAuthorization (off-chain, no gas)
Agent → GET /resource + PAYMENT-SIGNATURE ▶ Wisp API → facilitator /verify + /settle
                                            facilitator submits transfer_with_authorization on-chain
        ◀── 200 OK + data ───────────
```

## Payment rail

- **Network:** Casper Testnet (`casper:casper-test`)
- **Asset:** WCSPR — wrapped CSPR, a CEP-18 token exposing `transfer_with_authorization` (9 decimals)
- **Facilitator:** hosted at `x402-facilitator.cspr.cloud` (gas sponsored)
- **Settlement library:** [`@make-software/casper-x402`](https://github.com/make-software/casper-x402)
- **Chain reads / on-ramp:** [CSPR.cloud](https://docs.cspr.cloud) + [CSPR.click](https://docs.cspr.click)

## Quick start

```bash
cp .env.example .env   # fill in your mnemonic + CSPR.cloud key
npm run install:all
npm run dev:seller     # x402 resource server on :4021
```

See each component's README for details.

## License

MIT
