"use client";

import { useState } from "react";
import { useServerPrompts } from "@/hooks/use-servers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Search, Send, Copy, Clock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCPServerPromptResponse } from "@/lib/api/servers";
import { toast } from "sonner";

interface PromptExecutionForm {
  promptId: string;
  arguments: Record<string, string>;
}

export function ServerPromptsTab({ serverId }: { serverId: string }) {
  const { data: promptsData, isLoading, refetch } = useServerPrompts(serverId);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<MCPServerPromptResponse | null>(null);
  const [isExecutingPrompt, setIsExecutingPrompt] = useState(false);
  const [promptArgs, setPromptArgs] = useState<Record<string, string>>({});
  const [promptResult, setPromptResult] = useState<string | null>(null);

  const prompts = promptsData || [];
  const filteredPrompts = searchTerm
    ? prompts.filter(
        (prompt) =>
          prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (prompt.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      )
    : prompts;

  const handleExecutePrompt = async (prompt: MCPServerPromptResponse) => {
    setSelectedPrompt(prompt);
    setPromptArgs({});
    setPromptResult(null);
  };

  const executePrompt = async () => {
    if (!selectedPrompt) return;

    setIsExecutingPrompt(true);
    setPromptResult(null);

    try {
      const argsArray = selectedPrompt.arguments.map((arg) => ({
        name: arg.name || arg,
        value: promptArgs[arg.name || arg] || "",
      }));

      const response = await fetch(`/api/servers/${serverId}/prompts/${selectedPrompt.name}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ arguments: promptArgs }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to execute prompt");
      }

      const data = await response.json();
      setPromptResult(data.content || JSON.stringify(data, null, 2));
      toast.success(`Prompt "${selectedPrompt.name}" executed successfully`);
    } catch (error) {
      setPromptResult(null);
      toast.error(`Failed to execute prompt: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsExecutingPrompt(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Available Prompts ({prompts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
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
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "No prompts match your search" : "No prompts discovered. Refresh discovery first."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredPrompts.map((prompt) => (
                <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-lg">{prompt.name}</h3>
                          {!prompt.is_enabled && (
                            <Badge variant="secondary" size="sm">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        {prompt.description && (
                          <p className="text-sm text-muted-foreground mb-2">{prompt.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Discovered: {new Date(prompt.discovered_at).toLocaleDateString()}
                          </Badge>
                          {prompt.arguments.length > 0 && (
                            <Badge variant="outline">
                              {prompt.arguments.length} arg{prompt.arguments.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExecutePrompt(prompt)}
                          disabled={!prompt.is_enabled || isExecutingPrompt}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Execute
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

      {selectedPrompt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Execute Prompt: {selectedPrompt.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPrompt.description && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">{selectedPrompt.description}</p>
              </div>
            )}

            {selectedPrompt.arguments.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium">Arguments</h4>
                {selectedPrompt.arguments.map((arg) => (
                  <div key={arg.name || arg} className="space-y-1">
                    <label className="text-xs text-muted-foreground block">
                      {arg.name || arg}
                      {arg.required && "*"}
                    </label>
                    <Input
                      placeholder={arg.description || `Enter value for ${arg.name || arg}`}
                      value={promptArgs[arg.name || arg] || ""}
                      onChange={(e) =>
                        setPromptArgs({
                          ...promptArgs,
                          [arg.name || arg]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mb-4">
                This prompt does not require any arguments.
              </div>
            )}

            <Button onClick={executePrompt} disabled={isExecutingPrompt}>
              {isExecutingPrompt ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                "Execute Prompt"
              )}
            </Button>

            {promptResult && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium mb-2 block">Result</label>
                  <div className="bg-muted/50 p-3 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-all font-mono text-sm">
                      {promptResult}
                    </pre>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(promptResult || "");
                        toast.success("Copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Result
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}