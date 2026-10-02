export type ChatRole = 'user' | 'model' | 'system';

export interface ToolCallPayload {
  name: string;
  args: Record<string, any>;
}

export interface ToolResponsePayload {
  name: string;
  response: Record<string, any>;
}

export interface ChatMessageItem {
  id: string;
  role: ChatRole;
  content: string;
  toolCalls?: ToolCallPayload[];
  toolResponses?: ToolResponsePayload[];
  createdAt: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageItem[];
}
