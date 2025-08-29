
import React from 'react';
import logo from '@/assets/logo.svg';
import PortfolioChart from '../common/PieChart';
import TableComponent from '../common/TableComponent';
import { WalletConnectModal } from '../wallet/WalletConnectModal';
import { useReduxPortfolio } from '@/hooks/useReduxPortfolio';

const Home = () => {
    const { tokens, portfolioTotal, lastUpdated, isLoading, isConnected, balance, symbol } = useReduxPortfolio();

    return (
        <React.Fragment>
            <div className="bg-[#212124] min-h-screen">
                <nav className="p-3 flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                        <img src={logo} alt="Logo" width={28} height={28} />
                        <p className="font-semibold text-xl text-white">Token Portfolio</p>
                    </div>
                    <div>
                        <WalletConnectModal />
                    </div>
                </nav>
                <div className="lg:p-7 py-4">
                    <div className="w-full bg-[#27272A] rounded-md flex flex-col lg:flex-row justify-between items-start p-6 lg:gap-19 gap-8 h-full">
                        <div className="flex flex-col gap-3 justify-between h-full">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-base text-[#A1A1AA]">Portfolio Total</span>
                                    {isConnected && (
                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-md border border-green-500/30">
                                            Connected
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-white font-medium lg:text-[56px] text-4xl leading-[110%] ${isLoading ? 'opacity-50' : ''}`}>
                                        {isLoading ? '...' : portfolioTotal}
                                    </span>
                                    {isLoading && (
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    )}
                                </div>
                                {isConnected && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm text-[#A1A1AA]">
                                            Wallet Balance: {parseFloat(balance).toFixed(4)} {symbol}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-[#A1A1AA] lg:mt-[110px]">
                                Last updated: {lastUpdated}
                            </span>
                        </div>
                        <PortfolioChart tokenList={tokens} />
                    </div>
                    {/* Table Section */}
                    <TableComponent />
                </div>
            </div>
        </React.Fragment>
    );
};

export default Home;