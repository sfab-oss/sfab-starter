# Migration Progress Tracker

## Phase 1: Core Chat Components ✅ COMPLETE

### 1.1 Core Chat Components ✅
- ✅ `chat-orchestrator.tsx` - Wraps chat providers
- ✅ `chat-panel.tsx` - Main chat panel with header and content
- ✅ `chat-state-provider.tsx` - Chat state management with navigation
- ✅ `parts/chat-content.tsx` - Already existed
- ✅ `parts/chat-error-message.tsx` - Already existed
- ✅ `parts/chat-input.tsx` - Input component with TanStack Router integration
- ✅ `parts/chat-messages.tsx` - Message list display
- ✅ `parts/message-actions.tsx` - Copy/regenerate actions

### 1.2 Chat History Components ✅
- ✅ `history/chat-history.tsx` - History popover with search
- ⚠️ `history/chat-history-with-navigation.tsx` - Not created (can use chat-state-provider instead)

### 1.3 Chat Tools ✅
- ✅ `tools/default-tool.tsx` - Default tool display with approval UI
- ✅ `tools/load-skill-tool.tsx` - Skill loading tool display (without streamdown dependency)

### Changes Made:
1. Removed "use client" directives (TanStack Start handles automatically)
2. Replaced Next.js Router with TanStack Router:
   - `useRouter()` → `useRouter()` from `@tanstack/react-router`
   - `useNavigate()` → `useNavigate()` from `@tanstack/react-router`
   - `usePathname()` / `useParams()` → `useRouterState()` / `useParams()`
3. Replaced `apiClient` with existing `client` from `@/lib/client`
4. Updated navigation to use TanStack Router's `navigate()` with proper params
5. Removed streamdown dependency (replaced with simple prose styling for now)

---

## Next: Phase 2 - Chat Routes & Pages

### 2.1 Chat List Page
- ❌ `/chat` route

### 2.2 Chat Detail Page
- ❌ `/chat/$id` route

---

## Files Created (Phase 1):
```
apps/web-tanstack/src/components/chat/
├── chat-orchestrator.tsx ✅
├── chat-panel.tsx ✅
├── chat-state-provider.tsx ✅
├── parts/
│   ├── chat-input.tsx ✅
│   ├── chat-messages.tsx ✅
│   └── message-actions.tsx ✅
├── history/
│   └── chat-history.tsx ✅
└── tools/
    ├── default-tool.tsx ✅
    └── load-skill-tool.tsx ✅
```

## Remaining Tasks:

### Phase 2: Chat Routes
- [ ] Create `/chat` index route
- [ ] Create `/chat/$id` dynamic route
- [ ] Test chat navigation

### Phase 3: API Routes
- [ ] Migrate transcribe endpoint
- [ ] Migrate contact endpoint
- [ ] Check if search endpoint needs migration

### Phase 4: Additional Pages
- [ ] Warehouse setup page

### Phase 5: Hooks
- [ ] Contact hook
- [ ] Status hook

### Dependencies to Consider:
- [ ] streamdown (optional, currently using prose styling)
- [ ] Check if lucide-react errors need fixing (separate issue)
- [ ] Check if nanoid errors need fixing (separate issue)
