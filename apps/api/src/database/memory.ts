import type { Conversation, Customer, Message, Order, Product, Ticket, KnowledgeChunk } from '../types.js';
import { randomUUID } from 'node:crypto';

const now = () => new Date().toISOString();

// In-memory store: used for tests and as fallback when Postgres is unavailable.
// Production/dev uses Postgres; this keeps `npm test` runnable with ₹0 deps.
export const memory = {
  customers: new Map<string, Customer>(),
  products: new Map<string, Product>(),
  orders: new Map<string, Order>(),
  tickets: new Map<string, Ticket>(),
  conversations: new Map<string, Conversation>(),
  messages: new Map<string, Message>(),
  knowledge: new Map<string, KnowledgeChunk>(),
};

export function seedMemory() {
  memory.customers.clear();
  memory.products.clear();
  memory.orders.clear();
  memory.tickets.clear();
  memory.conversations.clear();
  memory.messages.clear();
  memory.knowledge.clear();

  const t = now();
  const customers: Customer[] = [
    { id: 'cust_demo_001', name: 'Aarav Sharma', email: 'aarav@example.in', created_at: t },
    { id: 'cust_demo_002', name: 'Diya Patel', email: 'diya@example.in', created_at: t },
    { id: 'cust_demo_003', name: 'Kabir Singh', email: 'kabir@example.in', created_at: t },
  ];
  customers.forEach((c) => memory.customers.set(c.id, c));

  const products: Product[] = [
    { id: 'prod_001', sku: 'SF-HEADSET-01', name: 'SupportFlow Wireless Headset', description: 'Noise-cancelling headset with 30h battery.', price_cents: 799900, availability_status: 'in_stock', created_at: t },
    { id: 'prod_002', sku: 'SF-KEYBOARD-02', name: 'SupportFlow Ergo Keyboard', description: 'Ergonomic mechanical keyboard.', price_cents: 549900, availability_status: 'in_stock', created_at: t },
    { id: 'prod_003', sku: 'SF-MOUSE-03', name: 'SupportFlow Silent Mouse', description: 'Silent wireless mouse, currently out of stock.', price_cents: 199900, availability_status: 'out_of_stock', created_at: t },
  ];
  products.forEach((p) => memory.products.set(p.id, p));

  const orders: Order[] = [
    { id: 'ord_1', customer_id: 'cust_demo_001', order_number: 'ORD-1001', status: 'processing', placed_at: t, estimated_delivery_at: new Date(Date.now() + 4 * 864e5).toISOString(), tracking_number: null, total_cents: 799900, created_at: t, updated_at: t },
    { id: 'ord_2', customer_id: 'cust_demo_001', order_number: 'ORD-1002', status: 'shipped', placed_at: t, estimated_delivery_at: new Date(Date.now() + 2 * 864e5).toISOString(), tracking_number: 'TRK-SHIP-8821', total_cents: 549900, created_at: t, updated_at: t },
    { id: 'ord_3', customer_id: 'cust_demo_001', order_number: 'ORD-1003', status: 'delivered', placed_at: t, estimated_delivery_at: null, tracking_number: 'TRK-DEL-1100', total_cents: 199900, created_at: t, updated_at: t },
    { id: 'ord_4', customer_id: 'cust_demo_002', order_number: 'ORD-2001', status: 'processing', placed_at: t, estimated_delivery_at: new Date(Date.now() + 5 * 864e5).toISOString(), tracking_number: null, total_cents: 799900, created_at: t, updated_at: t },
    { id: 'ord_5', customer_id: 'cust_demo_001', order_number: 'ORD-1004', status: 'cancelled', placed_at: t, estimated_delivery_at: null, tracking_number: null, total_cents: 549900, created_at: t, updated_at: t },
  ];
  orders.forEach((o) => memory.orders.set(o.id, o));

  const tickets: Ticket[] = [
    { id: 'tkt_1', customer_id: 'cust_demo_001', order_id: 'ord_2', subject: 'Late delivery query', status: 'open', priority: 'high', description: 'Order shipped but not yet delivered.', created_at: t, updated_at: t },
    { id: 'tkt_2', customer_id: 'cust_demo_001', order_id: null, subject: 'Refund request', status: 'closed', priority: 'medium', description: 'Refund for cancelled order.', created_at: t, updated_at: t },
    { id: 'tkt_3', customer_id: 'cust_demo_002', order_id: 'ord_4', subject: 'Damaged box', status: 'in_progress', priority: 'urgent', description: 'Box arrived damaged.', created_at: t, updated_at: t },
  ];
  tickets.forEach((x) => memory.tickets.set(x.id, x));

  const chunks: KnowledgeChunk[] = [
    { id: 'kb-shipping-1', title: 'Shipping Policy', section: 'delivery-times', content: 'Standard delivery takes 3-5 business days in India. Express delivery takes 1-2 business days where available. Tracking numbers are issued once an order ships; processing orders do not have tracking yet.' },
    { id: 'kb-shipping-2', title: 'Shipping Policy', section: 'tracking', content: 'Track your order from the Orders page using the tracking number. If shipped for more than 7 days with no update, contact support to open a ticket.' },
    { id: 'kb-return-1', title: 'Return and Refund Policy', section: 'eligibility', content: 'Unused products in original packaging can be returned within 14 days of delivery. Cancelled orders are refunded to the original payment method within 5-7 business days.' },
    { id: 'kb-return-2', title: 'Return and Refund Policy', section: 'non-returnable', content: 'Delivered orders past 14 days, personalised items, and discontinued clearance items are not eligible for return. Processing orders can be cancelled before shipment instead of returned.' },
    { id: 'kb-warranty-1', title: 'Warranty Policy', section: 'coverage', content: 'SupportFlow hardware carries a 12-month limited warranty covering manufacturing defects. Battery consumables carry 6 months. Physical damage and liquid damage are excluded.' },
    { id: 'kb-troubleshoot-1', title: 'Product Troubleshooting', section: 'headset', content: 'Headset not pairing: hold power 5s to enter pairing, charge 30 min, forget device on phone and re-pair. If LED blinks red thrice, reset by holding power+volume for 10s.' },
    { id: 'kb-account-1', title: 'Account Management', section: 'profile', content: 'Update name and email from Account Settings. Order history is retained for 24 months. To delete your account, contact support; open tickets must be closed first.' },
    { id: 'kb-order-status-1', title: 'Order Status Explanations', section: 'states', content: 'processing = payment confirmed, preparing shipment, no tracking yet. shipped = handed to carrier with tracking. delivered = carrier confirmed delivery. cancelled = voided before shipment. refunded = amount returned post-cancellation.' },
  ];
  chunks.forEach((c) => memory.knowledge.set(c.id, c));
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}
