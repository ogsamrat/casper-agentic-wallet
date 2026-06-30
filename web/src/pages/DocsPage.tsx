export function DocsPage() {
  return (
    <div className="container prose">
      <header className="page-head">
        <p className="kicker">Documentation</p>
        <h1>How Wisp works</h1>
        <p className="lead">An agentic wallet that discovers and settles x402 micropayments across Casper and Base.</p>
      </header>

      <h2>The x402 flow</h2>
      <ol className="flow">
        <li>The agent requests a paid resource and receives <code>402 Payment Required</code> with the accepted network, asset, amount and recipient.</li>
        <li>It picks a rail it can settle, checks its budget, and signs an authorization — EIP-712 on Casper, EIP-3009 on Base. Off-chain, gasless.</li>
        <li>It retries with the payment header. A facilitator verifies and settles on-chain via <code>transfer_with_authorization</code>.</li>
        <li>The resource server returns its data in the same round-trip, with a settlement transaction hash.</li>
      </ol>

      <h2>Two rails, one wallet</h2>
      <p>
        On <strong>Casper</strong>, payments settle in <strong>WISP</strong> — a CEP-18 token exposing
        <code>transfer_with_authorization</code>. There's no Circle USDC on Casper, so Wisp deploys its own
        facilitator-compatible token to demonstrate the loop. On <strong>Base</strong>, payments settle in
        <strong> real USDC</strong> via the <code>@x402/evm</code> exact scheme. The wallet reads the network from
        the 402 and signs on the matching chain automatically.
      </p>

      <h2>The bazaar</h2>
      <p>
        Wisp merges its own service catalog with the <strong>Coinbase x402 Bazaar</strong>. Base listings carry a
        transparent <strong>5% marketplace fee</strong>. "Pay &amp; call" routes through the hub, which settles with
        the agent's keys on whichever supported network the service uses.
      </p>

      <h2>The stack</h2>
      <ul className="stack-list">
        <li><strong>Wallet</strong> — an MCP server giving an agent a multi-chain x402 signer with budget guardrails.</li>
        <li><strong>API</strong> — an x402 resource server settled in WISP. <a href="https://casper-api.vercel.app" target="_blank" rel="noreferrer">casper-api ↗</a></li>
        <li><strong>Hub</strong> — treasury ledger, on-ramp credit, the bazaar, and pay-and-call. <a href="https://casper-backend-one.vercel.app" target="_blank" rel="noreferrer">hub ↗</a></li>
        <li><strong>Web</strong> — this CSPR.click dapp.</li>
      </ul>

      <p className="prose-foot">
        Source: <a href="https://github.com/ogsamrat/casper-agentic-wallet" target="_blank" rel="noreferrer">github.com/ogsamrat/casper-agentic-wallet</a>
      </p>
    </div>
  );
}
