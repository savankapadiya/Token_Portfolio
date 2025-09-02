import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export const WalletConnectModal: React.FC = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="bg-[#A9E851] text-black px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1 hover:bg-[#A9E851]/80 transition-colors"
                  >
                    <span className="text-[13px]">Connect Wallet</span>
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-semibold"
                  >
                    <span className="text-[13px]">Wrong network</span>
                  </button>
                )
              }

              return (
                <div className="flex items-center gap-2">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-md px-3 py-2">
                    <span className="text-green-400 text-[13px] font-medium">
                      {account.displayName}
                    </span>
                  </div>
                  <button
                    onClick={openAccountModal}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-semibold"
                  >
                    <span className="text-[13px]">Disconnect</span>
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}