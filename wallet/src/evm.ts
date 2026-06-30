import { createWalletClient, http, publicActions, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import type { BaseConfig } from './config.js';

const erc20Abi = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

function chainOf(network: string) {
  return network === 'eip155:8453' ? base : baseSepolia;
}

/** A viem wallet client usable as an x402 ClientEvmSigner (walletClient + address). */
export function makeEvmSigner(cfg: BaseConfig) {
  const account = privateKeyToAccount(cfg.privateKey as `0x${string}`);
  const wc = createWalletClient({ account, chain: chainOf(cfg.network), transport: http(cfg.rpcUrl) }).extend(publicActions);
  return Object.assign(wc, { address: account.address });
}

export function evmAddress(cfg: BaseConfig): string {
  return privateKeyToAccount(cfg.privateKey as `0x${string}`).address;
}

/** USDC balance on Base (atomic, 6 dp). */
export async function getUsdcBalanceAtomic(cfg: BaseConfig): Promise<string> {
  try {
    const account = privateKeyToAccount(cfg.privateKey as `0x${string}`);
    const wc = createWalletClient({ account, chain: chainOf(cfg.network), transport: http(cfg.rpcUrl) }).extend(publicActions);
    const c = getContract({ address: cfg.usdc as `0x${string}`, abi: erc20Abi, client: wc });
    const bal = (await c.read.balanceOf([account.address])) as bigint;
    return bal.toString();
  } catch {
    return '0';
  }
}
