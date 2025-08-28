import React, { useState } from "react";
import {
    Pencil,
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
import fileThumb1 from '@/assets/file-thumbnails-1.png'; import fileThumb2 from '@/assets/file-thumbnails-2.png'; import fileThumb3 from '@/assets/file-thumbnails-3.png'; import fileThumb4 from '@/assets/file-thumbnails-4.png';
import AddTokenModal from "./AddTokenModal";
import { useWatchlist } from "@/hooks/useWatchlist";
import { usePortfolio } from "@/hooks/usePortfolio";
// Example sparkline data
const sampleData = [
    { value: 10 },
    { value: 12 },
    { value: 9 },
    { value: 15 },
    { value: 18 },
    { value: 16 },
    { value: 20 },
];

const tokens = [
    {
        icon: fileThumb1,
        name: 'Ethereum (ETH)',
        price: '$43,250.67',
        change: '+2.30%',
        spark: sampleData,
        holdings: '0.0500',
        value: '$2,162.53',
    },
    {
        icon: fileThumb2,
        name: 'Bitcoin (BTC)',
        price: '$2,654.32',
        change: '-1.20%',
        spark: sampleData,
        holdings: '2.5000',
        value: '$6,635.80',
    },
    {
        icon: fileThumb3,
        name: 'Solana (SOL)',
        price: '$98.45',
        change: '+4.70%',
        spark: sampleData,
        holdings: '2.5000',
        value: '$1,476.75',
    },
    {
        icon: fileThumb4,
        name: 'Dogecoin (DOGE)',
        price: '$43,250.67',
        change: '+2.30%',
        spark: sampleData,
        holdings: '0.0500',
        value: '$2,162.53',
    },
    {
        icon: fileThumb2,
        name: 'USDC',
        price: '$2,654.32',
        change: '-1.20%',
        spark: sampleData,
        holdings: '2.5000',
        value: '$6,635.80',
    },
    {
        icon: fileThumb4,
        name: 'Stellar (XLM)',
        price: '$98.45',
        change: '+4.70%',
        spark: sampleData,
        holdings: '15.0000',
        value: '$1,476.75',
    },
];

const TableComponent = () => {
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const {
        tokenList,
        holdings,
        isLoading: watchlistLoading,
        error,
        addTokens,
        removeToken,
        updateHolding,
        refreshPrices
    } = useWatchlist(tokens);

    const { refreshPortfolio, isLoading: portfolioLoading } = usePortfolio();

    const handleSave = (idx: number) => {
        setEditIndex(null);
        console.log("Saved value:", holdings[idx]);
        // Value is automatically saved to localStorage via the hook
    };

    const handleAddTokens = async (coinIds: string[]) => {
        await addTokens(coinIds);
    };

    const handleRefreshPrices = async () => {
        await refreshPrices();
        await refreshPortfolio();
    };

    const handleRemoveToken = (idx: number) => {
        removeToken(idx);
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
                        disabled={watchlistLoading || portfolioLoading}
                    >
                        <RefreshCw size={15} className={`text-[#A1A1AA] ${(watchlistLoading || portfolioLoading) ? 'animate-spin' : ''}`} />
                        {(watchlistLoading || portfolioLoading) ? 'Refreshing...' : 'Refresh Prices'}
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
                        {tokenList.map((token, idx) => (
                            <tr
                                key={token.name}
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
                                                value={holdings[idx]}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    updateHolding(idx, e.target.value);
                                                }}
                                                className="w-24 h-8"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleSave(idx)}
                                                className="bg-[#A9E851] hover:bg-[#A9E851]/80 text-[13px] hover:text-black text-black px-2"
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    ) : (
                                        holdings[idx]
                                    )}
                                </td>
                                <td className="py-3 px-4">{token.value}</td>
                                <td className="py-3 px-4 relative">
                                    <div className="flex items-center gap-2">

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1 hover:bg-[#333] rounded">
                                                    <MoreVertical size={16} className="text-[#A1A1AA]" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-[#27272A] text-white">
                                                <DropdownMenuItem onClick={() => setEditIndex(idx)} className="border-b border-[#444]">
                                                    <Pencil size={14} className="mr-2" /> Edit Holdings
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-red-400"
                                                    onClick={() => handleRemoveToken(idx)}
                                                >
                                                    <Trash2 size={14} className="mr-2" /> Remove
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex justify-between items-center text-[#A1A1AA] p-4 text-sm">
                    <span>1 — 10 of 100 results</span>
                    <div className="flex gap-2 items-center">
                        <span>1 of 10 pages</span>
                        <Button variant="link" className=" text-[#52525B]">
                            Prev
                        </Button>
                        <Button variant="link" className=" text-[#A1A1AA]">
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
