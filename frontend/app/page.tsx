"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  FolderOpen,
  CheckSquare,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface DashboardMetrics {
  total_workspaces: number;
  total_projects: number;
  total_tasks: number;
  pending_approvals: number;
  active_users: number;
  tool_calls_today: number;
  success_rate: number;
}

interface ToolExecutionTrend {
  date: string;
  count: number;
}

interface SuccessFailureDistribution {
  success: number;
  failure: number;
}

interface ToolUsageDistribution {
  tool_name: string;
  count: number;
}

interface LatencyTrend {
  date: string;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
}

interface ErrorDistribution {
  error_type: string;
  count: number;
}

interface ApprovalStatistics {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  expired: number;
  avg_review_time_hours: number;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp = true,
  color = "text-primary",
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 ${trendUp ? "text-green-600" : "text-red-600"}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ToolExecutionTrendsChart({ data }: { data: ToolExecutionTrend[] }) {
  if (!data?.length) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Tool Executions (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), "MMM d")}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(value) => format(new Date(value), "MMM d, yyyy")}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SuccessFailureChart({ data }: { data: SuccessFailureDistribution }) {
  if (!data) return <Skeleton className="h-64 w-full" />;

  const chartData = [
    { name: "Success", value: data.success, fill: "#10b981" },
    { name: "Failure", value: data.failure, fill: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Success vs Failure</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [value, "calls"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolUsageChart({ data }: { data: ToolUsageDistribution[] }) {
  if (!data?.length) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Tool Usage Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" tick={{ fill: "currentColor" }} />
              <YAxis
                type="category"
                dataKey="tool_name"
                width={120}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LatencyTrendsChart({ data }: { data: LatencyTrend[] }) {
  if (!data?.length) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Latency Trends (ms)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), "MMM d")}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(value) => format(new Date(value), "MMM d, yyyy")}
              />
              <Line
                type="monotone"
                dataKey="avg_latency_ms"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Avg"
              />
              <Line
                type="monotone"
                dataKey="p50_latency_ms"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="P50"
              />
              <Line
                type="monotone"
                dataKey="p95_latency_ms"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="P95"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorDistributionChart({ data }: { data: ErrorDistribution[] }) {
  if (!data?.length) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Error Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" tick={{ fill: "currentColor" }} />
              <YAxis
                type="category"
                dataKey="error_type"
                width={140}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalStatsCard({ data }: { data: ApprovalStatistics }) {
  if (!data) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Approval Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-green-50">
            <div className="text-2xl font-bold text-green-600">{data.approved}</div>
            <div className="text-xs text-green-700">Approved</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50">
            <div className="text-2xl font-bold text-red-600">{data.rejected}</div>
            <div className="text-xs text-red-700">Rejected</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50">
            <div className="text-2xl font-bold text-yellow-600">{data.pending}</div>
            <div className="text-xs text-yellow-700">Pending</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="text-sm text-muted-foreground">Avg Review Time</div>
            <div className="text-xl font-bold">{data.avg_review_time_hours.toFixed(1)}h</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Expired</div>
            <div className="text-xl font-bold text-gray-500">{data.expired}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewContent() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => api.getDashboardMetrics("default-workspace-id"),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["tool-execution-trends"],
    queryFn: () => api.getToolExecutionTrends("default-workspace-id"),
  });

  const { data: successFailure, isLoading: sfLoading } = useQuery({
    queryKey: ["success-failure-distribution"],
    queryFn: () => api.getSuccessFailureDistribution("default-workspace-id"),
  });

  const { data: toolUsage, isLoading: tuLoading } = useQuery({
    queryKey: ["tool-usage-distribution"],
    queryFn: () => api.getToolUsageDistribution("default-workspace-id"),
  });

  const { data: latency, isLoading: latencyLoading } = useQuery({
    queryKey: ["latency-trends"],
    queryFn: () => api.getLatencyTrends("default-workspace-id"),
  });

  const { data: errors, isLoading: errorsLoading } = useQuery({
    queryKey: ["error-distribution"],
    queryFn: () => api.getErrorDistribution("default-workspace-id"),
  });

  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["approval-statistics"],
    queryFn: () => api.getApprovalStatistics("default-workspace-id"),
  });

  const isLoading = metricsLoading || trendsLoading || sfLoading || tuLoading || latencyLoading || errorsLoading || approvalsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your MCP Control Room activity
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative flex h-full w-full rounded-full bg-green-500" />
            </span>
            Live
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Workspaces"
          value={metrics?.total_workspaces || 0}
          icon={Users}
          color="text-blue-500"
        />
        <MetricCard
          title="Projects"
          value={metrics?.total_projects || 0}
          icon={FolderOpen}
          color="text-purple-500"
        />
        <MetricCard
          title="Tasks"
          value={metrics?.total_tasks || 0}
          icon={CheckSquare}
          color="text-green-500"
        />
        <MetricCard
          title="Pending Approvals"
          value={metrics?.pending_approvals || 0}
          icon={Clock}
          trend={metrics?.pending_approvals && metrics.pending_approvals > 0 ? "Needs attention" : "All clear"}
          trendUp={!metrics?.pending_approvals || metrics.pending_approvals === 0}
          color="text-yellow-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ToolExecutionTrendsChart data={trends || []} />
        <SuccessFailureChart data={successFailure || { success: 0, failure: 0 }} />
        <ToolUsageChart data={toolUsage || []} />
        <LatencyTrendsChart data={latency || []} />
        <ErrorDistributionChart data={errors || []} />
        <ApprovalStatsCard data={approvals || { total: 0, approved: 0, rejected: 0, pending: 0, expired: 0, avg_review_time_hours: 0 }} />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 lg:ml-64">
        <OverviewContent />
      </div>
    </div>
  );
}