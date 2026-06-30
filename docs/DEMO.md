# Demo walkthrough (Casper testnet)

Prereqs: Node 20+, a funded testnet account, a CSPR.cloud access key. Copy `.env.example`
to `.env` at the repo root and fill in `WISP_MNEMONIC` + `CSPR_CLOUD_API_KEY`.

## 1. Deploy the WISP token (once)

```bash
cd wallet && npm install
npx tsx scripts/deploy-token.ts
# prints the CEP-18 package hash; set WISP_ASSET_PACKAGE in .env
```

The installing account receives the full initial supply.

## 2. Run the seller

```bash
cd seller && npm install && npm run dev    # http://localhost:4021
curl localhost:4021/weather/current        # → 402 Payment Required
```

## 3. Pay it from the agent wallet

```bash
cd wallet
SELLER_URL=http://localhost:4021/weather/current npm run paytest
# derives the wallet, signs EIP-712, facilitator settles on-chain → 200 + data
```

## 4. Custodial flow (hub)

```bash
cd backend && npm install && npm run dev    # http://localhost:4055
npx tsx src/_hubtest.ts                      # credit a user → pay seller via treasury → settle
```

## 5. The dapp

```bash
cd web && npm install && npm run dev         # http://localhost:4020
```

Connect a Casper wallet, buy CSPR via the on-ramp, and browse the bazaar.

## Live

- Web: https://casperwallet.vercel.app
- API: https://casper-api.vercel.app
- Hub: https://casper-backend-one.vercel.app
