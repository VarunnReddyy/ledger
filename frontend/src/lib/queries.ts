import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./api";
import type {
  ClientListItem,
  DocumentDetail,
  DocumentListResponse,
  DocumentStatus,
  DocType,
  FieldCorrectRequest,
  FieldCorrectResponse,
  FieldTrace,
  FieldVerifyResponse,
  FulfillmentResult,
  MeResponse,
  MessageCreateRequest,
  MessageOut,
  ReturnDetail,
  ReturnFieldOut,
  ReturnListItem,
  Role,
  TaskListItem,
  ThreadOut,
} from "./types";

export interface TasksQueryParams {
  role: Role;
  user: string;
}

export interface RoleScopedParams {
  role: Role;
  user: string;
}

export interface ReturnsQueryParams {
  client?: string;
}

export interface DocumentsQueryParams {
  q?: string;
  type?: DocType | "";
  status?: DocumentStatus | "";
  year?: number;
  client?: string;
  page?: number;
  per_page?: number;
}

function buildSearchParams(
  entries: Record<string, string | number | undefined | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export function useTasks(params: TasksQueryParams | null) {
  return useQuery({
    queryKey: ["tasks", params?.role ?? null, params?.user ?? null],
    queryFn: () => {
      if (!params) {
        throw new Error("Tasks require an active role and user.");
      }
      return apiGet<TaskListItem[]>(
        `/api/tasks${buildSearchParams({ role: params.role, user: params.user })}`,
      );
    },
    enabled: Boolean(params?.role && params.user),
  });
}

export function useReturns(params: ReturnsQueryParams = {}) {
  const query = {
    client: params.client || undefined,
  };

  return useQuery({
    queryKey: ["returns", query],
    queryFn: () => apiGet<ReturnListItem[]>(`/api/returns${buildSearchParams(query)}`),
  });
}

export function useReturnDetail(
  returnId: string | undefined,
  scope?: RoleScopedParams | null,
) {
  return useQuery({
    queryKey: ["returns", returnId, scope?.role ?? null, scope?.user ?? null],
    queryFn: () =>
      apiGet<ReturnDetail>(
        `/api/returns/${returnId}${buildSearchParams({
          role: scope?.role,
          user: scope?.user,
        })}`,
      ),
    enabled: Boolean(returnId),
  });
}

export function useThread(
  threadId: string | undefined,
  scope?: RoleScopedParams | null,
) {
  return useQuery({
    queryKey: ["threads", threadId, scope?.role ?? null, scope?.user ?? null],
    queryFn: () =>
      apiGet<ThreadOut>(
        `/api/threads/${threadId}${buildSearchParams({
          role: scope?.role,
          user: scope?.user,
        })}`,
      ),
    enabled: Boolean(threadId && scope?.role && scope.user),
  });
}

export function useDocumentDetail(
  documentId: string | undefined,
  scope?: RoleScopedParams | null,
) {
  return useQuery({
    queryKey: ["documents", "detail", documentId, scope?.role ?? null, scope?.user ?? null],
    queryFn: () =>
      apiGet<DocumentDetail>(
        `/api/documents/${documentId}${buildSearchParams({
          role: scope?.role,
          user: scope?.user,
        })}`,
      ),
    enabled: Boolean(documentId),
  });
}

export function usePostThreadMessage(scope: RoleScopedParams | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      threadId,
      body,
    }: {
      threadId: string;
      body: MessageCreateRequest;
    }) => {
      if (!scope) {
        throw new Error("Posting a message requires an active role and user.");
      }
      return apiPost<MessageOut>(
        `/api/threads/${threadId}/messages${buildSearchParams({
          role: scope.role,
          user: scope.user,
        })}`,
        body,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
      void queryClient.invalidateQueries({ queryKey: ["returns"] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useFulfillRequest(scope: RoleScopedParams | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => {
      if (!scope) {
        throw new Error("Fulfilling a request requires an active role and user.");
      }
      return apiPost<FulfillmentResult>(
        `/api/requests/${requestId}/fulfill${buildSearchParams({
          role: scope.role,
          user: scope.user,
        })}`,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["returns"] });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

export function useTrace(fieldId: string | undefined) {
  return useQuery({
    queryKey: ["fields", fieldId, "trace"],
    queryFn: () => apiGet<FieldTrace>(`/api/fields/${fieldId}/trace`),
    enabled: Boolean(fieldId),
  });
}

function patchReturnField(
  detail: ReturnDetail | undefined,
  fieldId: string,
  patch: Partial<ReturnFieldOut>,
): ReturnDetail | undefined {
  if (!detail) {
    return detail;
  }
  return {
    ...detail,
    sections: detail.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    })),
  };
}

export function useVerifyField(fieldId: string | undefined, returnId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<FieldVerifyResponse>(`/api/fields/${fieldId}/verify`),
    onMutate: async () => {
      if (!fieldId) {
        return;
      }
      await queryClient.cancelQueries({ queryKey: ["fields", fieldId, "trace"] });
      if (returnId) {
        await queryClient.cancelQueries({ queryKey: ["returns", returnId] });
      }

      const previousTrace = queryClient.getQueryData<FieldTrace>(["fields", fieldId, "trace"]);
      const previousReturns = returnId
        ? queryClient.getQueriesData<ReturnDetail>({ queryKey: ["returns", returnId] })
        : [];

      if (previousTrace) {
        queryClient.setQueryData<FieldTrace>(["fields", fieldId, "trace"], {
          ...previousTrace,
          field: { ...previousTrace.field, state: "verified" },
        });
      }
      if (returnId) {
        queryClient.setQueriesData<ReturnDetail>({ queryKey: ["returns", returnId] }, (current) =>
          patchReturnField(current, fieldId, { state: "verified" }),
        );
      }

      return { previousTrace, previousReturns };
    },
    onError: (_error, _vars, context) => {
      if (!fieldId || !context) {
        return;
      }
      if (context.previousTrace) {
        queryClient.setQueryData(["fields", fieldId, "trace"], context.previousTrace);
      }
      for (const [key, data] of context.previousReturns) {
        queryClient.setQueryData(key, data);
      }
    },
    onSuccess: (data) => {
      if (!fieldId) {
        return;
      }
      queryClient.setQueryData<FieldTrace>(["fields", fieldId, "trace"], (current) =>
        current
          ? {
              ...current,
              field: {
                ...current.field,
                value: data.field.value,
                state: data.field.state,
              },
            }
          : current,
      );
      if (returnId) {
        queryClient.setQueriesData<ReturnDetail>({ queryKey: ["returns", returnId] }, (current) =>
          patchReturnField(current, fieldId, data.field),
        );
      }
    },
  });
}

