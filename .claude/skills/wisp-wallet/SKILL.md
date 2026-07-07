---
name: wisp-wallet
description: >-
  Use when an AI agent needs to autonomously discover and pay for x402-gated HTTP
  APIs with the Wisp wallet MCP — settling micropayments in WISP on Casper testnet
  or USDC on Base Sepolia. Covers the 8 wallet tools, the discover → check →
  pay → verify workflow, rail selection, budget guardrails, and funding. Triggers
  on "pay for this API", "x402 / 402 Payment Required", "buy data with the agent
  wallet", "settle a paid endpoint", "check the wallet balance", or any paid-resource fetch.
---

# Wisp Wallet — paying for x402 APIs

Wisp Wallet is an MCP server (`wisp-wallet`) that gives an agent a real cross-chain
wallet. When an HTTP endpoint answers `402 Payment Required` with an x402 challenge,
the wallet parses it, enforces a spending budget, signs a gasless payment
authorization, and retries — so the agent gets its data for a micropayment. It
settles on two rails: **WISP** (a CEP‑18 token) on Casper testnet, and **USDC** on
Base Sepolia. On-chain settlement is done by a hosted facilitator, so payments are
gasless for the wallet (no CSPR/ETH needed to pay — only to `transfer_*`).

## When to use

- Fetching any URL that may be x402-gated → use `x402_fetch` (it handles the whole loop).
- Finding what's payable before spending → `search_bazaar`.
- Checking funds or budget before/after a run → `check_balance`, `spending_report`.
- Do **not** hand-roll the 402 handshake; the tools own it. Do **not** use `transfer_*`
  to pay an API — those are raw on-chain sends that bypass the budget.

## Tools

| Tool | Input | Does / returns | Notes |
|---|---|---|---|
| `x402_fetch` | `url`, `method?`, `body?` | Fetches `url`; on `402` checks budget → signs → retries once. Returns `{ status, paid, payment{amount,asset,network,payTo,settlement,explorer}, body }`. | **Primary tool.** Budget-gated. Pays whichever rail the server's 402 lists and the wallet supports (Casper WISP or Base USDC). `isError` when `status >= 400`. |
| `search_bazaar` | `query?` | Lists payable services from the Wisp API + Hub catalogs (path, price, category, example question). | Read-only. Filters by keyword substring. |
| `check_balance` | — | `{ casper{accountAddress,publicKey,network,cspr,token{symbol,balance,package}}, base{address,network,usdc}? }`. | `base` only present if a Base key is configured. |
| `spending_report` | — | Session budget: `spentToday`, `spentSession`, `remainingToday`, per-call/daily limits, recent payments. | In-memory; resets per UTC day and on restart. |
| `pay` | `amount`, `payTo`, `resource?` | Signs an x402 authorization **without sending an HTTP request**; returns `{ headerName, headerValue }` to attach yourself. | **Casper-only.** Records the spend the instant it signs, even if you never use the header. Prefer `x402_fetch`. |
| `request_funding` | — | The account address plus instructions to obtain CSPR and WISP. | Read-only. |
| `transfer_cspr` | `to` (public key hex), `amount` | Native CSPR transfer, for funding another account's gas. Returns `txHash` + explorer. | Real on-chain send. **Bypasses the budget.** |
| `transfer_token` | `to` (account-hash), `amount` | Direct WISP CEP‑18 transfer. Returns `txHash` + explorer. | Real on-chain send, **not** an x402 payment. **Bypasses the budget.** |

Amounts are decimal strings (`"0.01"`). Every tool that spends/reads keys needs
`WISP_MNEMONIC` set; without it those tools return `{ error: "No wallet configured" }`.

## Recommended workflow

1. **Discover** — `search_bazaar` (optionally with a keyword) to find a payable
   endpoint and its price, or just point `x402_fetch` at a URL you already have.
2. **Check headroom** — `check_balance` (do you hold the asset?) and/or
   `spending_report` (is there budget left today?). Optional but cheap.
