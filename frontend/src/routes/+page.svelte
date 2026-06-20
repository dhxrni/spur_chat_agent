<script lang="ts">
  import ChatWidget from '$lib/ChatWidget.svelte';
</script>

<main class="page">
  <header class="intro">
    <h1 class="intro-title">Spur Chat Demo</h1>
    <p class="intro-sub">
      AI-powered customer support — ask about shipping, returns, orders, or payments.
    </p>
  </header>
  <ChatWidget />
</main>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    min-height: 100vh;
    background: #f1f5f9;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 2rem 1rem;
  }

  .intro {
    text-align: center;
    max-width: 480px;
  }

  .intro-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 0.375rem;
  }

  .intro-sub {
    font-size: 0.9375rem;
    color: #64748b;
    line-height: 1.5;
  }
</style>
