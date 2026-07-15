import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import type { AttachmentData } from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useGristOptional } from "grist-widget-sdk";

const models = [
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
    providers: ["openai"],
  },
];
type GatewayModelOption = (typeof models)[0];

const suggestions = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for React development",
  "Tell me about TypeScript benefits",
  "How to optimize database queries?",
  "What is the difference between SQL and NoSQL?",
  "Explain cloud computing basics",
];

const chefs = ["OpenAI"];
const AI_GATEWAY_URL_STORAGE_KEY = "ask-ai:ai-gateway-url";
type StoredGatewayConfig = {
  apiKey?: string;
  apiUrl?: string;
  modelById?: Record<string, string>;
  provider?: "openai" | "genial";
  libraries?: string[];
};
type ModelConfigRow = {
  id: string;
  name: string;
  modelId: string;
  saved: boolean;
};
const DEFAULT_STORED_GATEWAY_CONFIG: StoredGatewayConfig = {
  apiKey: "",
  apiUrl: "https://api.openai.com/v1/chat/completions",
  provider: "openai",
  libraries: [],
  modelById: {
    [models[0]?.id ?? "gpt-4o-mini"]: "gpt-4o-mini",
  },
};
const SYSTEM_PROMPT = "You are a helpful data analyst.";
const createModelConfigRow = (
  input?: Partial<Pick<ModelConfigRow, "name" | "modelId" | "saved">>
): ModelConfigRow => ({
  id: `model-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  modelId: input?.modelId ?? "",
  name: input?.name ?? "",
  saved: input?.saved ?? false,
});

const normalizeStoredGatewayConfig = (
  config?: StoredGatewayConfig
): Required<StoredGatewayConfig> => ({
  apiKey: config?.apiKey ?? DEFAULT_STORED_GATEWAY_CONFIG.apiKey ?? "",
  apiUrl: config?.apiUrl ?? DEFAULT_STORED_GATEWAY_CONFIG.apiUrl ?? "",
  provider:
    config?.provider ??
    (config?.apiUrl?.includes("genial") || config?.apiUrl?.includes("artemis")
      ? "genial"
      : DEFAULT_STORED_GATEWAY_CONFIG.provider ?? "openai"),
  libraries: Array.isArray(config?.libraries)
    ? config.libraries.filter((lib): lib is string => typeof lib === "string")
    : (DEFAULT_STORED_GATEWAY_CONFIG.libraries ?? []),
  modelById: config?.modelById ?? DEFAULT_STORED_GATEWAY_CONFIG.modelById ?? {},
});

const modelByIdToRows = (modelById: Record<string, string>): ModelConfigRow[] => {
  const rows = Object.entries(modelById).map(([name, modelId]) =>
    createModelConfigRow({ modelId, name, saved: true })
  );
  return [...rows, createModelConfigRow()];
};

type InitialGatewayState = {
  apiKeyInput: string;
  apiUrlInput: string;
  gatewayModelById: Record<string, string>;
  modelRows: ModelConfigRow[];
  jsonConfigInput: string;
  gatewayProvider: "openai" | "genial";
  gatewayLibraries: string[];
};

let cachedInitialGatewayState: InitialGatewayState | undefined;

const getInitialGatewayState = (): InitialGatewayState => {
  if (cachedInitialGatewayState) {
    return cachedInitialGatewayState;
  }

  const defaults = normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG);
  const base: InitialGatewayState = {
    apiKeyInput: defaults.apiKey,
    apiUrlInput: defaults.apiUrl,
    gatewayModelById: defaults.modelById,
    modelRows: modelByIdToRows(defaults.modelById),
    jsonConfigInput: JSON.stringify(defaults, null, 2),
    gatewayProvider: defaults.provider,
    gatewayLibraries: defaults.libraries,
  };

  if (typeof window === "undefined") {
    cachedInitialGatewayState = base;
    return base;
  }

  const raw = window.localStorage.getItem(AI_GATEWAY_URL_STORAGE_KEY);
  if (!raw) {
    cachedInitialGatewayState = base;
    return base;
  }

  try {
    const normalized = normalizeStoredGatewayConfig(
      JSON.parse(raw) as StoredGatewayConfig
    );
    cachedInitialGatewayState = {
      apiKeyInput: normalized.apiKey,
      apiUrlInput: normalized.apiUrl,
      gatewayModelById: normalized.modelById,
      modelRows: modelByIdToRows(normalized.modelById),
      jsonConfigInput: JSON.stringify(normalized, null, 2),
      gatewayProvider: normalized.provider,
      gatewayLibraries: normalized.libraries,
    };
  } catch {
    cachedInitialGatewayState = {
      ...base,
      apiUrlInput: raw,
    };
  }

  return cachedInitialGatewayState;
};

const modelRowsToModelById = (rows: ModelConfigRow[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (!row.saved) continue;
    const name = row.name.trim();
    const modelId = row.modelId.trim();
    if (!(name && modelId)) continue;
    out[name] = modelId;
  }
  return out;
};

type GatewayMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: GatewayToolCall[];
};

type GatewayToolCall = {
  id: string;
  function: {
    arguments?: string;
    name: string;
  };
  type: "function";
};

type GetGristTableNamesToolArgs = Record<string, never>;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  includeInContext?: boolean;
  toolEvent?: {
    errorText?: string;
    input: unknown;
    output?: unknown;
    state: "output-available" | "output-error";
    toolName: string;
  };
};

type GatewayChatResponse = {
  choices?: Array<{
    content?: string | Array<{ text?: string; type?: string }>;
    text?: string;
    function_call?: {
      arguments?: string;
      name?: string;
    };
    message?: {
      content?: string | Array<{ text?: string; type?: string }>;
      function_call?: {
        arguments?: string;
        name?: string;
      };
      tool_calls?: GatewayToolCall[];
    };
    tool_calls?: GatewayToolCall[];
  }>;
  message?: {
    content?: string | Array<{ text?: string; type?: string }>;
    function_call?: {
      arguments?: string;
      name?: string;
    };
    tool_calls?: GatewayToolCall[];
  };
  content?: string | Array<{ text?: string; type?: string }>;
  text?: string;
  error?: {
    message?: string;
  };
};

const coerceText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item)).join("").trim();
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("text" in record) return coerceText(record.text);
    if ("value" in record) return coerceText(record.value);
    if ("content" in record) return coerceText(record.content);
  }
  return "";
};

const isGatewayErrorLikeMessage = (text: string): boolean => {
  const raw = text.trim();
  if (!raw) return false;
  const lowered = raw.toLowerCase();
  if (lowered.includes("server_error") || lowered.includes("\"error\"")) {
    return true;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return false;
    const record = parsed as Record<string, unknown>;
    return Boolean(
      record.error ||
        record.errors ||
        record.code === "server_error" ||
        record.type === "server_error"
    );
  } catch {
    return false;
  }
};

const shouldForceTableTool = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return [
    "table",
    "tables",
    "list tables",
    "table names",
    "grist table",
    "schema",
    "available tables",
  ].some((needle) => normalized.includes(needle));
};

const AttachmentItem = ({
  attachment,
  onRemove,
}: {
  attachment: AttachmentData;
  onRemove: (id: string) => void;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(attachment.id);
  }, [onRemove, attachment.id]);

  return (
    <Attachment data={attachment} onRemove={handleRemove}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  );
};

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  const handleRemove = useCallback(
    (id: string) => {
      attachments.remove(id);
    },
    [attachments]
  );

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
        />
      ))}
    </Attachments>
  );
};

const SuggestionItem = ({
  suggestion,
  onClick,
}: {
  suggestion: string;
  onClick: (suggestion: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onClick(suggestion);
  }, [onClick, suggestion]);

  return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

const ModelItem = ({
  m,
  isSelected,
  onSelect,
}: {
  m: GatewayModelOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(m.id);
  }, [onSelect, m.id]);

  return (
    <ModelSelectorItem onSelect={handleSelect} value={m.id}>
      <ModelSelectorLogo provider={m.chefSlug} />
      <ModelSelectorName>{m.name}</ModelSelectorName>
      <ModelSelectorLogoGroup>
        {m.providers.map((provider) => (
          <ModelSelectorLogo key={provider} provider={provider} />
        ))}
      </ModelSelectorLogoGroup>
      {isSelected ? (
        <CheckIcon className="ml-auto size-4" />
      ) : (
        <div className="ml-auto size-4" />
      )}
    </ModelSelectorItem>
  );
};

export default function AiChatbot() {
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [text, setText] = useState<string>("");
  const [apiKeyInput, setApiKeyInput] = useState<string>(
    () => getInitialGatewayState().apiKeyInput
  );
  const [apiUrlInput, setApiUrlInput] = useState<string>(
    () => getInitialGatewayState().apiUrlInput
  );
  const [gatewayModelById, setGatewayModelById] = useState<Record<string, string>>(
    () => getInitialGatewayState().gatewayModelById
  );
  const [modelRows, setModelRows] = useState<ModelConfigRow[]>(
    () => getInitialGatewayState().modelRows
  );
  const [configEditorMode, setConfigEditorMode] = useState<"form" | "json">("form");
  const [jsonConfigInput, setJsonConfigInput] = useState<string>(
    () => getInitialGatewayState().jsonConfigInput
  );
  const [gatewayProvider, setGatewayProvider] = useState<"openai" | "genial">(
    () => getInitialGatewayState().gatewayProvider
  );
  const [gatewayLibraries, setGatewayLibraries] = useState<string[]>(
    () => getInitialGatewayState().gatewayLibraries
  );
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const widget = useGristOptional();

  const availableModels = useMemo<GatewayModelOption[]>(() => {
    const effectiveModelById =
      configEditorMode === "form"
        ? modelRowsToModelById(modelRows)
        : gatewayModelById;
    const keys = Object.keys(effectiveModelById);
    if (keys.length === 0) return models;
    return keys.map((id) => ({
      chef: "OpenAI",
      chefSlug: "openai",
      id,
      name: id,
      providers: ["openai"],
    }));
  }, [configEditorMode, gatewayModelById, modelRows]);

  const activeModel = useMemo(() => {
    if (availableModels.length === 0) return model;
    return availableModels.some((m) => m.id === model)
      ? model
      : availableModels[0].id;
  }, [availableModels, model]);

  const selectedModelData = useMemo(
    () => availableModels.find((m) => m.id === activeModel),
    [availableModels, activeModel]
  );

  const getGatewayModel = useCallback(
    (modelId: string) => gatewayModelById[modelId] ?? modelId,
    [gatewayModelById]
  );

  const fetchGatewayResponse = useCallback(
    async (
      conversation: ChatMessage[],
      apiKey: string
    ): Promise<{ text: string; toolEvents: ChatMessage[] }> => {
      const gatewayMessages: GatewayMessage[] = [
        {
          content: SYSTEM_PROMPT,
          role: "system",
        },
        ...conversation.map((message) => ({
          content: message.content,
          role: message.role,
        })),
      ];
      const tools = [
        {
          function: {
            description: "Return all table names available in the current Grist document.",
            name: "get_grist_table_names",
            parameters: {
              additionalProperties: false,
              properties: {},
              type: "object",
            },
          },
          type: "function",
        },
      ] as const;

      const runGatewayRequest = async (
        messagesToSend: GatewayMessage[],
        toolChoice?: "required" | "auto",
        withTools = true
      ) => {
        const isGenialProvider =
          gatewayProvider === "genial" ||
          apiUrlInput.includes("genial") ||
          apiUrlInput.includes("artemis");
        const requestBody: Record<string, unknown> = {
          max_tokens: 300,
          messages: messagesToSend,
          model: getGatewayModel(activeModel),
          stream: false,
          temperature: 0.2,
          top_p: 0.75,
        };
        if (withTools) {
          requestBody.tools = tools;
          if (toolChoice) {
            requestBody.tool_choice = toolChoice;
          }
        }
        if (isGenialProvider) {
          // Keep Genial payload as close as possible to OpenAI Chat Completions.
          if (gatewayLibraries.length > 0) {
            requestBody.libraries = gatewayLibraries;
          }
        }
        console.debug("AI Gateway request payload", {
          isGenialProvider,
          requestBody,
          requestUrl: apiUrlInput || DEFAULT_STORED_GATEWAY_CONFIG.apiUrl || "",
        });
        const response = await fetch(
          apiUrlInput || DEFAULT_STORED_GATEWAY_CONFIG.apiUrl || "",
          {
          body: JSON.stringify(requestBody),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          }
        );

        const rawBody = await response.text();
        const payload = (
          rawBody
            ? (((() => {
                try {
                  return JSON.parse(rawBody) as GatewayChatResponse;
                } catch {
                  return {};
                }
              })()) as GatewayChatResponse)
            : {}
        ) as GatewayChatResponse;
        if (!rawBody) {
          payload.text = "";
        } else if (!payload.choices && !payload.message && !payload.text && !payload.content) {
          payload.text = rawBody;
        }
        if (!response.ok) {
          console.error("AI Gateway request failed", {
            model: getGatewayModel(activeModel),
            requestUrl: apiUrlInput || DEFAULT_STORED_GATEWAY_CONFIG.apiUrl || "",
            payload,
            status: response.status,
            statusText: response.statusText,
          });
          throw new Error(
            payload.error?.message ?? `AI Gateway request failed (${response.status})`
          );
        }
        console.debug("AI Gateway response summary", {
          message: payload.choices?.[0]?.message ?? payload.message ?? null,
          payloadKeys: Object.keys(payload ?? {}),
          requestUrl: apiUrlInput || DEFAULT_STORED_GATEWAY_CONFIG.apiUrl || "",
          status: response.status,
        });

        return payload;
      };

      const parseContent = (
        content: string | Array<{ text?: string; type?: string }> | undefined
      ) =>
        coerceText(content);

      const extractAssistantMessage = (payload: GatewayChatResponse) => {
        const choice = payload.choices?.[0];
        const message = choice?.message ?? payload.message;

        const rawToolCalls =
          message?.tool_calls ??
          choice?.tool_calls ??
          (message?.function_call?.name
            ? [
                {
                  id: `fc-${Date.now()}`,
                  function: {
                    arguments: message.function_call.arguments ?? "{}",
                    name: message.function_call.name,
                  },
                  type: "function" as const,
                },
              ]
            : choice?.function_call?.name
              ? [
                  {
                    id: `fc-${Date.now()}`,
                    function: {
                      arguments: choice.function_call.arguments ?? "{}",
                      name: choice.function_call.name,
                    },
                    type: "function" as const,
                  },
                ]
              : []);

        const toolCalls = rawToolCalls.filter(
          (call): call is GatewayToolCall =>
            Boolean(call?.id && call?.type === "function" && call?.function?.name)
        );

        const text = parseContent(message?.content ?? choice?.content);
        const fallbackText =
          text ||
          (typeof choice?.text === "string" ? choice.text : "") ||
          (typeof payload.text === "string" ? payload.text : "") ||
          parseContent(payload.content) ||
          coerceText(payload);
        return { text: fallbackText, toolCalls };
      };

      const executeToolCall = async (toolCall: GatewayToolCall) => {
        if (toolCall.function.name !== "get_grist_table_names") {
          return {
            ok: false,
            tool: toolCall.function.name,
            error: `Unknown tool: ${toolCall.function.name}`,
          };
        }

        let parsedArgs: GetGristTableNamesToolArgs = {};
        if (toolCall.function.arguments && toolCall.function.arguments.trim()) {
          try {
            parsedArgs = JSON.parse(toolCall.function.arguments) as GetGristTableNamesToolArgs;
          } catch {
            return {
              ok: false,
              tool: toolCall.function.name,
              error: "Invalid JSON in tool arguments.",
            };
          }
        }

        if (!widget) {
          return {
            ok: false,
            tool: toolCall.function.name,
            error: "Grist SDK is not available in this context.",
          };
        }

        try {
          const tableNames = await widget.listTables();
          return {
            args: parsedArgs,
            ok: true,
            tool: toolCall.function.name,
            tableNames,
          };
        } catch (error) {
          return {
            ok: false,
            tool: toolCall.function.name,
            error: error instanceof Error ? error.message : "Unknown Grist error",
          };
        }
      };

      const toolAwareMessages = [...gatewayMessages];
      const toolEvents: ChatMessage[] = [];
      const latestUserText =
        conversation
          .slice()
          .reverse()
          .find((message) => message.role === "user")
          ?.content ?? "";
      const forceToolOnFirstPass = shouldForceTableTool(latestUserText);

      for (let i = 0; i < 3; i += 1) {
        const payload = await runGatewayRequest(
          toolAwareMessages,
          i === 0 && forceToolOnFirstPass ? "required" : "auto"
        );
        const { text, toolCalls } = extractAssistantMessage(payload);
        if (toolCalls.length === 0 && !text) {
          if (i === 0) {
            const retryPayload = await runGatewayRequest(toolAwareMessages, "auto");
            const retry = extractAssistantMessage(retryPayload);
            if (retry.toolCalls.length > 0 || retry.text) {
              if (retry.toolCalls.length === 0) {
                return { text: retry.text, toolEvents };
              }
              toolAwareMessages.push({
                content: retry.text,
                role: "assistant",
                tool_calls: retry.toolCalls,
              });
              for (const toolCall of retry.toolCalls) {
                const result = await executeToolCall(toolCall);
                toolEvents.push({
                  content: "",
                  id: `tool-${toolCall.id}-${Date.now()}`,
                  includeInContext: false,
                  role: "assistant",
                  toolEvent: {
                    errorText:
                      typeof result === "object" &&
                      result &&
                      "ok" in result &&
                      !result.ok &&
                      "error" in result
                        ? String(result.error)
                        : undefined,
                    input: toolCall.function.arguments
                      ? (() => {
                          try {
                            return JSON.parse(toolCall.function.arguments);
                          } catch {
                            return toolCall.function.arguments;
                          }
                        })()
                      : {},
                    output: result,
                    state:
                      typeof result === "object" && result && "ok" in result && !result.ok
                        ? "output-error"
                        : "output-available",
                    toolName: toolCall.function.name,
                  },
                });
                toolAwareMessages.push({
                  content: JSON.stringify(result),
                  role: "tool",
                  tool_call_id: toolCall.id,
                });
              }
              continue;
            }
          }
          console.error("AI Gateway unexpected payload shape", {
            payload,
            requestUrl: apiUrlInput || DEFAULT_STORED_GATEWAY_CONFIG.apiUrl || "",
          });
          const plainPayload = await runGatewayRequest(toolAwareMessages, undefined, false);
          const plain = extractAssistantMessage(plainPayload);
          if (plain.text) {
            return { text: plain.text, toolEvents };
          }
          return {
            text: "The AI Gateway returned an unsupported response format. Please check gateway compatibility settings.",
            toolEvents,
          };
        }

        if (toolCalls.length === 0) {
          return { text, toolEvents };
        }

        toolAwareMessages.push({
          content: text,
          role: "assistant",
          tool_calls: toolCalls,
        });

        for (const toolCall of toolCalls) {
          const result = await executeToolCall(toolCall);
          toolEvents.push({
            content: "",
            id: `tool-${toolCall.id}-${Date.now()}`,
            includeInContext: false,
            role: "assistant",
            toolEvent: {
              errorText:
                typeof result === "object" &&
                result &&
                "ok" in result &&
                !result.ok &&
                "error" in result
                  ? String(result.error)
                  : undefined,
              input: toolCall.function.arguments
                ? (() => {
                    try {
                      return JSON.parse(toolCall.function.arguments);
                    } catch {
                      return toolCall.function.arguments;
                    }
                  })()
                : {},
              output: result,
              state:
                typeof result === "object" && result && "ok" in result && !result.ok
                  ? "output-error"
                  : "output-available",
              toolName: toolCall.function.name,
            },
          });
          toolAwareMessages.push({
            content: JSON.stringify(result),
            role: "tool",
            tool_call_id: toolCall.id,
          });
        }
      }

      throw new Error("Tool-calling exceeded maximum number of iterations.");
    },
    [apiUrlInput, gatewayLibraries, gatewayProvider, getGatewayModel, activeModel, widget]
  );

  const submitText = useCallback(
    async (value: string) => {
      const apiKey = apiKeyInput.trim();
      if (!apiKey) {
        toast.error("Missing API key", {
          description: "Open API Key and save your AI Gateway key first.",
        });
        return;
      }

      const userMessage: ChatMessage = {
        content: value,
        id: `user-${Date.now()}`,
        includeInContext: true,
        role: "user",
      };
      const nextConversation = [
        ...messages.filter((message) => message.includeInContext !== false),
        userMessage,
      ];
      setMessages(nextConversation);
      setStatus("streaming");

      try {
        const gatewayResult = await fetchGatewayResponse(nextConversation, apiKey);
        if (gatewayResult.toolEvents.length > 0) {
          setMessages((prev) => [...prev, ...gatewayResult.toolEvents]);
        }
        const assistantMessage: ChatMessage = {
          content: gatewayResult.text,
          id: `assistant-${Date.now()}`,
          includeInContext: !isGatewayErrorLikeMessage(gatewayResult.text),
          role: "assistant",
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStatus("ready");
      } catch (error) {
        console.error("AI Gateway submitText error", {
          error,
          messagesCount: messages.length,
          selectedModel: activeModel,
        });
        const description =
          error instanceof Error ? error.message : "Unknown gateway error";
        toast.error("AI Gateway request failed", { description });
        setStatus("error");
      }
    },
    [apiKeyInput, activeModel, fetchGatewayResponse, messages]
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      if (message.files?.length) {
        toast.success("Files attached", {
          description: `${message.files.length} file(s) attached to message`,
        });
      }

      setStatus("submitted");
      await submitText(message.text || "Sent with attachments");
      setText("");
    },
    [submitText]
  );

  const handleSuggestionClick = useCallback(
    async (suggestion: string) => {
      setStatus("submitted");
      await submitText(suggestion);
    },
    [submitText]
  );

  const handleTranscriptionChange = useCallback((transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  }, []);

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    []
  );

  const handleModelSelect = useCallback((modelId: string) => {
    setModel(modelId);
    setModelSelectorOpen(false);
  }, []);

  const handleApiKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setApiKeyInput(event.target.value);
    },
    []
  );

  const handleApiUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setApiUrlInput(event.target.value);
    },
    []
  );

  const handleJsonConfigInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setJsonConfigInput(event.target.value);
    },
    []
  );

  const handleModelRowFieldChange = useCallback(
    (rowId: string, field: "name" | "modelId", value: string) => {
      setModelRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                [field]: value,
                saved: row.saved ? false : row.saved,
              }
            : row
        )
      );
    },
    []
  );

  const handleSaveModelRow = useCallback((rowId: string) => {
    let shouldAppendEmptyRow = false;
    setModelRows((prev) => {
      const row = prev.find((item) => item.id === rowId);
      if (!row) return prev;
      const trimmedName = row.name.trim();
      const trimmedModelId = row.modelId.trim();
      if (!trimmedName || !trimmedModelId) {
        toast.error("Model row is incomplete", {
          description: "Both Name and Id are required.",
        });
        return prev;
      }
      const duplicate = prev.some(
        (item) => item.id !== rowId && item.saved && item.name.trim() === trimmedName
      );
      if (duplicate) {
        toast.error("Duplicate model name", {
          description: `A saved row already uses "${trimmedName}".`,
        });
        return prev;
      }
      const next = prev.map((item) =>
        item.id === rowId ? { ...item, modelId: trimmedModelId, name: trimmedName, saved: true } : item
      );
      shouldAppendEmptyRow = !next.some((item) => !item.saved);
      return shouldAppendEmptyRow ? [...next, createModelConfigRow()] : next;
    });
  }, []);

  const handleRemoveModelRow = useCallback((rowId: string) => {
    setModelRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      return next.length === 0 ? [createModelConfigRow()] : next;
    });
  }, []);

  const saveApiKey = useCallback(() => {
    if (configEditorMode === "json") {
      try {
        const parsed = JSON.parse(jsonConfigInput) as StoredGatewayConfig;
        const normalized = normalizeStoredGatewayConfig(parsed);
        if (!normalized.apiKey.trim() && !normalized.apiUrl.trim()) {
          window.localStorage.removeItem(AI_GATEWAY_URL_STORAGE_KEY);
          setApiKeyInput(DEFAULT_STORED_GATEWAY_CONFIG.apiKey ?? "");
          setApiUrlInput(DEFAULT_STORED_GATEWAY_CONFIG.apiUrl ?? "");
          setGatewayProvider(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG).provider);
          setGatewayLibraries(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG).libraries);
          setGatewayModelById(DEFAULT_STORED_GATEWAY_CONFIG.modelById ?? {});
          setModelRows(modelByIdToRows(DEFAULT_STORED_GATEWAY_CONFIG.modelById ?? {}));
          setJsonConfigInput(
            JSON.stringify(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG), null, 2)
          );
          toast.success("API settings removed");
          setApiKeyDialogOpen(false);
          return;
        }
        window.localStorage.setItem(AI_GATEWAY_URL_STORAGE_KEY, JSON.stringify(normalized));
        setApiKeyInput(normalized.apiKey);
        setApiUrlInput(normalized.apiUrl);
        setGatewayProvider(normalized.provider);
        setGatewayLibraries(normalized.libraries);
        setGatewayModelById(normalized.modelById);
        setModelRows(modelByIdToRows(normalized.modelById));
        setJsonConfigInput(JSON.stringify(normalized, null, 2));
        toast.success("API settings saved locally");
        setApiKeyDialogOpen(false);
        return;
      } catch (error) {
        toast.error("Invalid JSON config", {
          description: error instanceof Error ? error.message : "Please use valid JSON.",
        });
        return;
      }
    }

    const nextModelById: Record<string, string> = {};
    for (const row of modelRows) {
      if (!row.saved) continue;
      const trimmedName = row.name.trim();
      const trimmedModelId = row.modelId.trim();
      if (!(trimmedName && trimmedModelId)) continue;
      nextModelById[trimmedName] = trimmedModelId;
    }

    const nextApiKeyValue = apiKeyInput.trim();
    const nextApiUrlValue = apiUrlInput.trim();
    if (!nextApiKeyValue && !nextApiUrlValue) {
      window.localStorage.removeItem(AI_GATEWAY_URL_STORAGE_KEY);
      setApiKeyInput(DEFAULT_STORED_GATEWAY_CONFIG.apiKey ?? "");
      setApiUrlInput(DEFAULT_STORED_GATEWAY_CONFIG.apiUrl ?? "");
      setGatewayProvider(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG).provider);
      setGatewayLibraries(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG).libraries);
      setGatewayModelById(DEFAULT_STORED_GATEWAY_CONFIG.modelById ?? {});
      setModelRows(modelByIdToRows(DEFAULT_STORED_GATEWAY_CONFIG.modelById ?? {}));
      setJsonConfigInput(
        JSON.stringify(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG), null, 2)
      );
      toast.success("API settings removed");
      setApiKeyDialogOpen(false);
      return;
    }

    const nextStoredConfig = normalizeStoredGatewayConfig({
      apiKey: nextApiKeyValue,
      apiUrl: nextApiUrlValue || DEFAULT_STORED_GATEWAY_CONFIG.apiUrl,
      provider: gatewayProvider,
      libraries: gatewayLibraries,
      modelById: Object.keys(nextModelById).length
        ? nextModelById
        : DEFAULT_STORED_GATEWAY_CONFIG.modelById,
    });
    window.localStorage.setItem(
      AI_GATEWAY_URL_STORAGE_KEY,
      JSON.stringify(nextStoredConfig)
    );

    setApiKeyInput(nextApiKeyValue);
    setApiUrlInput(nextStoredConfig.apiUrl ?? DEFAULT_STORED_GATEWAY_CONFIG.apiUrl ?? "");
    setGatewayProvider(nextStoredConfig.provider);
    setGatewayLibraries(nextStoredConfig.libraries);
    setGatewayModelById(nextStoredConfig.modelById);
    setModelRows(modelByIdToRows(nextStoredConfig.modelById));
    setJsonConfigInput(JSON.stringify(nextStoredConfig, null, 2));

    toast.success("API settings saved locally");
    setApiKeyDialogOpen(false);
  }, [
    apiKeyInput,
    apiUrlInput,
    configEditorMode,
    gatewayLibraries,
    gatewayProvider,
    jsonConfigInput,
    modelRows,
  ]);

  const clearApiKey = useCallback(() => {
    setApiKeyInput(DEFAULT_STORED_GATEWAY_CONFIG.apiKey ?? "");
    setApiUrlInput(DEFAULT_STORED_GATEWAY_CONFIG.apiUrl ?? "");
    setGatewayProvider(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG).provider);
    setGatewayLibraries(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG).libraries);
    setGatewayModelById(DEFAULT_STORED_GATEWAY_CONFIG.modelById ?? {});
    setModelRows(modelByIdToRows(DEFAULT_STORED_GATEWAY_CONFIG.modelById ?? {}));
    setJsonConfigInput(
      JSON.stringify(normalizeStoredGatewayConfig(DEFAULT_STORED_GATEWAY_CONFIG), null, 2)
    );
    window.localStorage.removeItem(AI_GATEWAY_URL_STORAGE_KEY);
    toast.success("API settings removed");
  }, []);

  const isSubmitDisabled = useMemo(
    () => !(text.trim() || status) || status === "streaming",
    [text, status]
  );

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <div className="min-h-0 flex flex-1 pb-40">
        <Conversation className="min-h-0 overflow-y-auto">
          <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role === "user" ? "user" : "assistant"} key={message.id}>
                <MessageContent>
                  {message.toolEvent ? (
                    <Tool>
                      <ToolHeader
                        state={message.toolEvent.state}
                        title={message.toolEvent.toolName}
                        type="dynamic-tool"
                        toolName={message.toolEvent.toolName}
                      />
                      <ToolContent>
                        <ToolInput input={message.toolEvent.input} />
                        <ToolOutput
                          errorText={message.toolEvent.errorText}
                          output={message.toolEvent.output}
                        />
                      </ToolContent>
                    </Tool>
                  ) : (
                    <MessageResponse>{message.content}</MessageResponse>
                  )}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-4 pt-3 backdrop-blur">
        <div className="mx-auto w-full">
            {messages.length === 0 && suggestions.length > 0 && (
                <Suggestions className="mb-1">
                  {suggestions.map((suggestion) => (
                    <SuggestionItem
                      key={suggestion}
                      onClick={handleSuggestionClick}
                      suggestion={suggestion}
                    />
                  ))}
                </Suggestions>
              )}
          <PromptInput globalDrop multiple onSubmit={(message) => void handleSubmit(message)}>
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea onChange={handleTextChange} value={text} />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <SpeechInput
                  className="shrink-0"
                  onTranscriptionChange={handleTranscriptionChange}
                  size="icon-sm"
                  variant="ghost"
                />
                <PromptInputButton
                  onClick={() => setApiKeyDialogOpen(true)}
                  variant={apiKeyInput ? "default" : "ghost"}
                >
                  <KeyRoundIcon size={16} />
                  <span>API Key</span>
                </PromptInputButton>
                <ModelSelector
                  onOpenChange={setModelSelectorOpen}
                  open={modelSelectorOpen}
                >
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton>
                      {selectedModelData?.chefSlug && (
                        <ModelSelectorLogo
                          provider={selectedModelData.chefSlug}
                        />
                      )}
                      {selectedModelData?.name && (
                        <ModelSelectorName>
                          {selectedModelData.name}
                        </ModelSelectorName>
                      )}
                    </PromptInputButton>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {chefs.map((chef) => (
                        <ModelSelectorGroup heading={chef} key={chef}>
                          {availableModels
                            .filter((m) => m.chef === chef)
                            .map((m) => (
                              <ModelItem
                                isSelected={activeModel === m.id}
                                key={m.id}
                                m={m}
                                onSelect={handleModelSelect}
                              />
                            ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
      <Dialog onOpenChange={setApiKeyDialogOpen} open={apiKeyDialogOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API configuration</DialogTitle>
            <DialogDescription>
              Saved in your browser localStorage for local testing only.
            </DialogDescription>
          </DialogHeader>
          <Tabs
            onValueChange={(value) => setConfigEditorMode(value as "form" | "json")}
            value={configEditorMode}
          >
            <TabsList>
              <TabsTrigger value="form">Form</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="form">
              <div className="space-y-3">
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>
                      <KeyRoundIcon size={14} />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    autoComplete="off"
                    onChange={handleApiKeyChange}
                    placeholder="Paste your API key"
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      onClick={() => setShowApiKey((prev) => !prev)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      {showApiKey ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>URL</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    autoComplete="off"
                    onChange={handleApiUrlChange}
                    placeholder="https://api.openai.com/v1/chat/completions"
                    type="text"
                    value={apiUrlInput}
                  />
                </InputGroup>
              </div>
              <div className="mt-3 space-y-2 rounded-md border p-3">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground">
                  <span>Name</span>
                  <span>Id</span>
                  <span>Action</span>
                </div>
                {modelRows.map((row) => (
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={row.id}>
                    <InputGroupInput
                      autoComplete="off"
                      onChange={(event) =>
                        handleModelRowFieldChange(row.id, "name", event.target.value)
                      }
                      placeholder="Model name"
                      type="text"
                      value={row.name}
                    />
                    <InputGroupInput
                      autoComplete="off"
                      onChange={(event) =>
                        handleModelRowFieldChange(row.id, "modelId", event.target.value)
                      }
                      placeholder="Gateway model id"
                      type="text"
                      value={row.modelId}
                    />
                    {row.saved ? (
                      <Button
                        onClick={() => handleRemoveModelRow(row.id)}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <Trash2Icon size={14} />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSaveModelRow(row.id)}
                        size="icon"
                        type="button"
                        variant="default"
                      >
                        <CheckIcon size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter className="mt-3">
                <Button onClick={clearApiKey} type="button" variant="outline">
                  <Trash2Icon size={14} />
                  Clear
                </Button>
                <Button onClick={saveApiKey} type="button">
                  <CheckIcon size={14} />
                  Save
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="json">
              <Textarea
                className="min-h-72 resize-y whitespace-pre-wrap break-all overflow-x-hidden font-mono text-xs [field-sizing:fixed]"
                onChange={handleJsonConfigInputChange}
                placeholder='{"apiKey":"","apiUrl":"https://api.openai.com/v1/chat/completions","modelById":{"gpt-4o-mini":"gpt-4o-mini"}}'
                rows={16}
                value={jsonConfigInput}
              />
              <DialogFooter className="mt-3">
                <Button onClick={clearApiKey} type="button" variant="outline">
                  <Trash2Icon size={14} />
                  Clear
                </Button>
                <Button onClick={saveApiKey} type="button">
                  <CheckIcon size={14} />
                  Save
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
