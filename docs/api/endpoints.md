# API

Base: `http://localhost:3001/api` — demo identity via `x-customer-id` header (defaults to `cust_demo_001`).

## Health
`GET /health` -> `{ok:true, provider, time}`

## Conversations
- `POST /conversations {title?}` 201 -> Conversation
- `GET /conversations` -> Conversation[] (owner only, 50 latest)
- `GET /conversations/:id` -> Conversation (403 if other customer)
- `GET /conversations/:id/messages?limit=50&before=ISO` chronological
- `POST /conversations/:id/messages {content, requestId?}` non-streaming turn -> `{assistantMessageId, text, citations, promptChars, provider, timings}`
- `POST /conversations/:id/stream` SSE, same body. Events:
  ```
  event: message_start — data: {"messageId","conversationId","provider"}
  event: text_delta — data: {"delta":"..."}
  event: citations — data: {"sources":[{"kind","title","chunk_id?","section?","ref_id?"}]}
  event: message_complete — data: {"messageId","provider"}
  event: error — data: {"code","message","partialId"}
  ```

## Business (mock, ownership-enforced)
- `GET /customers/:id` (self only, email redacted in logs, no email in response)
- `GET /customers/:id/orders`, `GET /customers/:id/tickets`
- `GET /orders/:orderId`, `GET /products/:productId`, `GET /tickets/:ticketId`

## Knowledge
`POST /knowledge/search {query, topK?}` -> `[{id,title,section,content,score}]`

## Errors
`{error:{code,message,requestId}}` — 400 Zod, 403 ownership, 404 missing, 500 generic. No stack/SQL leak.
