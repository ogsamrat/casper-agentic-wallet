# Contributing

Thanks for your interest in Wisp.

## Layout

This is a multi-package repo (no workspace linking, so each app deploys independently):

- `wallet/` — MCP buyer wallet (`.mcpb`)
- `seller/` — x402 resource server
- `backend/` — treasury / on-ramp / bazaar hub
- `web/` — CSPR.click dapp

Each has its own `package.json`. Shared config lives in the repo-root `.env`.

## Develop

```bash
cp .env.example .env          # fill in WISP_MNEMONIC + CSPR_CLOUD_API_KEY
cd <package> && npm install
npm run dev        # or: npm test, npm run typecheck
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org), lowercase:
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `style:`. Keep them small
and scoped. Run `npm test` and `npm run typecheck` in the package you touched before pushing.

## Network

Everything targets **Casper testnet** (`casper:casper-test`). Never commit secrets — the
root `.env` is gitignored.
