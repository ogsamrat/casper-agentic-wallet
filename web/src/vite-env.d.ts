/// <reference types="vite/client" />

interface Window {
  csprclick: any;
  clickSDKOptions: any;
  clickUIOptions: any;
}

interface ImportMetaEnv {
  readonly VITE_CSPR_CLICK_APP_ID: string;
  readonly VITE_HUB_URL: string;
  readonly VITE_SELLER_URL: string;
  readonly VITE_NETWORK: string;
  readonly VITE_ASSET_SYMBOL: string;
  readonly VITE_AGENT_ADDRESS: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
