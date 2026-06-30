# Releases

## wisp-wallet.mcpb — v0.2.0 (cross-chain)

One-click install of the Wisp agent wallet into **Claude Desktop**.

### Install
1. Download [`wisp-wallet.mcpb`](wisp-wallet.mcpb).
2. Double-click it (or Claude Desktop → Settings → Extensions → install from file).
3. In the install dialog, provide:
   - **Casper Seed Phrase** (24-word BIP39) — derives your Casper key.
   - **CSPR.cloud Access Key** — for balance reads + the x402 facilitator ([cspr.cloud](https://cspr.cloud)).
   - **Base Wallet Private Key** *(optional)* — `0x…` EVM key to also pay USDC on Base Sepolia.
   - Budget caps (max per call / per day).

All secrets are stored in your OS keychain.

### Tools
`check_balance` · `x402_fetch` · `pay` · `transfer_cspr` · `transfer_token` · `request_funding` · `spending_report` · `search_bazaar`

### Verified
Built from `wallet/` (`npm run build:mcpb`) and verified end-to-end with `wallet/src/_verify-mcpb.ts`:
the packaged server launches over stdio, lists all 8 tools, reads balances on Casper + Base, and
settles real x402 payments on **both** chains (WISP on Casper, USDC on Base Sepolia).
