# Security

## Scope

Wisp is a testnet reference implementation. Do not use the bundled testnet keys or token for
anything of value.

## Keys & secrets

- The agent/treasury key is derived from a BIP39 mnemonic held in the gitignored root `.env`
  (or, for the `.mcpb` wallet, in the OS keychain). It is never committed.
- The CSPR.cloud access key is backend-only. The web dapp reads chain data through the
  CSPR.click cloud proxy so the key is never shipped to the browser.

## Payment safety

- The wallet enforces per-call and per-day budget limits before signing any x402 payment.
- x402 authorizations are EIP-712 `transfer_with_authorization` messages with a `validBefore`
  window and a random 32-byte nonce; the facilitator submits and the CEP-18 contract enforces
  single-use.
- The custodial hub debits a user's internal balance before signing and refunds on failure;
  `/api/pay` is idempotent on `correlationId`, and admin credit is gated by a shared secret.

## Reporting

Open an issue (omit any sensitive details) or contact the maintainers.
