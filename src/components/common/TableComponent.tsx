import React, { useState, useMemo, useCallback } from "react";
import {
    Trash2,
    MoreVertical,
    Star,
    Plus,
    RefreshCw,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import AddTokenModal from "./AddTokenModal";
import { useReduxPortfolio } from "@/hooks/useReduxPortfolio";

const TableComponent = () => {
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [tempHolding, setTempHolding] = useState<string>('');
    const [modalSelectedTokens, setModalSelectedTokens] = useState<string[]>([]);
    const itemsPerPage = 10;

    const {
        tokens,
        holdings,
        isLoading,
        error,
        isConnected,
        addTokens,
        updateTokenHolding,
        removeTokenFromWatchlist,
        refreshPortfolio,
        getPaginatedTokens,
        getTotalPages
    } = useReduxPortfolio();

    const totalPages = useMemo(() => getTotalPages(itemsPerPage), [getTotalPages, itemsPerPage]);
    const displayedTokens = useMemo(() => getPaginatedTokens(currentPage, itemsPerPage), [getPaginatedTokens, currentPage, itemsPerPage]);

    const handleSave = useCallback((tokenId: string) => {
        updateTokenHolding(tokenId, tempHolding);
        setEditIndex(null);
        setTempHolding('');
    }, [updateTokenHolding, tempHolding]);

    const handleEdit = useCallback((idx: number, tokenId: string) => {
        setEditIndex(idx);
        setTempHolding(holdings[tokenId] || '');
    }, [holdings]);

    const handleAddTokens = useCallback(async (coinIds: string[]) => {
        await addTokens(coinIds);
        setModalSelectedTokens([]);
    }, [addTokens]);

    const handleRefreshPrices = useCallback(async () => {
        setCurrentPage(1);
        await refreshPortfolio();
    }, [refreshPortfolio]);

    const handleRemoveToken = useCallback((tokenId: string) => {
        removeTokenFromWatchlist(tokenId);
    }, [removeTokenFromWatchlist]);

    const paginationInfo = useMemo(() => {
        const startItem = tokens.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
        const endItem = Math.min(startItem + displayedTokens.length - 1, currentPage * itemsPerPage);
        return { startItem, endItem };
    }, [tokens.length, currentPage, itemsPerPage, displayedTokens.length]);

    const handlePrevPage = useCallback(() => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage]);

    const handleNextPage = useCallback(() => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="rounded-lg p-6 mt-8 transition-colors duration-300 bg-[#212124]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Star 
                        fill="#A9E851" 
                        color="#A9E851" 
                        size={28} 
                    />
                    <span className="text-white font-semibold text-2xl">Watchlist</span>
                </div>
                {isConnected && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="bg-[#27272A] text-white border border-[#333] hover:bg-[#27272A] hover:text-white"
                            onClick={handleRefreshPrices}
                            disabled={isLoading}
                        >
                            <RefreshCw size={15} className={`text-[#A1A1AA] ${isLoading ? 'animate-spin' : ''}`} />
                            <span className="hidden lg:block">{isLoading ? 'Refreshing...' : 'Refresh Prices'}</span>
                        </Button>
                        <Button className="bg-[#A9E851] text-black font-semibold hover:bg-[#A9E851]/80 hover:text-black" onClick={() => setIsModalOpen(true)}>
                            <Plus size={15} /> Add Token
                        </Button>
                    </div>
                )}
            </div>
            <div className="border border-[#ebebeb24]  rounded-2xl lg:overflow-hidden overflow-x-auto">
                {/* Loading State */}
                {isLoading && tokens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#A1A1AA]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A9E851] mb-4"></div>
                        <p className="text-sm">Loading your watchlist...</p>
                    </div>
                ) : tokens.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-16 text-[#A1A1AA]">
                        <Star size={48} className="mb-4 text-[#333]" />
                        <h3 className="text-lg font-medium text-white mb-2">Your watchlist is empty</h3>
                        <p className="text-sm mb-6 text-center max-w-md">
                            {isConnected 
                                ? "Start tracking your favorite tokens by adding them to your watchlist. Click \"Add Token\" to get started."
                                : "Connect your wallet to start tracking your favorite tokens and building your personalized watchlist."
                            }
                        </p>
                        {isConnected && (
                            <Button className="bg-[#A9E851] text-black font-semibold hover:bg-[#A9E851]/80 hover:text-black" onClick={() => setIsModalOpen(true)}>
                                <Plus size={16} className="mr-2" /> Add Your First Token
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <table className="min-w-full text-left text-sm table-fixed">
                    <thead>
                        <tr className="bg-[#27272A] text-[#A1A1AA]">
                            <th className="py-3 px-4 font-medium w-[160px] sm:w-[200px] lg:w-[240px]">
                                Token
                            </th>
                            <th className="py-3 px-4 font-medium w-[100px] sm:w-[120px]">
                                Price
                            </th>
                            <th className="py-3 px-4 font-medium w-[80px] sm:w-[100px]">
                                24h %
                            </th>
                            <th className="py-3 px-4 font-medium w-[160px] sm:w-[200px]">
                                Sparkline (7d)
                            </th>
                            <th className="py-3 px-4 font-medium w-[100px] sm:w-[220px]">
                                Holdings
                            </th>
                            <th className="py-3 px-4 font-medium w-[100px] sm:w-[120px]">
                                Value
                            </th>
                            <th className="py-3 px-4 font-medium w-[60px]"></th>
                        </tr>
                    </thead>
                            <tbody className="bg-[#212124] text-white">
                                {isLoading ? (
                                    /* Loading skeleton rows */
                                    Array.from({ length: itemsPerPage }, (_, idx) => (
                                        <tr key={`skeleton-${idx}`} className="border-b border-[#27272A] animate-pulse">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-[#333] rounded-md"></div>
                                                    <div className="h-4 bg-[#333] rounded w-24"></div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="h-4 bg-[#333] rounded w-16"></div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="h-4 bg-[#333] rounded w-12"></div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="h-8 bg-[#333] rounded w-full"></div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="h-4 bg-[#333] rounded w-20"></div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="h-4 bg-[#333] rounded w-16"></div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="h-4 bg-[#333] rounded w-4"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    displayedTokens.map((token, idx) => {
                            return (
                                <tr
                                    key={token.id}
                                    className="border-b border-[#27272A] hover:bg-[#232328] transition-colors duration-150"
                                >
                                    <td className="py-3 px-4 flex items-center gap-2 ">
                                        <img
                                            src={token.icon}
                                            alt={token.name}
                                            className="w-7 h-7 rounded-md transition-transform duration-150 hover:scale-105"
                                            loading="lazy"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = `https://via.placeholder.com/28/333/fff?text=${token.symbol?.charAt(0) || 'T'}`;
                                            }}
                                        />
                                        <span>{token.name}</span>
                                    </td>
                                    <td className="py-3 px-4">{token.price}</td>
                                    <td
                                        className={`py-3 px-4 font-medium ${token.change.startsWith("+")
                                            ? "text-green-400"
                                            : "text-red-400"
                                            }`}
                                    >
                                        {token.change}
                                    </td>
                                    <td className="py-3 px-4 max-w-[300px] h-8">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={token.spark}>
                                                <Line
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke={
                                                        token.change.startsWith("+") ? "#4ade80" : "#f87171"
                                                    }
                                                    strokeWidth={2}
                                                    dot={false}
                                                    animationDuration={300}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </td>
                                    <td className="py-3 px-4">
                                        {editIndex === idx ? (
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    value={tempHolding == '0.0000' ? '' : tempHolding}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                        setTempHolding(e.target.value);
                                                    }}
                                                    className="w-32 h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] transition-all duration-150 focus:ring-2 focus:ring-[#A9E851]/20"
                                                    type="number"
                                                    placeholder="Enter Value"
                                                    step="any"
                                                    min="0"
                                                    autoFocus
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSave(token.id)}
                                                    className="bg-[#A9E851] hover:bg-[#A9E851]/80 text-[13px] hover:text-black text-black px-2 transition-all duration-150"
                                                >
                                                    Save
                                                </Button>
                                            </div>
                                        ) : (
                                            holdings[token.id] || '0.0000'
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        ${((parseFloat(holdings[token.id] || '0') * token.current_price) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 relative">
                                        <div className="flex items-center gap-2">

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1 hover:bg-[#333] rounded transition-colors duration-150">
                                                        <MoreVertical size={16} className="text-[#A1A1AA]" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-[#27272A] text-white animate-in fade-in-0 zoom-in-95" side="left" align="start">
                                                    <DropdownMenuItem onClick={() => handleEdit(idx, token.id)} className="text-[#A1A1AA] cursor-pointer hover:!bg-[#333] hover:!text-white transition-colors duration-150">
                                                        <svg width="14" height="15" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                                                            <path d="M2.83331 13.5556C2.83331 13.5556 6.03242 13.0507 6.8742 12.2089C7.71598 11.3671 13.3871 5.696 13.3871 5.696C14.1311 4.952 14.1311 3.74578 13.3871 3.00267C12.6431 2.25867 11.4369 2.25867 10.6938 3.00267C10.6938 3.00267 5.02265 8.67378 4.18087 9.51556C3.33909 10.3573 2.8342 13.5564 2.8342 13.5564L2.83331 13.5556Z" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M6.83332 2.44444H1.05554" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M3.27776 5.55556H1.05554" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        Edit Holdings
                                                    </DropdownMenuItem>
                                                        <div className="border-b border-[#444]"></div>
                                                    <DropdownMenuItem
                                                        className="text-red-400 cursor-pointer hover:!bg-[#333] hover:!text-red-400 transition-colors duration-150"
                                                        onClick={() => handleRemoveToken(token.id)}
                                                    >
                                                        <Trash2 size={14} className="mr-2" /> Remove
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
                        </table>

                        {/* Pagination - only show when there are tokens */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[#A1A1AA] p-4 text-sm w-full gap-3 sm:gap-5">
                    <span className="text-center sm:text-left">
                        {paginationInfo.startItem} — {paginationInfo.endItem} of {tokens.length} results
                    </span>

                    <div className="flex justify-center sm:justify-end gap-2 items-center">
                        <span>Page {currentPage} of {totalPages}</span>
                        <Button
                            variant="link"
                            className="text-[#A1A1AA] disabled:opacity-50 transition-all duration-150"
                            onClick={handlePrevPage}
                            disabled={currentPage === 1 || isLoading}
                        >
                            Prev
                        </Button>
                        <Button
                            variant="link"
                            className="text-[#A1A1AA] disabled:opacity-50 transition-all duration-150"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || isLoading}
                        >
                            Next
                        </Button>
                    </div>
                        </div>
                    </>
                )}


            </div>
            <AddTokenModal 
                open={isModalOpen} 
                setOpen={setIsModalOpen} 
                onAdd={handleAddTokens}
                selectedTokens={modalSelectedTokens}
                setSelectedTokens={setModalSelectedTokens}
            />

            {error && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg animate-in fade-in-0 slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-400 rounded-full flex-shrink-0"></div>
                        <div>
                            <h4 className="text-red-300 font-medium text-sm">Error loading data</h4>
                            <p className="text-red-300/80 text-xs mt-1">{error}</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 bg-red-900/30 border-red-700/50 text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors duration-150"
                        onClick={handleRefreshPrices}
                    >
                        <RefreshCw size={12} className="mr-1" />
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
};

export default TableComponent;