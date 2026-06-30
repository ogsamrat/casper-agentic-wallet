# Wisp Wallet (MCP)

An MCP server that gives an AI agent a real **Casper** wallet derived from a seed phrase,
and the ability to autonomously pay **x402**-gated APIs in the **WISP** token — signing an
EIP-712 `transfer_with_authorization` so the agent never pays gas.

## Tools

| Tool | What it does |
|---|---|
| `check_balance` | CSPR + WISP balances, address, public key |
| `x402_fetch` | Fetch a URL, auto-paying x402 charges in WISP (budget-gated) |
| `pay` | Sign an x402 payment authorization (no HTTP send) |
| `transfer_cspr` | Send native CSPR to a public key |
| `transfer_token` | Send the WISP token to an account hash |
| `request_funding` | How to fund the wallet (fiat on-ramp + token) |
| `spending_report` | Budget usage + recent payments |
| `search_bazaar` | Discover x402 services to pay for |

## How it works

Key derivation: BIP39 mnemonic → secp256k1 via Casper Wallet path `m/44'/506'/0'/0/0`.
Payments: `@make-software/casper-x402` exact scheme → EIP-712 → hosted CSPR.cloud facilitator
verifies + settles `transfer_with_authorization` on-chain. Budget limits enforced per call / day.

## Develop

```bash
npm install
npm run build                 # tsup → dist/index.js
SELLER_URL=http://localhost:4021/fx/rates npx tsx src/_mcptest.ts   # smoke test
```

## Configure (env, from repo-root .env or MCP user_config)

`WISP_MNEMONIC`, `WISP_KEY_ALGO=secp256k1`, `CASPER_NETWORK=casper:casper-test`,
`CSPR_CLOUD_API_KEY`, `X402_FACILITATOR_URL`, `X402_FACILITATOR_API_KEY`,
`WISP_ASSET_PACKAGE/NAME/SYMBOL/VERSION/DECIMALS`, `WISP_MAX_PER_CALL`, `WISP_MAX_PER_DAY`.

## Build the .mcpb (one-click install for Claude Desktop)

```bash
# Windows
powershell -ExecutionPolicy Bypass -File scripts/build-mcpb.ps1
# POSIX
npm run build:mcpb
```

Produces `wisp-wallet.mcpb` — double-click to install into Claude Desktop. The user supplies
their seed phrase + CSPR.cloud key in the install dialog (stored in the OS keychain).

## Deploy your own token

`npx tsx scripts/deploy-token.ts` installs a CEP-18 (`Cep18X402.wasm`) with
`transfer_with_authorization`, minting the supply to your wallet, and prints the package hash.
