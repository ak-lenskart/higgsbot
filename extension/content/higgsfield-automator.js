// Content script injected into higgsfield.ai/*
// Uses text-based element finding rather than fragile CSS selectors.
// SELECTORS object from higgsfield-selectors.js is available globally.

const HB_MSG = {
  EXECUTE_GENERATION: 'EXECUTE_GENERATION',
  CHECK_SESSION: 'CHECK_SESSION',
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === HB_MSG.EXECUTE_GENERATION) {
    executeGeneration(message.job)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, errorType: 'unknown', error: err.message }));
    return true;
  }
  if (message.type === HB_MSG.CHECK_SESSION) {
    sendResponse({ loggedIn: isLoggedIn() });
    return false;
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isLoggedIn() {
  // Logged-in users have an avatar or profile element; logged-out see sign-in
  const bodyText = document.body?.innerText || '';
  if (bodyText.includes('Sign In') || bodyText.includes('Log In')) {
    // Check it's not just a menu item — look for a prominent sign-in button
    const signInBtns = Array.from(document.querySelectorAll('a, button')).filter(
      (el) => el.textContent.trim() === 'Sign In' || el.textContent.trim() === 'Log in'
    );
    if (signInBtns.length > 0) return false;
  }
  return true;
}

/** Find the prompt textarea — Higgsfield Soul uses a large textarea or contenteditable */
function findPromptInput() {
  // Try standard textarea first
  const textareas = Array.from(document.querySelectorAll('textarea'));
  if (textareas.length > 0) {
    // Prefer the one with a "describe" or "prompt" placeholder
    const match = textareas.find(
      (t) => t.placeholder && (
        t.placeholder.toLowerCase().includes('describe') ||
        t.placeholder.toLowerCase().includes('prompt') ||
        t.placeholder.toLowerCase().includes('imagine')
      )
    );
    return match || textareas[textareas.length - 1]; // last textarea is usually the prompt
  }
  // Fallback: contenteditable div
  const editable = document.querySelector('[contenteditable="true"]');
  return editable || null;
}

/** Find the Generate button by text content */
function findGenerateButton() {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.find((b) => {
    const text = b.textContent.trim().toLowerCase();
    return text.startsWith('generate') || text === 'generate';
  }) || null;
}

/** Inject text into React-controlled textarea or contenteditable */
function injectText(el, text) {
  el.focus();
  // React controlled input: use nativeInputValueSetter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;
  if (nativeInputValueSetter && el.tagName === 'TEXTAREA') {
    nativeInputValueSetter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (el.isContentEditable) {
    el.textContent = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // execCommand fallback
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  }
}

/** Wait for element to appear, polling every 500ms */
async function waitFor(findFn, timeoutMs = 8000, label = 'element') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = findFn();
    if (el) return el;
    await sleep(500);
  }
  return null;
}

/** Try to select a character by name. Returns true if found/clicked, false if not found. */
async function selectCharacter(characterName) {
  if (!characterName) return false;

  // Character cards: look for clickable elements whose text matches the name
  const name = characterName.trim().toLowerCase();

  // Try various card/button patterns
  const candidates = Array.from(document.querySelectorAll(
    '[class*="character"], [class*="soul"], [class*="avatar"], [data-name]'
  ));

  for (const el of candidates) {
    if (el.textContent.trim().toLowerCase().includes(name)) {
      el.click();
      await sleep(1500);
      return true;
    }
  }

  // Broader: any clickable thing with the character name
  const allClickable = Array.from(document.querySelectorAll('button, [role="button"], div[onclick], li'));
  for (const el of allClickable) {
    if (el.textContent.trim().toLowerCase() === name) {
      el.click();
      await sleep(1500);
      return true;
    }
  }

  return false;
}

// ─── Snapshot current images before generation ─────────────────────────────

function snapshotImageUrls() {
  return new Set(
    Array.from(document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((src) => src && src.startsWith('http') && !src.includes('avatar') && !src.includes('logo'))
  );
}

/** Poll until new images appear that weren't in the snapshot */
async function waitForNewImages(snapshotBefore, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(2000);
    const current = Array.from(document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((src) => src && src.startsWith('http') && !src.includes('avatar') && !src.includes('logo'));

    const newOnes = current.filter((src) => !snapshotBefore.has(src));
    if (newOnes.length >= 1) {
      // Wait a bit more for all 4 images to load
      await sleep(3000);
      const finalImgs = Array.from(document.querySelectorAll('img'))
        .map((img) => img.src)
        .filter((src) => src && src.startsWith('http') && !src.includes('avatar') && !src.includes('logo') && !snapshotBefore.has(src));
      if (finalImgs.length > 0) return finalImgs;
    }
  }
  return null;
}

// ─── Main generation flow ──────────────────────────────────────────────────

async function executeGeneration(job) {
  const startTime = Date.now();

  // 1. Check session
  if (!isLoggedIn()) {
    return { success: false, errorType: 'session_expired', error: 'Not logged in to Higgsfield' };
  }

  // 2. Ensure we're on the Soul generation page
  if (!window.location.href.includes('higgsfield.ai')) {
    return { success: false, errorType: 'unknown', error: 'Not on Higgsfield page' };
  }

  // If we're on a non-generation page, navigate to soul
  if (!window.location.pathname.includes('/image/soul') && !window.location.pathname.includes('/character')) {
    window.location.href = 'https://higgsfield.ai/image/soul';
    await sleep(4000);
  }

  // 3. Try character selection (best-effort — don't fail if not found)
  if (job.characterName) {
    const selected = await selectCharacter(job.characterName);
    if (!selected) {
      console.warn(`[HiggsBot] Character "${job.characterName}" not found in UI — continuing with current character`);
    }
  }

  // If we ended up on /character after selection, navigate to /image/soul
  if (window.location.pathname.includes('/character')) {
    window.location.href = 'https://higgsfield.ai/image/soul';
    await sleep(4000);
  }

  // 4. Find prompt textarea
  const textarea = await waitFor(findPromptInput, 10000, 'prompt input');
  if (!textarea) {
    return {
      success: false,
      errorType: 'selector_not_found',
      error: 'Could not find prompt textarea on page. Make sure you are on higgsfield.ai/image/soul',
    };
  }

  // 5. Snapshot current images before generation
  const snapshotBefore = snapshotImageUrls();

  // 6. Inject prompt
  injectText(textarea, job.prompt);
  await sleep(600);

  // Verify text was injected
  const currentVal = textarea.value || textarea.textContent || '';
  if (!currentVal.trim()) {
    // Try execCommand as fallback
    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, job.prompt);
    await sleep(400);
  }

  // 7. Find and click Generate
  const generateBtn = await waitFor(findGenerateButton, 5000, 'Generate button');
  if (!generateBtn) {
    return { success: false, errorType: 'selector_not_found', error: 'Could not find Generate button' };
  }

  generateBtn.click();
  await sleep(2000);

  // 8. Wait for new images
  const newImages = await waitForNewImages(snapshotBefore, 120000);
  if (!newImages || newImages.length === 0) {
    return { success: false, errorType: 'generation_timeout', error: 'No new images appeared after 120 seconds' };
  }

  return {
    success: true,
    imageUrls: newImages,
    generationTimeMs: Date.now() - startTime,
  };
}
