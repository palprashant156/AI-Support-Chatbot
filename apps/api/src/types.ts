export type Role = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'completed' | 'interrupted' | 'failed';
export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Customer {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price_cents: number;
  availability_status: 'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued';
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  status: OrderStatus;
  placed_at: string;
  estimated_delivery_at: string | null;
  tracking_number: string | null;
  total_cents: number;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  customer_id: string;
  order_id: string | null;
  subject: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  title: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Citation {
  kind: 'knowledge' | 'business';
  title: string;
  chunk_id?: string;
  section?: string;
  ref_id?: string;
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

export interface KnowledgeChunk {
  id: string;
  title: string;
  section: string;
  content: string;
}
