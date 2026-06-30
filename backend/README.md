# Wisp Hub (backend)

Treasury ledger, fiat on-ramp credit, and the x402 **bazaar** (service registry) for the Wisp
Casper wallet. A custodial layer: users hold internal WISP balances (credited via an on-ramp),
and the hub pays x402 charges on their behalf by signing an EIP-712 authorization from a shared
treasury account.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | Liveness |
| GET | `/` | — | Service info + bazaar size |
| GET | `/bazaar?query=` | — | List x402 services (seeded from the Wisp API) |
| POST | `/bazaar/register` | — | Register an x402 service |
| GET | `/accounts/:hash` | — | A user's internal WISP balance |
| POST | `/api/pay` | balance-gated | Custodial x402 payment: debit user balance, sign from treasury, return the payment header |
| POST | `/admin/credit` | `x-wisp-admin-secret` | Credit a user balance (on-ramp settlement) |
| GET | `/admin/ops` | `x-wisp-admin-secret` | Treasury + ledger dashboard |

`/api/pay` body: `{ correlationId, paymentRequirements, userContext: { accountHash, maxDebitAtomic } }`
(idempotent on `correlationId`).

## Run

```bash
npm install
npm run dev          # http://localhost:4055
```

Env (repo-root `.env`): `WISP_MNEMONIC` (treasury), `CASPER_NETWORK`, `CSPR_CLOUD_API_KEY`,
`WISP_ASSET_*`, `WISP_ADMIN_SECRET`, `WISP_API_URL`.

## Notes

The ledger is in-memory (process-lifetime) by default — fine for testnet demos. Swap `HubStore`
for a Postgres/KV-backed implementation of the same surface for durability.

Target: `casper-backend.vercel.app`.
