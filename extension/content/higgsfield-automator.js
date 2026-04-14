// Content script injected into higgsfield.ai/*
// Correct flow: /character → click card → /image/soul → inject prompt → Generate → capture

const HB_MSG = {
  EXECUTE_GENERATION: 'EXECUTE_GENERATION',
  CHECK_SESSION: 'CHECK_SESSION',
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === HB_MSG.EXECUTE_GENERATION) {
    executeGeneration(message.job)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, errorType: 'unknown', error: String(err?.message || err) }));
    return true; // keep channel open for async response
  }
  if (message.type === HB_MSG.CHECK_SESSION) {
    sendResponse({ loggedIn: isLoggedIn() });
    return false;
  }
});

// ─── Utilities ─────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function isLoggedIn() {
  // If page contains a standalone Sign In / Log In button, user is logged out
  const btns = Array.from(document.querySelectorAll('a, button'));
  const signIn = btns.find((el) => {
    const t = el.textContent.trim();
    return t === 'Sign In' || t === 'Log in' || t === 'Log In';
  });
  return !signIn;
}

/** Wait for a condition fn to return truthy, polling every 500ms */
async function waitFor(condFn, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = condFn();
    if (result) return result;
    await sleep(500);
  }
  return null;
}

/** Find the main prompt textarea on /image/soul */
function findPromptTextarea() {
  // Higgsfield uses a textarea with a long placeholder
  const all = Array.from(document.querySelectorAll('textarea'));
  return (
    all.find((t) => t.placeholder?.toLowerCase().includes('describe')) ||
    all.find((t) => t.placeholder?.toLowerCase().includes('imagine')) ||
    all.find((t) => t.placeholder?.toLowerCase().includes('prompt')) ||
    all[0] || null
  );
}

/** Find the Generate button (yellow, says "Generate") */
function findGenerateButton() {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent.trim().toLowerCase().startsWith('generate')
  ) || null;
}

/** Inject text into a React-controlled textarea */
function injectText(el, text) {
  el.focus();
  // Use native value setter to bypass React's synthetic events
  const proto = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
  if (proto?.set) {
    proto.set.call(el, text);
  } else {
    el.value = text;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Snapshot all visible content/result image srcs (exclude UI icons) */
function getContentImageUrls() {
  return new Set(
    Array.from(document.querySelectorAll('img'))
      .map((img) => img.src || img.getAttribute('data-src') || '')
      .filter((src) =>
        src.startsWith('http') &&
        !src.includes('favicon') &&
        !src.includes('logo') &&
        !src.includes('avatar') &&
        !src.includes('icon') &&
        src.length > 40
      )
  );
}

// ─── Step 1: Navigate to /character and select character ───────────────────

async function goToCharacterPage() {
  if (!window.location.pathname.startsWith('/character') ||
      window.location.pathname.length > '/character'.length + 2) {
    window.location.href = 'https://higgsfield.ai/character';
    // Wait for navigation to complete
    await waitFor(() => window.location.pathname === '/character', 8000);
    await sleep(2000); // wait for cards to render
  }
}

async function clickCharacterByName(name) {
  if (!name) return false;
  const target = name.trim().toLowerCase();

  // Wait for character cards to load
  const cards = await waitFor(() => {
    const els = Array.from(document.querySelectorAll('*')).filter((el) => {
      if (el.children.length > 0) return false;
      const t = el.textContent.trim().toLowerCase();
      return t === target;
    });
    return els.length > 0 ? els : null;
  }, 8000);

  if (!cards || cards.length === 0) {
    console.warn(`[HiggsBot] Character "${name}" not found — using current character`);
    return false;
  }

  // Click the card or its nearest clickable ancestor
  let el = cards[0];
  // Walk up to find the clickable card wrapper (usually <a> or <div> with role="button")
  let clickTarget = el;
  let parent = el.parentElement;
  for (let i = 0; i < 5; i++) {
    if (!parent) break;
    if (parent.tagName === 'A' || parent.tagName === 'BUTTON' ||
        parent.getAttribute('role') === 'button' || parent.onclick) {
      clickTarget = parent;
      break;
    }
    parent = parent.parentElement;
  }

  clickTarget.click();
  console.log(`[HiggsBot] Clicked character: ${name}`);
  return true;
}

// ─── Step 2: Wait until we're on /image/soul ───────────────────────────────

async function waitForSoulPage(timeoutMs = 15000) {
  // After clicking a character, Higgsfield navigates to /image/soul
  const arrived = await waitFor(
    () => window.location.pathname.includes('/image/soul'),
    timeoutMs
  );
  if (!arrived) {
    // Maybe clicking character navigated to a different URL — try navigating manually
    window.location.href = 'https://higgsfield.ai/image/soul';
    await waitFor(() => window.location.pathname.includes('/image/soul'), 8000);
  }
  // Wait for textarea to appear (React hydration)
  await waitFor(findPromptTextarea, 8000);
  await sleep(500); // settle
}

// ─── Step 3: Generate ──────────────────────────────────────────────────────

async function generate(prompt) {
  const textarea = await waitFor(findPromptTextarea, 8000);
  if (!textarea) {
    return { success: false, errorType: 'selector_not_found', error: 'Prompt textarea not found on /image/soul' };
  }

  const generateBtn = await waitFor(findGenerateButton, 5000);
  if (!generateBtn) {
    return { success: false, errorType: 'selector_not_found', error: 'Generate button not found' };
  }

  // Snapshot existing images BEFORE generating
  const before = getContentImageUrls();

  // Inject prompt
  injectText(textarea, prompt);
  await sleep(400);

  // Verify injection worked (React may be slow)
  if (!textarea.value?.trim()) {
    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, prompt);
    await sleep(300);
  }

  // Click Generate
  generateBtn.click();
  console.log('[HiggsBot] Clicked Generate, waiting for images...');
  await sleep(3000);

  // Poll for new images (up to 2 min)
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    await sleep(2500);
    const current = getContentImageUrls();
    const newImgs = [...current].filter((src) => !before.has(src));
    if (newImgs.length >= 1) {
      await sleep(2500); // let remaining images load
      const final = [...getContentImageUrls()].filter((src) => !before.has(src));
      console.log(`[HiggsBot] Got ${final.length} new images`);
      return { success: true, imageUrls: final };
    }
  }

  return { success: false, errorType: 'generation_timeout', error: 'No new images after 2 minutes' };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function executeGeneration(job) {
  const startTime = Date.now();

  if (!isLoggedIn()) {
    return { success: false, errorType: 'session_expired', error: 'Not logged into Higgsfield' };
  }

  // Step 1 — character selection (on /character page)
  await goToCharacterPage();
  await clickCharacterByName(job.characterName);

  // Step 2 — wait for soul page
  await waitForSoulPage(15000);

  // Step 3 — generate
  const result = await generate(job.prompt);

  return { ...result, generationTimeMs: Date.now() - startTime };
}
