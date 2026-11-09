"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, AlertTriangle, Loader2, Trash2, Settings, ChevronUp, ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerResponse, MCPServerStatus, MCPTransportType } from "@/lib/api/servers";

interface ServerTableProps {
  servers: MCPServerResponse[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
  getStatusLabel: (status: MCPServerStatus) => string;
  getStatusColor: (status: MCPServerStatus) => string;
  getStatusIcon: (status: MCPServerStatus) => string;
  getTransportLabel: (transport: MCPTransportType) => string;
  getTransportColor: (transport: MCPTransportType) => string;
}

function StatusIcon({ iconName }: { iconName: string }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    "check-circle-2": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "x-circle": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "alert-triangle": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    "loader-2": ({ className }) => (
      <svg className={`${className} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  };

  const Icon = icons[iconName] || (({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ));

  return <Icon className="h-4 w-4" />;
}

function TransportIcon({ transport }: { transport: MCPTransportType }) {
  const icons: Record<MCPTransportType, React.ComponentType<{ className?: string }>> = {
    stdio: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    streamable_http: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ),
    sse: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  };

  const Icon = icons[transport] || icons.stdio;
  return <Icon className="h-4 w-4" />;
}

export function ServerTable({
  servers,
  onDelete,
  isDeleting,
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  getTransportLabel,
  getTransportColor,
}: ServerTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">Name</TableHead>
            <TableHead className="w-32">Transport</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead>Last Connected</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {servers.map((server) => {
            const statusIcon = getStatusIcon(server.status);
            return (
              <TableRow key={server.id} className="hover:bg-muted/50">
                <TableCell>
                  <div>
                    <p className="font-medium truncate max-w-[200px]">{server.name}</p>
                    {server.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{server.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1", getTransportColor(server.transport_type))}>
                    <TransportIcon transport={server.transport_type} />
                    {getTransportLabel(server.transport_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1", getStatusColor(server.status))}>
                    <StatusIcon iconName={statusIcon} />
                    {getStatusLabel(server.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {server.last_connected_at
                    ? new Date(server.last_connected_at).toLocaleString()
                    : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(server.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}