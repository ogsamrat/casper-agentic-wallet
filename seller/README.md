# Wisp API — x402 resource server

Pay-per-call HTTP APIs gated by [x402](https://x402.org), settled in **WCSPR** (a CEP-18
token) on the **Casper** network. A single `CATALOG` drives the paid routes plus the free
`GET /` (full catalog) and `GET /health`.

## Endpoints

| Path | Price | Source | What |
|---|---|---|---|
| `GET /weather/current?city=` | 0.001 WCSPR | live | Open-Meteo current weather |
| `GET /fx/rates?base=&symbols=` | 0.001 WCSPR | live | ECB reference FX rates |
| `GET /casper/account?id=` | 0.001 WCSPR | live | CSPR.cloud account lookup |
| `GET /casper/deploy?hash=` | 0.001 WCSPR | live | CSPR.cloud deploy status |
| `GET /otp/generate?digits=&ttl=` | 0.001 WCSPR | live | CSPRNG one-time passcode |
| `GET /company/lookup?domain=` | 0.002 WCSPR | live | Homepage metadata |
| `GET /ai/complete?prompt=` | 0.005 WCSPR | demo | Simulated LLM completion |
| `GET /market/quote?symbol=` | 0.002 WCSPR | demo | Simulated market quote |
| `GET /` · `GET /health` | free | — | Catalog / status |

## Run locally

```bash
npm install
npm run dev          # http://localhost:4021
```

Env is read from the repo-root `.env` (see [`../.env.example`](../.env.example)). Required:
`WISP_PAYEE_ADDRESS`, `WISP_ASSET_PACKAGE`, `X402_FACILITATOR_URL`, `X402_FACILITATOR_API_KEY`,
`CSPR_CLOUD_API_KEY`, `CASPER_NETWORK`.

## Deploy (Vercel)

`vercel.json` rewrites every path to the single `api/index.ts` function (which re-exports the
Express app). Set the env vars above in the Vercel project, then `vercel --prod`.

Target: `casper-api.vercel.app`.
