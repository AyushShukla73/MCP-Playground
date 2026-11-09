"use client";

import { useState } from "react";
import { useServerResources } from "@/hooks/use-servers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Database, Search, Download, FileText, Clock, User, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerResourceResponse } from "@/lib/api/servers";
import { toast } from "sonner";

export function ServerResourcesTab({ serverId }: { serverId: string }) {
  const { data: resourcesData, isLoading, refetch } = useServerResources(serverId);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResource, setSelectedResource] = useState<MCPServerResourceResponse | null>(null);
  const [isReadingResource, setIsReadingResource] = useState(false);
  const [readArgs, setReadArgs] = useState<string>("");
  const [resourceContent, setResourceContent] = useState<string | null>(null);

  const resources = resourcesData || [];
  const filteredResources = searchTerm
    ? resources.filter(
        (resource) =>
          resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          resource.uri.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      )
    : resources;

  const handleReadResource = async (resource: MCPServerResourceResponse) => {
    setSelectedResource(resource);
    setReadArgs("");
    setResourceContent(null);
  };

  const executeReadResource = async () => {
    if (!selectedResource) return;

    setIsReadingResource(true);

    try {
      let uriParams = {};
      if (readArgs.trim()) {
        uriParams = JSON.parse(readArgs);
      }

      const response = await fetch(`/api/servers/${serverId}/resources/${selectedResource.uri}/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(uriParams),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to read resource");
      }

      const data = await response.json();
      setResourceContent(data.content || JSON.stringify(data, null, 2));
      toast.success(`Resource "${selectedResource.name}" read successfully`);
    } catch (error) {
      setResourceContent(null);
      toast.error(`Failed to read resource: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsReadingResource(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Available Resources ({resources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources by name or URI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse bg-muted rounded" />
              ))}
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "No resources match your search" : "No resources discovered. Refresh discovery first."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-lg">{resource.name}</h3>
                          {!resource.is_enabled && (
                            <Badge variant="secondary" size="sm">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono mb-2">{resource.uri}</p>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground mb-2">{resource.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {resource.mime_type && (
                            <Badge variant="outline">
                              <Globe className="h-3 w-3 mr-1" />
                              {resource.mime_type}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Discovered: {new Date(resource.discovered_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadResource(resource)}
                          disabled={!resource.is_enabled}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Read
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedResource && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Read Resource: {selectedResource.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">URI Parameters (JSON, optional)</label>
              <Textarea
                placeholder='{"id": "example", "type": "data"}'
                rows={4}
                value={readArgs}
                onChange={(e) => setReadArgs(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Parameters to pass when reading the resource. Leave empty for no parameters.
              </p>
            </div>

            <Button onClick={executeReadResource} disabled={isReadingResource}>
              {isReadingResource ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reading...
                </>
              ) : (
                "Read Resource"
              )}
            </Button>

            {resourceContent && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <div className="bg-muted/50 p-3 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-all font-mono text-sm">
                      {resourceContent}
                    </pre>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      navigator.clipboard.writeText(resourceContent || "");
                      toast.success("Copied to clipboard");
                    }}
                  >
                    Copy to Clipboard
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}