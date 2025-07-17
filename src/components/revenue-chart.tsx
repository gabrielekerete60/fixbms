"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartData = [
  { day: 'Mon', revenue: 500 },
  { day: 'Tue', revenue: 1200 },
  { day: 'Wed', revenue: 800 },
  { day: 'Thu', revenue: 1500 },
  { day: 'Fri', revenue: 2100 },
  { day: 'Sat', revenue: 3800 },
  { day: 'Sun', revenue: 3200 },
];

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
};

export function RevenueChart() {
    return (
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
            />
            <YAxis
                tickFormatter={(value) => `₦${value.toLocaleString()}`}
            />
            <ChartTooltip
                content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            </BarChart>
        </ChartContainer>
    )
}
