<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { sendMessage, fetchHistory, ApiError } from './api';
  import type { ChatMessage } from './types';

  const SESSION_KEY = 'spur_chat_session_id';

  let messages = $state<ChatMessage[]>([]);
  let draft = $state('');
  let sessionId = $state<string | undefined>(undefined);
  let isSending = $state(false);
  let isLoadingHistory = $state(true);

  let listEl = $state<HTMLElement | null>(null);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  function scrollToBottom() {
    tick().then(() => {
      if (listEl) listEl.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
    });
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  onMount(async () => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const history = await fetchHistory(stored);
        if (history) {
          sessionId = stored;
          messages = history.messages.map((m) => ({ ...m }));
          scrollToBottom();
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (err) {
        console.error('[ChatWidget] Failed to load history:', err);
      }
    }
    isLoadingHistory = false;
  });

  async function handleSend() {
    const text = draft.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    const placeholderId = crypto.randomUUID();
    const placeholder: ChatMessage = {
      id: placeholderId,
      sender: 'ai',
      text: '',
      createdAt: new Date().toISOString(),
      pending: true,
    };

    messages = [...messages, userMsg, placeholder];
    draft = '';
    isSending = true;
    scrollToBottom();

    // Reset textarea height
    if (textareaEl) textareaEl.style.height = 'auto';

    try {
      const res = await sendMessage(text, sessionId);
      sessionId = res.sessionId;
      localStorage.setItem(SESSION_KEY, res.sessionId);
      messages = messages.map((m) =>
        m.id === placeholderId
          ? { ...m, text: res.reply, pending: false }
          : m,
      );
    } catch (err) {
      const errMsg =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      messages = messages.map((m) =>
        m.id === placeholderId
          ? { ...m, text: errMsg, pending: false, failed: true }
          : m,
      );
    } finally {
      isSending = false;
      scrollToBottom();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: Event) {
    const el = e.currentTarget as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }
</script>

<div class="widget">
  <!-- Header -->
  <header class="header">
    <div class="avatar" aria-hidden="true">ES</div>
    <div class="header-text">
      <span class="header-title">Example Store Support</span>
      <span class="header-status">
        <span class="status-dot" aria-hidden="true"></span>
        Online
      </span>
    </div>
  </header>

  <!-- Message list -->
  <main class="messages" bind:this={listEl} aria-live="polite" aria-label="Chat messages">
    {#if isLoadingHistory}
      <div class="empty-state">
        <p class="empty-hint">Loading conversation…</p>
      </div>
    {:else if messages.length === 0}
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">💬</div>
        <p class="empty-heading">Hi! How can I help?</p>
        <p class="empty-hint">
          Ask me about shipping, returns, payments, or support hours.
        </p>
      </div>
    {:else}
      {#each messages as msg (msg.id)}
        <div class="bubble-row {msg.sender === 'user' ? 'row-user' : 'row-ai'}">
          <div
            class="bubble"
            class:bubble-user={msg.sender === 'user'}
            class:bubble-ai={msg.sender === 'ai' && !msg.failed}
            class:bubble-failed={msg.failed}
          >
            {#if msg.pending}
              <span class="typing" aria-label="Typing…">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </span>
            {:else}
              <p class="bubble-text">{msg.text}</p>
            {/if}
          </div>
          <time
            class="timestamp"
            class:ts-user={msg.sender === 'user'}
            datetime={msg.createdAt}
          >{formatTime(msg.createdAt)}</time>
        </div>
      {/each}
    {/if}
  </main>

  <!-- Input bar -->
  <footer class="input-bar">
    <textarea
      bind:this={textareaEl}
      bind:value={draft}
      onkeydown={handleKeydown}
      oninput={handleInput}
      class="textarea"
      rows="1"
      placeholder="Type a message…"
      disabled={isSending}
      aria-label="Message input"
    ></textarea>
    <button
      class="send-btn"
      onclick={handleSend}
      disabled={isSending || draft.trim().length === 0}
      aria-label="Send message"
    >
      {#if isSending}
        <span class="spinner" aria-hidden="true"></span>
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    </button>
  </footer>
</div>

<style>
  :root {
    --c-accent: #2563eb;
    --c-accent-dark: #1d4ed8;
    --c-accent-fg: #ffffff;
    --c-ai-bg: #f1f5f9;
    --c-ai-border: #e2e8f0;
    --c-failed-bg: #fef2f2;
    --c-failed-border: #fecaca;
    --c-failed-text: #b91c1c;
    --c-header-bg: #1e293b;
    --c-header-fg: #f8fafc;
    --c-page-bg: #f8fafc;
    --c-input-bg: #ffffff;
    --c-input-border: #cbd5e1;
    --c-text: #0f172a;
    --c-muted: #64748b;
    --c-dot: #22c55e;
    --radius: 1rem;
    --radius-sm: 0.5rem;
  }

  .widget {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 480px;
    height: 640px;
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 10px 40px -10px rgb(0 0 0 / 0.15);
    background: var(--c-page-bg);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.9375rem;
    color: var(--c-text);
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: var(--c-header-bg);
    color: var(--c-header-fg);
    flex-shrink: 0;
  }

  .avatar {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    background: var(--c-accent);
    color: var(--c-accent-fg);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .header-title {
    font-weight: 600;
    font-size: 0.9375rem;
    line-height: 1.2;
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .status-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--c-dot);
  }

  /* ── Messages ── */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    scroll-behavior: smooth;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
    gap: 0.5rem;
    color: var(--c-muted);
  }

  .empty-icon {
    font-size: 2rem;
    margin-bottom: 0.25rem;
  }

  .empty-heading {
    font-weight: 600;
    font-size: 1rem;
    color: var(--c-text);
    margin: 0;
  }

  .empty-hint {
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0;
  }

  .bubble-row {
    display: flex;
    flex-direction: column;
    max-width: 82%;
    gap: 0.2rem;
  }

  .row-user {
    align-self: flex-end;
    align-items: flex-end;
  }

  .row-ai {
    align-self: flex-start;
    align-items: flex-start;
  }

  .bubble {
    padding: 0.6rem 0.875rem;
    border-radius: var(--radius);
    line-height: 1.55;
    word-break: break-word;
  }

  .bubble-user {
    background: var(--c-accent);
    color: var(--c-accent-fg);
    border-bottom-right-radius: var(--radius-sm);
  }

  .bubble-ai {
    background: var(--c-ai-bg);
    border: 1px solid var(--c-ai-border);
    color: var(--c-text);
    border-bottom-left-radius: var(--radius-sm);
  }

  .bubble-failed {
    background: var(--c-failed-bg);
    border: 1px solid var(--c-failed-border);
    color: var(--c-failed-text);
    border-bottom-left-radius: var(--radius-sm);
  }

  .bubble-text {
    margin: 0;
    white-space: pre-wrap;
  }

  .timestamp {
    font-family: ui-monospace, monospace;
    font-size: 0.6875rem;
    color: var(--c-muted);
    padding: 0 0.25rem;
  }

  /* ── Typing indicator ── */
  .typing {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.1rem 0.25rem;
  }

  .dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: var(--c-muted);
  }

  @media (prefers-reduced-motion: no-preference) {
    .dot {
      animation: pulse 1.2s ease-in-out infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
  }

  @keyframes pulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
    40%            { opacity: 1;   transform: scale(1); }
  }

  /* ── Input bar ── */
  .input-bar {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--c-input-bg);
    border-top: 1px solid var(--c-ai-border);
    flex-shrink: 0;
  }

  .textarea {
    flex: 1;
    resize: none;
    border: 1px solid var(--c-input-border);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.75rem;
    font-family: inherit;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--c-text);
    background: var(--c-input-bg);
    max-height: 160px;
    overflow-y: auto;
    transition: border-color 0.15s;
  }

  .textarea:focus {
    outline: 2px solid var(--c-accent);
    outline-offset: 1px;
    border-color: var(--c-accent);
  }

  .textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--c-accent);
    color: var(--c-accent-fg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--c-accent-dark);
  }

  .send-btn:focus-visible {
    outline: 2px solid var(--c-accent);
    outline-offset: 2px;
  }

  .send-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* Spinner for sending state */
  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgb(255 255 255 / 0.35);
    border-top-color: #fff;
    border-radius: 50%;
  }

  @media (prefers-reduced-motion: no-preference) {
    .spinner {
      animation: spin 0.75s linear infinite;
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
