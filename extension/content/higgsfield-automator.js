// Content script injected into higgsfield.ai/*
// Handles DOM automation for image generation.
// NOTE: SELECTORS, resolveSelector, resolveSelectorAll, preflightCheck are loaded
// from higgsfield-selectors.js which runs first (declared in manifest.json).

const HB_MESSAGE_TYPES = {
  EXECUTE_GENERATION: 'EXECUTE_GENERATION',
  GENERATION_RESULT: 'GENERATION_RESULT',
  CHECK_SESSION: 'CHECK_SESSION',
  SESSION_STATUS: 'SESSION_STATUS',
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === HB_MESSAGE_TYPES.EXECUTE_GENERATION) {
    executeGeneration(message.job)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, errorType: 'unknown', error: err.message }));
    return true; // async response
  }

  if (message.type === HB_MESSAGE_TYPES.CHECK_SESSION) {
    sendResponse({ loggedIn: checkSession() });
    return false;
  }
});

function checkSession() {
  if (resolveSelector(SELECTORS.USER_AVATAR)) return true;
  const signIn = resolveSelector(SELECTORS.SIGN_IN_BUTTON);
  return !signIn;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForElement(selectorDef, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = resolveSelector(selectorDef);
    if (el) return el;
    await sleep(500);
  }
  return null;
}

async function executeGeneration(job) {
  const startTime = Date.now();

  // 1. Preflight check
  const missing = preflightCheck();
  if (missing.length > 0) {
    return {
      success: false,
      errorType: 'selector_not_found',
      error: `Missing selectors: ${missing.map((m) => m.key).join(', ')}. Higgsfield UI may have changed.`,
    };
  }

  // 2. Check session
  if (!checkSession()) {
    return { success: false, errorType: 'session_expired', error: 'Not logged in to Higgsfield' };
  }

  // 3. Select character
  const characterCards = resolveSelectorAll(SELECTORS.CHARACTER_CARD);
  let characterFound = false;

  for (const card of characterCards) {
    const nameEl = card.querySelector('.name') || card;
    const cardName = (nameEl.textContent || '').trim().toLowerCase();
    if (cardName === job.characterName?.toLowerCase()) {
      card.click();
      characterFound = true;
      await sleep(1500);
      break;
    }
  }

  if (!characterFound) {
    return {
      success: false,
      errorType: 'character_not_found',
      error: `Character "${job.characterName}" not found in Higgsfield UI`,
    };
  }

  // 4. Inject prompt
  const textarea = await waitForElement(SELECTORS.PROMPT_TEXTAREA, 5000);
  if (!textarea) {
    return { success: false, errorType: 'selector_not_found', error: 'Prompt textarea not found' };
  }

  textarea.focus();
  textarea.value = '';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(100);
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, job.prompt);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);

  // 5. Click Generate
  const generateBtn = resolveSelector(SELECTORS.GENERATE_BUTTON);
  if (!generateBtn) {
    return { success: false, errorType: 'selector_not_found', error: 'Generate button not found' };
  }

  generateBtn.click();
  await sleep(2000);

  // 6. Wait for results
  const pollStart = Date.now();
  while (Date.now() - pollStart < 120000) {
    const errorEl = resolveSelector(SELECTORS.GENERATION_ERROR);
    if (errorEl) {
      return { success: false, errorType: 'unknown', error: errorEl.textContent || 'Generation error' };
    }

    const images = resolveSelectorAll(SELECTORS.GENERATED_IMAGE);
    if (images.length > 0) {
      const imageUrls = Array.from(images)
        .map((img) => img.src || img.getAttribute('data-src'))
        .filter(Boolean);
      if (imageUrls.length > 0) {
        return { success: true, imageUrls, generationTimeMs: Date.now() - startTime };
      }
    }

    await sleep(2000);
  }

  return { success: false, errorType: 'generation_timeout', error: 'Generation timed out after 120 seconds' };
}
