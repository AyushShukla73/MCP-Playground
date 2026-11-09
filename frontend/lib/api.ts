import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { createClient } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.refresh_token) {
              const newToken = await this.refreshAccessToken(session.refresh_token);
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          }

          const supabase2 = createClient();
          await supabase2.auth.signOut();
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async patch<T>(url: string, data: unknown): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        return response.data.access_token;
      } catch (error) {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.client.post("/auth/login", { email, password });
    return response.data;
  }

  async register(email: string, password: string, fullName?: string) {
    const response = await this.client.post("/auth/register", { email, password, full_name: fullName });
    return response.data;
  }

  async getMe() {
    const response = await this.client.get("/auth/me");
    return response.data;
  }

  async logout() {
    const response = await this.client.post("/auth/logout");
    return response.data;
  }

  // Workspaces
  async getWorkspaces() {
    const response = await this.client.get("/workspaces");
    return response.data;
  }

  async getWorkspace(id: string) {
    const response = await this.client.get(`/workspaces/${id}`);
    return response.data;
  }

  async createWorkspace(data: { name: string; description?: string }) {
    const response = await this.client.post("/workspaces", data);
    return response.data;
  }

  async updateWorkspace(id: string, data: { name?: string; description?: string }) {
    const response = await this.client.patch(`/workspaces/${id}`, data);
    return response.data;
  }

  async deleteWorkspace(id: string) {
    const response = await this.client.delete(`/workspaces/${id}`);
    return response.data;
  }

  async getWorkspaceMembers(workspaceId: string) {
    const response = await this.client.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  }

  async addWorkspaceMember(workspaceId: string, data: { user_id: string; role: string }) {
    const response = await this.client.post(`/workspaces/${workspaceId}/members`, data);
    return response.data;
  }

  async updateWorkspaceMember(workspaceId: string, userId: string, data: { role: string }) {
    const response = await this.client.patch(`/workspaces/${workspaceId}/members/${userId}`, data);
    return response.data;
  }

  async removeWorkspaceMember(workspaceId: string, userId: string) {
    const response = await this.client.delete(`/workspaces/${workspaceId}/members/${userId}`);
    return response.data;
  }

  // Projects
  async getProjects(workspaceId: string, params?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
    sort_by?: "name" | "created_at" | "updated_at" | "task_count";
    sort_order?: "asc" | "desc";
  }) {
    const response = await this.client.get("/projects", { params: { workspace_id: workspaceId, ...params } });
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(workspaceId: string, data: { name: string; description?: string; status?: string }) {
    const response = await this.client.post("/projects", { workspace_id: workspaceId, ...data });
    return response.data;
  }

  async updateProject(id: string, data: { name?: string; description?: string; status?: string }) {
    const response = await this.client.patch(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: string) {
    const response = await this.client.delete(`/projects/${id}`);
    return response.data;
  }

  async getProjectSummary(id: string) {
    const response = await this.client.get(`/projects/${id}/summary`);
    return response.data;
  }

  // Project Members
  async getProjectMembers(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/members`);
    return response.data;
  }

  async addProjectMember(projectId: string, data: { user_id: string; role: string }) {
    const response = await this.client.post(`/projects/${projectId}/members`, data);
    return response.data;
  }

  async updateProjectMember(projectId: string, userId: string, data: { role: string }) {
    const response = await this.client.patch(`/projects/${projectId}/members/${userId}`, data);
    return response.data;
  }

  async removeProjectMember(projectId: string, userId: string) {
    const response = await this.client.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  }

  // Tasks
  async getTasks(projectId: string, params?: {
    status?: string;
    priority?: string;
    assignee_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.get("/tasks", {
      params: { project_id: projectId, ...params },
    });
    return response.data;
  }

  async getWorkspaceTasks(workspaceId: string, params?: {
    projectId?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sort_by?: "title" | "created_at" | "updated_at" | "priority" | "due_date";
    sort_order?: "asc" | "desc";
  }) {
    const response = await this.client.get("/tasks/workspace", {
      params: { workspace_id: workspaceId, ...params },
    });
    return response.data;
  }

  async getTask(id: string) {
    const response = await this.client.get(`/tasks/${id}`);
    return response.data;
  }

  async createTask(projectId: string, data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
    due_date?: string;
  }) {
    const response = await this.client.post("/tasks", { project_id: projectId, ...data });
    return response.data;
  }

  async updateTask(id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
    due_date?: string;
  }) {
    const response = await this.client.patch(`/tasks/${id}`, data);
    return response.data;
  }

  async deleteTask(id: string) {
    const response = await this.client.delete(`/tasks/${id}`);
    return response.data;
  }

  async searchTasks(projectId: string, query: string, params?: {
    status?: string;
    priority?: string;
    assignee_id?: string;
  }) {
    const response = await this.client.get("/tasks/search", {
      params: { project_id: projectId, query, ...params },
    });
    return response.data;
  }

  // Tool Calls
  async getToolCalls(params?: {
    workspace_id?: string;
    project_id?: string;
    tool_name?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.get("/tool-calls", { params });
    return response.data;
  }

  async getToolCall(id: string) {
    const response = await this.client.get(`/tool-calls/${id}`);
    return response.data;
  }

  // Approvals
  async getApprovals(params?: {
    workspace_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.get("/approvals", { params });
    return response.data;
  }

  async getApproval(id: string) {
    const response = await this.client.get(`/approvals/${id}`);
    return response.data;
  }

  async reviewApproval(id: string, data: { action: "approve" | "reject"; comment?: string }) {
    const response = await this.client.post(`/approvals/${id}/review`, data);
    return response.data;
  }

  async executeApproval(id: string) {
    const response = await this.client.post(`/approvals/${id}/execute`);
    return response.data;
  }

  async expireApprovals() {
    const response = await this.client.post("/approvals/expire");
    return response.data;
  }

  // Analytics
  async getDashboardMetrics(workspaceId: string, timeWindow?: string) {
    const response = await this.client.get("/analytics/dashboard", {
      params: { workspace_id: workspaceId, time_window: timeWindow },
    });
    return response.data;
  }

  async getToolExecutionTrends(workspaceId: string, timeWindow?: string) {
    const response = await this.client.get("/analytics/tool-execution-trends", {
      params: { workspace_id: workspaceId, time_window: timeWindow },
    });
    return response.data;
  }

  async getSuccessFailureDistribution(workspaceId: string, timeWindow?: string) {
    const response = await this.client.get("/analytics/success-failure-distribution", {
      params: { workspace_id: workspaceId, time_window: timeWindow },
    });
    return response.data;
  }

  async getToolUsageDistribution(workspaceId: string, timeWindow?: string) {
    const response = await this.client.get("/analytics/tool-usage-distribution", {
      params: { workspace_id: workspaceId, time_window: timeWindow },
    });
    return response.data;
  }

  async getLatencyTrends(workspaceId: string, timeWindow?: string) {
    const response = await this.client.get("/analytics/latency-trends", {
      params: { workspace_id: workspaceId, time_window: timeWindow },
    });
    return response.data;
  }

  async getErrorDistribution(workspaceId: string, timeWindow?: string) {
    const response = await this.client.get("/analytics/error-distribution", {
      params: { workspace_id: workspaceId, time_window: timeWindow },
    });
    return response.data;
  }

  async getApprovalStatistics(workspaceId: string, timeWindow?: string) {
    const response = await this.client.get("/analytics/approval-statistics", {
      params: { workspace_id: workspaceId, time_window: timeWindow },
    });
    return response.data;
  }
}

export const api = new ApiClient();