3. **Pay + fetch** — call `x402_fetch` with the URL. It gates on the budget, signs,
   retries, and returns the data. Read `payment.settlement` / `payment.explorer` for
   the on-chain proof.
4. **Verify** — if `paid` is true and `status` is 2xx you have the data and a tx hash.
   On a budget breach the call throws before any signing (nothing is spent).

## The two rails & selection

| | Casper WISP | Base USDC |
|---|---|---|
| Network (CAIP‑2) | `casper:casper-test` | `eip155:84532` |
| Asset / scheme | CEP‑18, EIP‑712 `TransferWithAuthorization` | USDC, EIP‑3009 |
| Decimals | 9 | 6 |
| Explorer | `testnet.cspr.live/deploy/<hash>` | `sepolia.basescan.org/tx/<hash>` |

Rail selection is **decided by the server**: `x402_fetch` takes the first `accept`
in the 402's list whose network the wallet supports (`casper:*` or `eip155:*`). There
is no preference for the cheaper or better-funded rail. The `pay` tool is Casper-only.

## Budget guardrails

- Enforced per call and per UTC day, default `0.10` per call / `20.00` per day
  (`WISP_MAX_PER_CALL` / `WISP_MAX_PER_DAY`). `x402_fetch` and `pay` check the budget
  **before** signing and throw on breach.
- The tracker is **in-memory and per-process** — it resets on restart and is not shared
  across instances. `spending_report` reflects only the current session.
- It is **unit-blind**: WISP-denominated limits are applied unchanged to Base USDC
  amounts, and WISP + USDC spend are summed into one daily total. Treat the caps as
  "units per call", not "dollars".
- Only x402 payments count. `transfer_cspr` / `transfer_token` are **not** budgeted.

## Funding the wallet

- `request_funding` returns the address and how-to. Buy CSPR via the CSPR.click fiat
  on-ramp in the web app, or the testnet faucet at `testnet.cspr.live/tools/faucet`.
- CSPR is needed **only** for `transfer_cspr` / `transfer_token` gas — x402 payments are
  gasless (the facilitator sponsors gas). To pay APIs you only need a WISP (or USDC) balance.
- Get WISP by receiving a `transfer_token`, or mint your own via `wallet/scripts/deploy-token.ts`.

## Gotchas (read before relying on this)

- **No mnemonic → nothing works.** The Casper key gates every spending/reading tool,
  including Base USDC payments — `WISP_MNEMONIC` must be set even to pay on Base.
- **`pay` records spend on sign, not on use**, and produces no tx hash. If you sign but
  never attach the header, the budget is still charged. Use `x402_fetch` unless you have
  a specific reason to hold the header.
- **`transfer_*` is real money with no budget gate.** Double-check `to` and `amount`.
  `transfer_cspr` wants a public key; `transfer_token` wants an account-hash.
- **secp256k1 only** — `WISP_KEY_ALGO=ed25519` is declared but not implemented and will
  throw at startup.
- The wallet's env defaults may say "WCSPR / Wrapped CSPR", but the live asset is **WISP
  ("Wisp Dollar")** injected via the MCP bundle config. Trust `check_balance`'s `token.symbol`.

## Build & verify (local)

Run from `wallet/` (use `npm.cmd` on Windows):

```bash
npm.cmd install
npm.cmd run typecheck
npm.cmd test                 # unit: key derivation, amounts, budget
npm.cmd run build            # bundle src → dist with tsup
npm.cmd run build:mcpb       # produce the installable .mcpb bundle

# End-to-end pay tests (need a funded wallet + reachable facilitator):
SELLER_URL=https://casper-api.vercel.app/fx/rates npm.cmd run paytest   # pay on Casper (WISP)
BASE_URL=https://sandbox.node4all.com/v1/x402-test npx tsx src/_basepaytest.ts  # pay on Base (USDC)
```

Reference implementation: the payment engine is `wallet/src/x402.ts`, key derivation
is `wallet/src/casper.ts`, the budget is `wallet/src/spending.ts`, and each tool lives
in `wallet/src/tools/`.
