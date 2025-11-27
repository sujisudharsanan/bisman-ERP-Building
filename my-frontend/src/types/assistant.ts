/**
 * BISMAN ERP - Intelligent Assistant Chat Types (Frontend)
 * Matches backend types for seamless integration
 */

export type Tone = 'friendly' | 'alert' | 'error' | 'info';

export interface QuickAction {
  id: string;
  label: string;
  payload?: Record<string, any>;
}

export interface ChatReply {
  text: string;
  tone: Tone;
  quickActions?: QuickAction[];
  contextInfo?: string;
}

export interface ChatMessage {
  id: string;
  from: 'user' | 'assistant';
  text: string;
  reply?: ChatReply; // Full structured reply for assistant messages
  timestamp: Date;
}

export interface AssistantMemory {
  exists: boolean;
  memory?: {
    lastModule?: string;
    lastBranchId?: number;
    preferences?: Record<string, any>;
    conversationCount?: number;
  };
}

export interface AssistantCapability {
  category: string;
  description: string;
  examples: string[];
}

export interface AssistantCapabilities {
  capabilities: AssistantCapability[];
  features: string[];
}
