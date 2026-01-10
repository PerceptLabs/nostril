import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { useUsageHistory } from "@/hooks/useBilling";
import { formatBytes } from "@/lib/billing";

export function UsageChart() {
  const { data: history, isLoading } = useUsageHistory(6);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-pulse text-muted-foreground">Loading usage history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage History
          </CardTitle>
          <CardDescription>
            Monthly storage and bandwidth usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No usage history yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for the chart
  const chartData = history.map(record => ({
    month: formatMonth(record.id),
    storage: record.storageBytes / (1024 * 1024), // Convert to MB
    bandwidth: record.bandwidthBytes / (1024 * 1024), // Convert to MB
    storageCost: record.storageCost,
    bandwidthCost: record.bandwidthCost,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage History
        </CardTitle>
        <CardDescription>
          Monthly storage and bandwidth usage (in MB)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-medium mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-blue-500">
                            Storage: {formatBytes((payload[0]?.value as number) * 1024 * 1024)}
                          </p>
                          <p className="text-green-500">
                            Bandwidth: {formatBytes((payload[1]?.value as number) * 1024 * 1024)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                dataKey="storage"
                name="Storage (MB)"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="bandwidth"
                name="Bandwidth (MB)"
                fill="hsl(var(--chart-2))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Format YYYY-MM to readable month name
 */
function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}
