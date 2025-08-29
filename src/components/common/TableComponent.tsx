import React, { useState } from "react";
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
    const itemsPerPage = 10;
    
    const {
        tokens,
        holdings,
        isLoading,
        error,
        addTokens,
        updateTokenHolding,
        removeTokenFromWatchlist,
        refreshPortfolio,
        getPaginatedTokens,
        getTotalPages
    } = useReduxPortfolio();

    const totalPages = getTotalPages(itemsPerPage);
    const displayedTokens = getPaginatedTokens(currentPage, itemsPerPage);

    const handleSave = (tokenId: string) => {
        // Update Redux state with temporary value
        updateTokenHolding(tokenId, tempHolding);
        setEditIndex(null);
        setTempHolding('');
        console.log("Saved value for token:", tokenId, "Value:", tempHolding);
    };

    const handleEdit = (idx: number, tokenId: string) => {
        setEditIndex(idx);
        setTempHolding(holdings[tokenId] || '0.0000');
    };


    const handleAddTokens = async (coinIds: string[]) => {
        await addTokens(coinIds);
    };

    const handleRefreshPrices = async () => {
        // Reset to first page when refreshing
        setCurrentPage(1);
        await refreshPortfolio();
    };

    const handleRemoveToken = (tokenId: string) => {
        removeTokenFromWatchlist(tokenId);
    };

    // Calculate pagination info
    const startItem = tokens.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(startItem + displayedTokens.length - 1, currentPage * itemsPerPage);

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    return (
        <div className="bg-[#212124] rounded-lg p-6 mt-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Star fill="#A9E851" color="#A9E851" size={28} />
                    <span className="text-white font-semibold text-2xl">Watchlist</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="bg-[#27272A] text-white border border-[#333] hover:bg-[#27272A] hover:text-white"
                        onClick={handleRefreshPrices}
                        disabled={isLoading}
                    >
                        <RefreshCw size={15} className={`text-[#A1A1AA] ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Refreshing...' : 'Refresh Prices'}
                    </Button>
                    <Button className="bg-[#A9E851] text-black font-semibold hover:bg-[#A9E851]/80 hover:text-black" onClick={() => setIsModalOpen(true)}>
                        <Plus size={15} /> Add Token
                    </Button>
                </div>
            </div>
            <div className="border border-[#ebebeb24]  rounded-2xl ">
                {/* Table */}
                <table className="min-w-full text-left text-sm overflow-x-auto ">
                    <thead>
                        <tr className="bg-[#27272A] text-[#A1A1AA]">
                            <th className="py-3 px-4 font-medium  max-w-[300px]">Token</th>
                            <th className="py-3 px-4 font-medium">Price</th>
                            <th className="py-3 px-4 font-medium">24h %</th>
                            <th className="py-3 px-4 font-medium">Sparkline (7d)</th>
                            <th className="py-3 px-4 font-medium">Holdings</th>
                            <th className="py-3 px-4 font-medium">Value</th>
                            <th className="py-3 px-4 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-[#212124] text-white">
                        {displayedTokens.map((token, idx) => {
                            return (
                            <tr
                                key={token.id}
                                className="border-b border-[#27272A] hover:bg-[#232328] transition"
                            >
                                <td className="py-3 px-4 flex items-center gap-2 max-w-[300px]">
                                    <img
                                        src={token.icon}
                                        alt={token.name}
                                        className="w-7 h-7 rounded-md"
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
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </td>
                                <td className="py-3 px-4">
                                    {editIndex === idx ? (
                                        <div className="flex gap-2 items-center">
                                            <Input
                                                value={tempHolding}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    setTempHolding(e.target.value);
                                                }}
                                                className="w-32 h-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                                type="number"
                                                step="any"
                                                min="0"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleSave(token.id)}
                                                className="bg-[#A9E851] hover:bg-[#A9E851]/80 text-[13px] hover:text-black text-black px-2"
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
                                                <button className="p-1 hover:bg-[#333] rounded">
                                                    <MoreVertical size={16} className="text-[#A1A1AA]" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-[#27272A] text-white" side="left" align="start">
                                                <DropdownMenuItem onClick={() => handleEdit(idx, token.id)} className="border-b border-[#444] text-[#A1A1AA] cursor-pointer hover:bg-[#292d27]">
                                                    <svg width="14" height="15" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                                                        <path d="M2.83331 13.5556C2.83331 13.5556 6.03242 13.0507 6.8742 12.2089C7.71598 11.3671 13.3871 5.696 13.3871 5.696C14.1311 4.952 14.1311 3.74578 13.3871 3.00267C12.6431 2.25867 11.4369 2.25867 10.6938 3.00267C10.6938 3.00267 5.02265 8.67378 4.18087 9.51556C3.33909 10.3573 2.8342 13.5564 2.8342 13.5564L2.83331 13.5556Z" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M6.83332 2.44444H1.05554" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M3.27776 5.55556H1.05554" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    Edit Holdings
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-red-400 cursor-pointer hover:bg-[#292d27]"
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
                        })}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex justify-between items-center text-[#A1A1AA] p-4 text-sm">
                    <span>{startItem} — {endItem} of {tokens.length} results</span>
                    <div className="flex gap-2 items-center">
                        <span>Page {currentPage} of {totalPages}</span>
                        <Button 
                            variant="link" 
                            className="text-[#A1A1AA] disabled:opacity-50"
                            onClick={handlePrevPage}
                            disabled={currentPage === 1 || isLoading}
                        >
                            Prev
                        </Button>
                        <Button 
                            variant="link" 
                            className="text-[#A1A1AA] disabled:opacity-50"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || isLoading}
                        >
                            Next
                        </Button>
                    </div>
                </div>

            </div>
             <AddTokenModal open={isModalOpen} setOpen={setIsModalOpen} onAdd={handleAddTokens} />
             
             {error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
             )}
        </div>
    );
};

export default TableComponent;