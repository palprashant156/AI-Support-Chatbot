// Deterministic intent/action router (MVP). Explicit regex rules — testable, no agent framework.
// Later: optional model-assisted tool selection, but backend still validates every call.
export interface RouteDecision {
  intent: 'order_status' | 'policy' | 'combined' | 'product' | 'ticket' | 'chitchat';
  needsKnowledge: boolean;
  needsOrder: boolean;
  needsProduct: boolean;
  needsTicket: boolean;
  orderNumber: string | null;
  sku: string | null;
}

const ORDER_RE = /\bORD-\d{3,}\b/i;
const SKU_RE = /\bSF-[A-Z]+-\d+\b/i;

export function routeIntent(question: string): RouteDecision {
  const q = question.toLowerCase();
  const orderMatch = question.match(ORDER_RE);
  const skuMatch = question.match(SKU_RE);
  const orderNumber = orderMatch?.[0]?.toUpperCase() ?? null;
  const sku = skuMatch?.[0]?.toUpperCase() ?? null;

  const mentionsOrder = /order|tracking|deliver|ship|where.*(package|parcel)|ord-\d/i.test(question);
  const mentionsPolicy = /refund|return|warranty|ship.*polic|policy|troubleshoot|reset|pair|account|delete/i.test(question);
  const mentionsProduct = /product|headset|keyboard|mouse|stock|availab|sku/i.test(question);
  const mentionsTicket = /ticket|complaint|support.*(request|case)|tkt_/i.test(question);

  if ((mentionsOrder || orderNumber) && mentionsPolicy) {
    return { intent: 'combined', needsKnowledge: true, needsOrder: true, needsProduct: false, needsTicket: false, orderNumber, sku };
  }
  if (mentionsOrder || orderNumber || /where.*my/i.test(question)) {
    return { intent: 'order_status', needsKnowledge: false, needsOrder: true, needsProduct: false, needsTicket: false, orderNumber, sku };
  }
  if (mentionsTicket) {
    return { intent: 'ticket', needsKnowledge: false, needsOrder: false, needsProduct: false, needsTicket: true, orderNumber, sku };
  }
  if (mentionsProduct || sku) {
    const needsK = /warranty|troubleshoot|pair|reset/i.test(question);
    return { intent: 'product', needsKnowledge: needsK, needsOrder: false, needsProduct: true, needsTicket: false, orderNumber, sku };
  }
  if (mentionsPolicy) {
    return { intent: 'policy', needsKnowledge: true, needsOrder: false, needsProduct: false, needsTicket: false, orderNumber, sku };
  }
  // Default: try knowledge; orchestrator falls back to "not found" rather than hallucinating
  const isGreeting = q.length < 10 || /^(hi|hello|hey)\b/.test(q);
  return { intent: isGreeting ? 'chitchat' : 'policy', needsKnowledge: !isGreeting, needsOrder: false, needsProduct: false, needsTicket: false, orderNumber, sku };
}
