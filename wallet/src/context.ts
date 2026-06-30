import type { WalletConfig } from './config.js';
import type { Account } from './casper.js';
import type { SpendingTracker } from './spending.js';

export type Ctx = {
  config: WalletConfig;
  account: Account | null;
  spending: SpendingTracker;
};
