"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Eye, Edit3, AlertTriangle, HelpCircle, Settings, Trash2, Loader2, ExternalLink, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryTypeDisplay, useDecisionTypeDisplay, useRoleDisplay } from "@/hooks/use-permissions";
import type { ToolWithCategory, ToolCategoryType, DecisionType, RoleType } from "@/lib/api/permissions";

interface ToolCardProps {
  tool: ToolWithCategory;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
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

function CategoryIcon({ category, getCategoryIcon }: { category: ToolCategoryType | undefined; getCategoryIcon: (category: ToolCategoryType) => string }) {
  const iconName = category ? getCategoryIcon(category) : "help-circle";
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    eye: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    "edit-3": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    "alert-triangle": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    "help-circle": ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const Icon = icons[iconName] || (({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ));

  return <Icon className="h-3 w-3" />;
}

export function ToolCard({
  tool,
  onDelete,
  isDeleting,
}: ToolCardProps) {
  const category = (tool.permission_category || tool.category?.default_category) as ToolCategoryType | undefined;
  const { getCategoryLabel, getCategoryColor, getCategoryIcon } = useCategoryTypeDisplay();
  const { getDecisionLabel, getDecisionColor, getDecisionIcon } = useDecisionTypeDisplay();
  const { getRoleLabel, getRoleColor } = useRoleDisplay();

  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-lg truncate">{tool.name}</h3>
              <Badge className={cn("gap-1", getCategoryColor(category))}>
                <CategoryIcon category={category} getCategoryIcon={getCategoryIcon} />
                {getCategoryLabel(category)}
              </Badge>
              {tool.requires_approval && (
                <Badge className={cn("gap-1", "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300")}>
                  <ShieldAlert className="h-3 w-3" />
                  Requires Approval
                </Badge>
              )}
            </div>
            {tool.description && (
              <p className="text-sm text-muted-foreground truncate">{tool.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Badge className={cn("gap-1", getDecisionColor(tool.is_enabled ? "allowed" : "denied"))}>
              <StatusIcon iconName={tool.is_enabled ? "check-circle-2" : "x-circle"} />
              {tool.is_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <Server className="h-3.5 w-3.5" />
            <span className="truncate max-w-[150px]">{tool.server_name}</span>
          </div>
          {tool.allowed_roles && tool.allowed_roles.length > 0 && (
            <div className="flex items-center gap-1">
              {tool.allowed_roles.map((role) => (
                <Badge
                  key={role}
                  variant="secondary"
                  className={cn("gap-1 text-xs", getRoleColor(role as RoleType))}
                >
                  {getRoleLabel(role as RoleType)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Discovered</p>
              <p className="font-mono text-xs">
                {tool.discovered_at
                  ? new Date(tool.discovered_at).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="font-mono text-xs">
                {tool.updated_at
                  ? new Date(tool.updated_at).toLocaleDateString()
                  : "Unknown"}
              </p>
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
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(tool.id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}