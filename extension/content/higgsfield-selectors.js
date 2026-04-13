// =============================================================
// ALL Higgsfield UI selectors in ONE file.
// When Higgsfield updates their UI, only this file needs updating.
// Each selector has a primary and fallback array.
// =============================================================

export const SELECTORS = {
  // Character selection
  CHARACTER_CARD: {
    primary: '[data-character-name]',
    fallbacks: ['.character-card', '.soul-card'],
    description: 'Character card in the grid',
  },
  CHARACTER_NAME: {
    primary: '[data-character-name] .name',
    fallbacks: ['.character-card .name', '.soul-card .character-name'],
    description: 'Character name text inside card',
  },

  // Prompt input
  PROMPT_TEXTAREA: {
    primary: 'textarea[placeholder*="prompt"]',
    fallbacks: ['textarea.prompt-input', '.prompt-area textarea', 'textarea'],
    description: 'Main prompt text input',
  },

  // Model selector
  MODEL_SELECTOR: {
    primary: '[data-model-selector]',
    fallbacks: ['.model-select', 'select[name="model"]'],
    description: 'Model dropdown (Higgsfield Soul)',
  },

  // Aspect ratio
  ASPECT_RATIO_OPTION: {
    primary: '[data-ratio="3:4"]',
    fallbacks: ['[aria-label*="3:4"]', 'button:has-text("3:4")'],
    description: 'Aspect ratio 3:4 option',
  },

  // Count selector
  COUNT_SELECTOR: {
    primary: '[data-count]',
    fallbacks: ['.count-selector', 'input[name="count"]'],
    description: 'Image count selector',
  },

  // Unlimited toggle
  UNLIM_TOGGLE: {
    primary: '[data-unlim-toggle]',
    fallbacks: ['.unlim-toggle', 'input[type="checkbox"][name*="unlim"]'],
    description: 'Unlimited generations toggle',
  },

  // Generate button
  GENERATE_BUTTON: {
    primary: 'button[data-generate]',
    fallbacks: ['button.generate-btn', 'button:has-text("Generate")', 'button[type="submit"]'],
    description: 'Generate button',
  },

  // Generated images
  GENERATED_IMAGE: {
    primary: '.generated-image img',
    fallbacks: ['.result-image img', '.generation-result img', '.output-image img'],
    description: 'Generated image elements',
  },

  // Loading/progress indicators
  GENERATION_LOADING: {
    primary: '.generation-loading',
    fallbacks: ['.generating-indicator', '[data-generating]', '.spinner'],
    description: 'Generation in-progress indicator',
  },

  // Error message
  GENERATION_ERROR: {
    primary: '.generation-error',
    fallbacks: ['.error-message', '[data-error]', '.toast-error'],
    description: 'Generation error message',
  },

  // Login state indicators
  USER_AVATAR: {
    primary: '.user-avatar',
    fallbacks: ['[data-user]', '.profile-icon', 'img[alt*="avatar"]'],
    description: 'Logged-in user avatar (indicates active session)',
  },
  SIGN_IN_BUTTON: {
    primary: 'a[href*="login"]',
    fallbacks: ['button:has-text("Sign In")', 'a:has-text("Log In")'],
    description: 'Sign in button (indicates no active session)',
  },
};

/**
 * Resolve a selector — tries primary first, then fallbacks.
 * Returns the first matching element or null.
 */
export function resolveSelector(selectorDef) {
  const el = document.querySelector(selectorDef.primary);
  if (el) return el;

  for (const fallback of selectorDef.fallbacks) {
    // Skip :has-text pseudo-selectors (not real CSS)
    if (fallback.includes(':has-text')) continue;
    const found = document.querySelector(fallback);
    if (found) return found;
  }

  return null;
}

/**
 * Resolve all matching elements for a selector.
 */
export function resolveSelectorAll(selectorDef) {
  let els = document.querySelectorAll(selectorDef.primary);
  if (els.length > 0) return els;

  for (const fallback of selectorDef.fallbacks) {
    if (fallback.includes(':has-text')) continue;
    els = document.querySelectorAll(fallback);
    if (els.length > 0) return els;
  }

  return document.querySelectorAll('__never_match__');
}

/**
 * Preflight check — verify all critical selectors exist.
 * Returns list of missing selectors.
 */
export function preflightCheck() {
  const critical = [
    'PROMPT_TEXTAREA',
    'GENERATE_BUTTON',
  ];

  const missing = [];
  for (const key of critical) {
    const el = resolveSelector(SELECTORS[key]);
    if (!el) {
      missing.push({
        key,
        description: SELECTORS[key].description,
        primary: SELECTORS[key].primary,
      });
    }
  }

  return missing;
}
