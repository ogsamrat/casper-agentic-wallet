# Architecture

Wisp is a four-part agentic-payments stack on the Casper network. The unit of value is
**WISP**, a CEP-18 token that exposes the EIP-712 `transfer_with_authorization` entry point
required by x402.

```
            ┌──────────────────────────┐
            │  Wisp Web (CSPR.click)    │  connect · buy CSPR · fund agent · browse bazaar
            │  casperwallet.vercel.app  │
            └────────────┬─────────────┘
                         │ reads bazaar / balances
   ┌─────────────────────▼───────────────────────┐
   │  Wisp Hub  (treasury ledger + registry)      │  casper-backend-one.vercel.app
   │  - on-ramp credit  - custodial /api/pay      │
   │  - x402 bazaar (seeded from the API)         │
   └───────┬───────────────────────────┬──────────┘
           │ custodial sign            │ catalog
   ┌───────▼─────────┐         ┌────────▼──────────┐
   │  Wisp Wallet    │  pays   │   Wisp API        │  casper-api.vercel.app
   │  (MCP, .mcpb)   │ ──────▶ │  x402 resource    │
   │  buyer signer   │  x402   │  server (seller)  │
   └───────┬─────────┘         └────────┬──────────┘
           │ EIP-712 authorization       │ /verify + /settle
           └───────────┬─────────────────┘
                       ▼
        CSPR.cloud x402 facilitator  →  on-chain transfer_with_authorization (WISP CEP-18)
```

## The x402 payment flow

1. The agent (Wisp Wallet) requests a paid resource from the Wisp API.
2. The API replies `402 Payment Required` with a `PAYMENT-REQUIRED` header: `{ scheme: exact,
   network: casper:casper-test, asset: <WISP package>, amount, payTo, extra: { name, version } }`.
3. The wallet checks its budget, then signs an EIP-712 `TransferWithAuthorization` over
   `{ from, to, value, validAfter, validBefore, nonce }` — off-chain, no gas.
4. It retries with the `PAYMENT-SIGNATURE` header.
5. The API forwards the payload to the **hosted CSPR.cloud facilitator** (`/verify` then
   `/settle`), which submits the CEP-18 `transfer_with_authorization` deploy and sponsors gas.
6. On settlement the API returns the data plus a `PAYMENT-RESPONSE` header (the deploy hash).

## Casper specifics

- **Keys** — BIP39 mnemonic → secp256k1 via the Casper Wallet path `m/44'/506'/0'/0/0`
  (`bip39` + `@scure/bip32`). The account-hash address is `00` + 32-byte hash.
- **Token** — WISP is an Odra CEP-18 (`wallet/scripts/deploy-token.ts`); its EIP-712 domain
  `chainId` is the CAIP-2 network string, so it must match `casper:casper-test`.
- **Settlement library** — [`@make-software/casper-x402`](https://github.com/make-software/casper-x402)
  (`exact` scheme) over `@x402/core`.
- **Reads** — CSPR.cloud REST (`/accounts/{id}`, `/accounts/{id}/ft-token-ownership`,
  `/deploys/{hash}`); the web reads via the CSPR.click cloud proxy so no key is exposed.

## Custodial path (Wisp Hub)

Users hold internal WISP balances credited by an on-ramp (`/admin/credit`). On `/api/pay`
the hub debits the user and signs the x402 authorization from a shared **treasury** account,
returning the payment header — letting users pay without managing keys. Idempotent on
`correlationId`; refunds on failure.
