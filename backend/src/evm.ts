import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

type BaseCfg = { privateKey: string; network: string; rpcUrl: string; usdc?: string };

const erc20Abi = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

const chainOf = (n: string) => (n === 'eip155:8453' ? base : baseSepolia);

/** A viem wallet client usable as an x402 ClientEvmSigner (walletClient + address). */
export function makeEvmSigner(cfg: BaseCfg) {
  const account = privateKeyToAccount(cfg.privateKey as `0x${string}`);
  const wc = createWalletClient({ account, chain: chainOf(cfg.network), transport: http(cfg.rpcUrl) }).extend(publicActions);
  return Object.assign(wc, { address: account.address });
}

export function evmAddress(cfg: BaseCfg): string {
  return privateKeyToAccount(cfg.privateKey as `0x${string}`).address;
}

/** USDC balance (atomic, 6 dp). */
export async function getUsdcAtomic(cfg: BaseCfg): Promise<string> {
  try {
    const account = privateKeyToAccount(cfg.privateKey as `0x${string}`);
    const wc = createWalletClient({ account, chain: chainOf(cfg.network), transport: http(cfg.rpcUrl) }).extend(publicActions);
    const bal = (await wc.readContract({ address: cfg.usdc as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] })) as bigint;
    return bal.toString();
  } catch {
    return '0';
  }
}
