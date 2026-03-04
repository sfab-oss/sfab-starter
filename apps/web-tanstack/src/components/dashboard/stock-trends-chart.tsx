"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/shadcn/chart";
import { format, parseISO, subDays } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useInventoryMetrics } from "@/hooks/use-products";

const chartConfig = {
  in: {
    label: "Stock In",
    color: "var(--chart-2)",
  },
  out: {
    label: "Stock Out",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function StockTrendsChart() {
  const { data: metrics, isLoading } = useInventoryMetrics();

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    return format(d, "yyyy-MM-dd");
  });

  const dataMap = last30Days.reduce(
    (acc, date) => {
      acc[date] = { date, in: 0, out: 0 };
      return acc;
    },
    {} as Record<string, { date: string; in: number; out: number }>
  );

  const movements = metrics?.recentMovements || [];
  for (const m of movements) {
    const dateKey = m.date;
    if (dataMap[dateKey]) {
      if (m.type === "IN") {
        dataMap[dateKey].in += m.quantity;
      }
      if (m.type === "OUT") {
        dataMap[dateKey].out += m.quantity;
      }
    }
  }

  const chartData = Object.values(dataMap);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement Trends</CardTitle>
          <CardDescription>
            Incoming vs Outgoing stock over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full animate-pulse rounded-lg bg-muted/20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Movement Trends</CardTitle>
        <CardDescription>
          Incoming vs Outgoing stock over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="min-h-[250px] w-full" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              tickFormatter={(value) => format(parseISO(value), "MMM d")}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
            <defs>
              <linearGradient id="fillIn" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-in)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-in)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillOut" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-out)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-out)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="out"
              fill="url(#fillOut)"
              fillOpacity={0.4}
              stackId="a"
              stroke="var(--color-out)"
              type="natural"
            />
            <Area
              dataKey="in"
              fill="url(#fillIn)"
              fillOpacity={0.4}
              stackId="a"
              stroke="var(--color-in)"
              type="natural"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
