# Wisp Web

The CSPR.click dapp for Wisp — connect a Casper wallet, buy CSPR via the fiat on-ramp,
fund the agent, and browse the x402 **bazaar** served by the Wisp Hub.

Vite + React. CSPR.click is loaded from the CDN (`v2.1.0`) and initialized in
[`src/ClickContext.tsx`](src/ClickContext.tsx) (sets `window.clickSDKOptions` /
`clickUIOptions` before injection, waits for `csprclick:loaded`).

## Run

```bash
npm install
cp .env.example .env.local   # set VITE_CSPR_CLICK_APP_ID (or leave blank for localhost template)
npm run dev                  # http://localhost:4020
```

## Build / deploy

```bash
npm run build                # → dist/
```

Vercel auto-detects Vite (output `dist`); `vercel.json` adds the SPA fallback.
Target: `casperwallet.vercel.app` (must be a CSPR.click-whitelisted origin for the appId).

## Env

`VITE_CSPR_CLICK_APP_ID`, `VITE_HUB_URL`, `VITE_SELLER_URL`, `VITE_NETWORK`,
`VITE_ASSET_SYMBOL`, `VITE_AGENT_ADDRESS`.
