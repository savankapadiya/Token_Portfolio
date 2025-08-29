import React, { useState } from 'react'
import { useConnect, useAccount, useDisconnect } from 'wagmi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'

export const WalletConnectModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { connect, connectors, error, isPending } = useConnect()
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()

  const handleWalletConnect = (connector: any) => {
    connect({ connector })
    setIsOpen(false)
  }

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-green-500/20 border border-green-500/30 rounded-md px-3 py-2">
          <span className="text-green-400 text-[13px] font-medium">
            {truncateAddress(address)}
          </span>
        </div>
        <Button 
          onClick={() => disconnect()}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-semibold"
        >
          <span className="text-[13px]">Disconnect</span>
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="bg-lime-400 text-black px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1 hover:bg-lime-500 transition">
          <span className="text-[13px]">Connect Wallet</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold mb-6">
            Connect Wallet
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-4">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleWalletConnect(connector)}
              disabled={isPending}
              className="flex flex-col items-center p-3 rounded-2xl bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-all duration-200 border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-12 h-12 mb-3 rounded-xl flex items-center justify-center relative overflow-hidden">
                {connector.icon && (
                  <img 
                    src={connector.icon} 
                    alt={connector.name} 
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                )}
                {!connector.icon && (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                    💳
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-center text-gray-200 group-hover:text-white transition-colors">
                {connector.name}
                {isPending && (
                  <span className="ml-1">...</span>
                )}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <div className="mt-6 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
            <p className="text-red-300 text-sm text-center">{error.message}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}