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
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/shadcn/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { useInventoryMetrics } from "@/hooks/query/use-products";

const chartConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function InventoryValueChart() {
  const { data: metrics, isLoading } = useInventoryMetrics();

  // Calculate total value per product and sort by top 5
  const data =
    metrics?.activeProducts
      .map((p) => ({
        name: p.name,
        value: p.totalStock * Number.parseFloat(p.price || "0"),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Inventory Value</CardTitle>
          <CardDescription>
            Highest value assets by stock × price
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
        <CardTitle>Top Inventory Value</CardTitle>
        <CardDescription>Highest value assets by stock × price</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="min-h-[250px] w-full" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              axisLine={false}
              dataKey="name"
              tickFormatter={(value) =>
                value.slice(0, 15) + (value.length > 15 ? "..." : "")
              }
              tickLine={false}
              tickMargin={10}
              type="category"
              width={100}
            />
            <XAxis hide type="number" />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
              cursor={false}
            />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              layout="vertical"
              radius={4}
            >
              <LabelList
                className="fill-foreground"
                dataKey="value"
                fontSize={12}
                formatter={(value: number) => `$${value.toLocaleString()}`}
                offset={8}
                position="right"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
