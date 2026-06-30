import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

type BaseCfg = { privateKey: string; network: string; rpcUrl: string };

/** A viem wallet client usable as an x402 ClientEvmSigner (walletClient + address). */
export function makeEvmSigner(cfg: BaseCfg) {
  const account = privateKeyToAccount(cfg.privateKey as `0x${string}`);
  const chain = cfg.network === 'eip155:8453' ? base : baseSepolia;
  const wc = createWalletClient({ account, chain, transport: http(cfg.rpcUrl) }).extend(publicActions);
  return Object.assign(wc, { address: account.address });
}
