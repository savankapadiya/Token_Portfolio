import * as React from "react"
import {
    PieChart,
    Pie,
    Cell,
    Label,
    ResponsiveContainer,
} from "recharts"

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart"

// Portfolio data
const portfolioData = [
    { name: "Bitcoin (BTC)", value: 21, color: "#10B981" },   // green
    { name: "Ethereum (ETH)", value: 64.6, color: "#A78BFA" },// purple
    { name: "Solana (SOL)", value: 14.4, color: "#FB923C" },  // orange
    { name: "Solana (SOL)", value: 14.4, color: "#60A5FA" },  // sky blue
    { name: "Solana (SOL)", value: 14.4, color: "#FB7185" },  // pink
    { name: "Dogecoin (DOGE)", value: 14.4, color: "#18C9DD" },// teal
]

const chartConfig = {
    value: { label: "Percentage" },
    BTC: { label: "Bitcoin", color: "#10B981" },
    ETH: { label: "Ethereum", color: "#A78BFA" },
    SOL: { label: "Solana", color: "#2563eb" },
    DOGE: { label: "Dogecoin", color: "#18C9DD" },
} satisfies ChartConfig

export default function PortfolioChart() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full lg:w-fit">
            <span className="text-base text-[#A1A1AA] font-medium mb-2 self-start">Portfolio Total</span>
            <div className="flex lg:flex-row flex-col items-center gap-4 w-full">
                <ChartContainer config={chartConfig} className="lg:w-[180px] w-[270px] lg:h-[180px] h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie
                                data={portfolioData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={50}
                                outerRadius={80}
                                strokeWidth={3}
                            >
                                {portfolioData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                {/* Portfolio Data List with Color Text, vertical alignment */}
                <div className="flex flex-col gap-4 w-full lg:w-fit">
                    {portfolioData.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between w-full">
                            <span className="text-sm font-medium lg:w-[229px] w-full" style={{ color: d.color }}>{d.name}</span>
                            <span className="text-sm font-medium text-[#A1A1AA] lg:w-[229px] w-full text-right" >{d.value}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
