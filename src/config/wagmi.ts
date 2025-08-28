import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { 
  metaMask, 
  walletConnect, 
  injected,
  coinbaseWallet
} from 'wagmi/connectors'

const projectId = 'your-project-id' // Replace with your actual WalletConnect project ID

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    metaMask(),
    coinbaseWallet({ appName: 'Token Portfolio' }),
    walletConnect({ projectId }),
    injected()
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http()
  },
})