// HiggsBot — Higgsfield Soul automation
// Strategy: stay on /image/soul, inject prompt, click Generate, capture images.
// Character switching: try clicking bottom thumbnails by name (best-effort).
// If character not found, continue with whichever character is already active.

const HB_MSG = {
  EXECUTE_GENERATION: 'EXECUTE_GENERATION',
  CHECK_SESSION: 'CHECK_SESSION',
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === HB_MSG.EXECUTE_GENERATION) {
    executeGeneration(message.job)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, errorType: 'unknown', error: String(err?.message || err) }));
    return true;
  }
  if (message.type === HB_MSG.CHECK_SESSION) {
    sendResponse({ loggedIn: isLoggedIn() });
    return false;
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function isLoggedIn() {
  const btns = Array.from(document.querySelectorAll('a, button'));
  return !btns.some((el) => {
    const t = el.textContent.trim();
    return t === 'Sign In' || t === 'Log in' || t === 'Log In';
  });
}

async function waitFor(fn, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = fn();
    if (r) return r;
    await sleep(300);
  }
  return null;
}

// ─── Element finders (based on real Higgsfield Soul UI) ─────────────────────

function findPromptTextarea() {
  // Higgsfield Soul: large textarea at bottom with placeholder about describing/imagining
  const all = Array.from(document.querySelectorAll('textarea'));
  return (
    all.find((t) => /describe|imagine|prompt/i.test(t.placeholder || '')) ||
    all[0] ||
    null
  );
}

function findGenerateButton() {
  // Yellow "Generate → 0.5" button
  return Array.from(document.querySelectorAll('button')).find((b) =>
    /^generate/i.test(b.textContent.trim())
  ) || null;
}

// Try clicking a character thumbnail on the /image/soul bottom bar
// The thumbnails show character names like "STEVE", "KAT", "0.5 SELFIE"
function tryClickCharacterThumbnail(characterName) {
  if (!characterName) return false;
  const target = characterName.trim().toUpperCase();

  // Look for any element whose visible text matches the character name
  const all = Array.from(document.querySelectorAll('*'));
  const match = all.find((el) => {
    if (el.children.length > 0) return false; // leaf nodes only
    return el.textContent.trim().toUpperCase() === target;
  });

  if (!match) return false;

  // Click the closest button/div ancestor
  let node = match;
  for (let i = 0; i < 6; i++) {
    if (!node) break;
    if (node.tagName === 'BUTTON' || node.tagName === 'A' ||
        node.getAttribute('role') === 'button' ||
        node.style?.cursor === 'pointer') {
      node.click();
      return true;
    }
    node = node.parentElement;
  }
  // fallback: click the match itself
  match.parentElement?.click();
  return true;
}

// ─── React-safe text injection ─────────────────────────────────────────────

function injectText(el, text) {
  el.focus();
  // Use the native HTMLTextAreaElement value setter so React picks up the change
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, 'value'
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(el, text);
  } else {
    el.value = text;
  }
  el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── Image snapshot diff ───────────────────────────────────────────────────

function snapshotImages() {
  return new Set(
    Array.from(document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((s) => s && s.startsWith('http') &&
        !/favicon|logo|icon|avatar|profile/i.test(s))
  );
}

async function waitForNewImages(before, timeoutMs = 130000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(2000);
    const current = Array.from(document.querySelectorAll('img'))
      .map((i) => i.src)
      .filter((s) => s && s.startsWith('http') &&
        !/favicon|logo|icon|avatar|profile/i.test(s));
    const newOnes = current.filter((s) => !before.has(s));
    if (newOnes.length >= 1) {
      // Wait a moment for all 4 images to finish loading
      await sleep(3000);
      const final = Array.from(document.querySelectorAll('img'))
        .map((i) => i.src)
        .filter((s) => s && s.startsWith('http') &&
          !/favicon|logo|icon|avatar|profile/i.test(s) && !before.has(s));
      if (final.length > 0) return final;
    }
  }
  return null;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function executeGeneration(job) {
  const t0 = Date.now();

  // 1. Must be logged in
  if (!isLoggedIn()) {
    return { success: false, errorType: 'session_expired', error: 'Not logged into Higgsfield' };
  }

  // 2. Must be on /image/soul (queue-manager ensures this before sending message)
  if (!window.location.pathname.includes('/image/soul')) {
    return {
      success: false,
      errorType: 'selector_not_found',
      error: `Wrong page: ${window.location.pathname}. Needs to be higgsfield.ai/image/soul`,
    };
  }

  // 3. Wait for textarea to be ready
  const textarea = await waitFor(findPromptTextarea, 10000);
  if (!textarea) {
    return { success: false, errorType: 'selector_not_found', error: 'Prompt textarea not found — is Higgsfield Soul loaded?' };
  }

  // 4. Try switching character via bottom thumbnail (best-effort, no failure)
  if (job.characterName) {
    const switched = tryClickCharacterThumbnail(job.characterName);
    if (switched) {
      await sleep(1500); // let UI update
    } else {
      console.log(`[HiggsBot] Character "${job.characterName}" thumbnail not found — continuing with active character`);
    }
  }

  // 5. Snapshot images before generation
  const before = snapshotImages();

  // 6. Inject prompt
  injectText(textarea, job.prompt);
  await sleep(500);

  // Verify it landed (React can be slow)
  if (!textarea.value?.trim()) {
    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, job.prompt);
    await sleep(400);
  }

  // 7. Click Generate
  const btn = await waitFor(findGenerateButton, 5000);
  if (!btn) {
    return { success: false, errorType: 'selector_not_found', error: 'Generate button not found' };
  }
  btn.click();
  console.log('[HiggsBot] Generate clicked, waiting for images…');

  // 8. Wait for new images
  const images = await waitForNewImages(before, 130000);
  if (!images || images.length === 0) {
    return { success: false, errorType: 'generation_timeout', error: 'No new images appeared after 2 min' };
  }

  return { success: true, imageUrls: images, generationTimeMs: Date.now() - t0 };
}
