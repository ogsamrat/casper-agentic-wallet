import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { config } from './config';

type Account = { public_key?: string; account_hash?: string; [k: string]: unknown } | null;

type ClickValue = {
  ready: boolean;
  account: Account;
  signIn: () => void;
  signOut: () => void;
  buyCspr: () => void;
  cloudFetch: (path: string) => Promise<any>;
};

const ClickCtx = createContext<ClickValue>(null as unknown as ClickValue);
export const useClick = () => useContext(ClickCtx);

export function ClickProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account>(null);

  useEffect(() => {
    // Options must be on window BEFORE the CDN runtime loads.
    window.clickUIOptions = {
      uiContainer: 'csprclick-ui',
      rootAppElement: '#root',
      show1ClickModal: true,
      showTopBar: true,
      accountMenuItems: ['AccountCardMenuItem', 'CopyHashMenuItem', 'BuyCSPRMenuItem'],
      defaultTheme: 'dark',
    };
    window.clickSDKOptions = {
      appName: 'Wisp',
      appId: config.appId,
      providers: ['casper-wallet', 'ledger', 'metamask-snap'],
      contentMode: 'iframe',
    };

    const syncAccount = () => {
      const cc = window.csprclick;
      const acc = cc?.getActiveAccount?.();
      setAccount(acc ?? null);
    };

    const onLoaded = () => {
      setReady(true);
      const cc = window.csprclick;
      cc?.on?.('csprclick:signed_in', syncAccount);
      cc?.on?.('csprclick:switched_account', syncAccount);
      cc?.on?.('csprclick:signed_out', () => setAccount(null));
      syncAccount();
    };

    if (window.csprclick) {
      onLoaded();
    } else {
      window.addEventListener('csprclick:loaded', onLoaded);
      const s = document.createElement('script');
      s.src = 'https://cdn.cspr.click/ui/v2.1.0/csprclick-client-2.1.0.js';
      s.async = true;
      document.head.appendChild(s);
    }
    return () => window.removeEventListener('csprclick:loaded', onLoaded);
  }, []);

  const signIn = () => window.csprclick?.signIn?.();
  const signOut = () => window.csprclick?.signOut?.();
  const buyCspr = () => window.csprclick?.showBuyCsprUi?.();

  // Read CSPR.cloud via the appId-authenticated proxy (no key in the frontend).
  const cloudFetch = async (path: string) => {
    const proxy = window.csprclick?.getCsprCloudProxy?.();
    if (!proxy) throw new Error('CSPR.cloud proxy unavailable');
    const res = await proxy.fetch(path);
    return typeof res?.json === 'function' ? res.json() : res;
  };

  return (
    <ClickCtx.Provider value={{ ready, account, signIn, signOut, buyCspr, cloudFetch }}>
      {children}
    </ClickCtx.Provider>
  );
}
