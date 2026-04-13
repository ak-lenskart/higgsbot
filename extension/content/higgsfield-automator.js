// Content script injected into higgsfield.ai/*
// Handles DOM automation for image generation.

import { SELECTORS, resolveSelector, resolveSelectorAll, preflightCheck } from './higgsfield-selectors.js';
import { MESSAGE_TYPES } from '../lib/constants.js';

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.EXECUTE_GENERATION) {
    executeGeneration(message.job)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, errorType: 'unknown', error: err.message }));
    return true; // async response
  }

  if (message.type === MESSAGE_TYPES.CHECK_SESSION) {
    const loggedIn = checkSession();
    sendResponse({ loggedIn });
    return false;
  }
});

function checkSession() {
  const avatar = resolveSelector(SELECTORS.USER_AVATAR);
  if (avatar) return true;
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

  // 3. Select character (find card by name)
  const characterCards = resolveSelectorAll(SELECTORS.CHARACTER_CARD);
  let characterFound = false;

  for (const card of characterCards) {
    const nameEl = card.querySelector('.name') || card;
    const cardName = (nameEl.textContent || '').trim().toLowerCase();
    if (cardName === job.characterName?.toLowerCase()) {
      card.click();
      characterFound = true;
      await sleep(1500); // Wait for character to load
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
  const textarea = resolveSelector(SELECTORS.PROMPT_TEXTAREA);
  if (!textarea) {
    return { success: false, errorType: 'selector_not_found', error: 'Prompt textarea not found' };
  }

  // Clear and set value
  textarea.focus();
  textarea.value = '';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(100);

  // Use execCommand for React-controlled inputs
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

  // 6. Wait for results (poll for images)
  const timeoutMs = 120000;
  const pollStart = Date.now();

  while (Date.now() - pollStart < timeoutMs) {
    // Check for error
    const errorEl = resolveSelector(SELECTORS.GENERATION_ERROR);
    if (errorEl) {
      const errorText = errorEl.textContent || 'Unknown generation error';
      return { success: false, errorType: 'unknown', error: errorText };
    }

    // Check for generated images
    const images = resolveSelectorAll(SELECTORS.GENERATED_IMAGE);
    if (images.length > 0) {
      const imageUrls = Array.from(images)
        .map((img) => img.src || img.getAttribute('data-src'))
        .filter(Boolean);

      if (imageUrls.length > 0) {
        return {
          success: true,
          imageUrls,
          generationTimeMs: Date.now() - startTime,
        };
      }
    }

    await sleep(2000);
  }

  return { success: false, errorType: 'generation_timeout', error: 'Generation timed out after 120 seconds' };
}
