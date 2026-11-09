"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, AlertTriangle, Loader2, MoreHorizontal, Trash2, Settings, Terminal, Globe, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerResponse, MCPServerStatus, MCPTransportType } from "@/lib/api/servers";

interface ServerCardProps {
  server: MCPServerResponse;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  getStatusLabel: (status: MCPServerStatus) => string;
  getStatusColor: (status: MCPServerStatus) => string;
  getStatusIcon: (status: MCPServerStatus) => string;
  getTransportLabel: (transport: MCPTransportType) => string;
  getTransportColor: (transport: MCPTransportType) => string;
}

function StatusIcon({ status }: { status: MCPServerStatus; iconName: string }) {
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
    stdio: Terminal,
    streamable_http: Globe,
    sse: Zap,
  };

  const Icon = icons[transport] || Terminal;
  return <Icon className="h-4 w-4" />;
}

export function ServerCard({
  server,
  onDelete,
  isDeleting,
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  getTransportLabel,
  getTransportColor,
}: ServerCardProps) {
  const statusIcon = getStatusIcon(server.status);
  const transportIcon = server.transport_type;

  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{server.name}</h3>
              <Badge className={cn("gap-1", getTransportColor(server.transport_type))}>
                <TransportIcon transport={transportIcon} />
                {getTransportLabel(server.transport_type)}
              </Badge>
            </div>
            {server.description && (
              <p className="text-sm text-muted-foreground truncate">{server.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Badge className={cn("gap-1", getStatusColor(server.status))}>
              <StatusIcon status={server.status} iconName={statusIcon} />
              {getStatusLabel(server.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {server.id.slice(0, 8)}...
            </span>
          </div>
          {server.last_connected_at && (
            <div className="flex items-center gap-1">
              <Wifi className="h-3.5 w-3.5" />
              <span>Last: {new Date(server.last_connected_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Tools</p>
              <p className="font-mono text-lg">—</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Resources</p>
              <p className="font-mono text-lg">—</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Prompts</p>
              <p className="font-mono text-lg">—</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-0">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
        >
          View Details
        </Button>
        <div className="flex items-center gap-1 ml-2">
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
      </CardFooter>
    </Card>
  );
}