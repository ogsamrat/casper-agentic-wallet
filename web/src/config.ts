export const config = {
  // CSPR.click appId — the registered app whose whitelist includes this domain.
  // Falls back to the public template for localhost.
  appId: import.meta.env.VITE_CSPR_CLICK_APP_ID || 'csprclick-template',
  hubUrl: (import.meta.env.VITE_HUB_URL || 'https://casper-backend-one.vercel.app').replace(/\/$/, ''),
  sellerUrl: (import.meta.env.VITE_SELLER_URL || 'https://casper-api.vercel.app').replace(/\/$/, ''),
  network: import.meta.env.VITE_NETWORK || 'casper-test',
  assetSymbol: import.meta.env.VITE_ASSET_SYMBOL || 'WISP',
  // The agent wallet's account-hash address (00-prefixed).
  agentAddress: import.meta.env.VITE_AGENT_ADDRESS || '00d196a8556f9194b95d3a712100844c33fbde489e04f2f4278f33b5eed3a1c264',
};
