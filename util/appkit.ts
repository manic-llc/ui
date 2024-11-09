import { createAppKit } from '@reown/appkit';
import { solana, solanaTestnet, solanaDevnet, mainnet, arbitrum, sepolia } from '@reown/appkit/networks';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolflareWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

export function initializeModal({ metadata, projectId, debug }: any) {
  const networks = [mainnet, arbitrum, sepolia, solana, solanaTestnet, solanaDevnet];

  const features = {
    analytics: true,
  };

  const adapters = [
    new WagmiAdapter({
      ssr: true,
      projectId,
      networks,
    }),
    new SolanaAdapter({
      wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    }),
  ];

  return createAppKit({
    metadata,
    features,
    adapters,
    projectId,
    networks,
    debug,
  } as any);
}
