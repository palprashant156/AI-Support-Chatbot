export type Role = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'completed' | 'interrupted' | 'failed';

export interface Citation {
  kind: 'knowledge' | 'business';
  title: string;
  chunk_id?: string;
  section?: string;
  ref_id?: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  request_id: string | null;
  citations: Citation[];
  created_at: string;
  completed_at: string | null;
}

export interface Customer {
  id: string;
  name: string;
  created_at: string;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  tracking_number: string | null;
  estimated_delivery_at: string | null;
  total_cents: number;
}

export interface Ticket {
  id: string;
  customer_id: string;
  order_id: string | null;
  subject: string;
  status: string;
  priority: string;
  description: string;
}

export interface KnowledgeHit {
  id: string;
  title: string;
  section: string;
  content: string;
  score: number;
}

export interface ChatTurnResult {
  assistantMessageId: string;
  text: string;
  citations: Citation[];
  promptChars: number;
  provider: string;
}
