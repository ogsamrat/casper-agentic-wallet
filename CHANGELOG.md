# Changelog

## 0.1.0

Initial release — an agentic x402 payments stack on Casper testnet.

- **Wallet** — MCP buyer wallet with 8 tools (x402_fetch, pay, check_balance, transfer_cspr,
  transfer_token, request_funding, spending_report, search_bazaar); secp256k1 derivation from a
  mnemonic; budget guardrails; one-click `.mcpb` bundle.
- **Token** — WISP CEP-18 with EIP-712 `transfer_with_authorization`, deployed via
  `wallet/scripts/deploy-token.ts`.
- **Seller** — x402 resource server with 8 paid endpoints (live + demo), settled in WISP.
- **Hub** — treasury ledger, on-ramp credit, custodial `/api/pay`, and the x402 bazaar registry.
- **Web** — CSPR.click dapp: connect, buy CSPR (on-ramp), browse the bazaar.
- Live on Casper testnet via the hosted CSPR.cloud x402 facilitator.
