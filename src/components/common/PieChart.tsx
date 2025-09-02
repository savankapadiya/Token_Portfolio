import * as React from "react"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts"

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

interface PortfolioChartProps {
    tokenList: Array<{
        id: string
        name: string
        symbol: string
        current_price: number
        value: string
        holdings: string
    }>
}

const colors = ["#10B981", "#A78BFA", "#FB923C", "#60A5FA", "#FB7185", "#18C9DD", "#F59E0B", "#EF4444"]

const chartConfig = {
    value: { label: "Percentage" },
} satisfies ChartConfig

export default function PortfolioChart({ tokenList = [] }: PortfolioChartProps) {
    const portfolioData = React.useMemo(() => {
        if (tokenList.length === 0) return []
        
        const totalValue = tokenList.reduce((sum, token) => {
            const value = parseFloat(token.value.replace('$', '').replace(/,/g, '')) || 0
            return sum + value
        }, 0)
        
        if (totalValue === 0) return []
        
        return tokenList.map((token, index) => {
            const value = parseFloat(token.value.replace('$', '').replace(/,/g, '')) || 0
            const percentage = (value / totalValue) * 100
            
            return {
                name: `${token.name.split(' (')[0]} (${token.symbol})`,
                value: percentage,
                color: colors[index % colors.length],
                dollarValue: token.value
            }
        }).filter(item => item.value > 0)
    }, [tokenList])

    if (portfolioData.length === 0) {
        return (
            <div className="flex flex-col items-start justify-center h-full w-full lg:w-fit">
                <span className="text-base text-[#A1A1AA] font-medium mb-2 text-left">Portfolio Total</span>
                <div className="flex flex-col items-start justify-center gap-2 w-full min-h-[200px] text-center">
                    <span className="text-sm text-[#A1A1AA]">No portfolio data available</span>
                    <span className="text-xs text-[#A1A1AA]">Add tokens with holdings to see chart</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-start justify-center h-full w-full lg:w-fit">
            <span className="text-base text-[#A1A1AA] font-medium mb-2">Portfolio Total</span>
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
                <div className="flex flex-col gap-4 w-full lg:w-fit">
                    {portfolioData.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between w-full">
                            <span className="text-sm font-medium lg:w-[229px] w-full" style={{ color: d.color }}>{d.name}</span>
                            <span className="text-sm font-medium text-[#A1A1AA] lg:w-[229px] w-full text-right">{d.value.toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