export function useCorrectField(fieldId: string | undefined, returnId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: FieldCorrectRequest) =>
      apiPost<FieldCorrectResponse>(`/api/fields/${fieldId}/correct`, {
        value: body.value,
        reason: body.reason ?? "",
      }),
    onSuccess: (data) => {
      if (!fieldId) {
        return;
      }
      queryClient.setQueryData<FieldTrace>(["fields", fieldId, "trace"], (current) =>
        current
          ? {
              ...current,
              field: {
                ...current.field,
                value: data.field.value,
                state: data.field.state,
              },
              correction: data.correction,
            }
          : current,
      );
      if (returnId) {
        queryClient.setQueriesData<ReturnDetail>({ queryKey: ["returns", returnId] }, (current) =>
          patchReturnField(current, fieldId, data.field),
        );
      }
    },
  });
}

export function useDocuments(params: DocumentsQueryParams = {}) {
  const page = params.page ?? 1;
  const perPage = params.per_page ?? 50;
  const query = {
    q: params.q?.trim() || undefined,
    type: params.type || undefined,
    status: params.status || undefined,
    year: params.year,
    client: params.client || undefined,
    page,
    per_page: perPage,
  };

  return useQuery({
    queryKey: ["documents", query],
    queryFn: () =>
      apiGet<DocumentListResponse>(`/api/documents${buildSearchParams(query)}`),
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => apiGet<ClientListItem[]>("/api/clients"),
  });
}

export function useMe(roleContext?: string | null) {
  return useQuery({
    queryKey: ["me", roleContext ?? null],
    queryFn: () =>
      apiGet<MeResponse>(
        `/api/me${buildSearchParams({ role_context: roleContext ?? undefined })}`,
      ),
  });
}
