// ALL Higgsfield UI selectors in ONE file.
// When Higgsfield updates their UI, only this file needs updating.
// NOTE: No ES module exports — variables are declared globally for use by higgsfield-automator.js

const SELECTORS = {
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
  PROMPT_TEXTAREA: {
    primary: 'textarea[placeholder*="prompt"]',
    fallbacks: ['textarea.prompt-input', '.prompt-area textarea', 'textarea'],
    description: 'Main prompt text input',
  },
  MODEL_SELECTOR: {
    primary: '[data-model-selector]',
    fallbacks: ['.model-select', 'select[name="model"]'],
    description: 'Model dropdown (Higgsfield Soul)',
  },
  ASPECT_RATIO_OPTION: {
    primary: '[data-ratio="3:4"]',
    fallbacks: ['[aria-label*="3:4"]'],
    description: 'Aspect ratio 3:4 option',
  },
  COUNT_SELECTOR: {
    primary: '[data-count]',
    fallbacks: ['.count-selector', 'input[name="count"]'],
    description: 'Image count selector',
  },
  UNLIM_TOGGLE: {
    primary: '[data-unlim-toggle]',
    fallbacks: ['.unlim-toggle', 'input[type="checkbox"][name*="unlim"]'],
    description: 'Unlimited generations toggle',
  },
  GENERATE_BUTTON: {
    primary: 'button[data-generate]',
    fallbacks: ['button.generate-btn', 'button[type="submit"]'],
    description: 'Generate button',
  },
  GENERATED_IMAGE: {
    primary: '.generated-image img',
    fallbacks: ['.result-image img', '.generation-result img', '.output-image img'],
    description: 'Generated image elements',
  },
  GENERATION_LOADING: {
    primary: '.generation-loading',
    fallbacks: ['.generating-indicator', '[data-generating]', '.spinner'],
    description: 'Generation in-progress indicator',
  },
  GENERATION_ERROR: {
    primary: '.generation-error',
    fallbacks: ['.error-message', '[data-error]', '.toast-error'],
    description: 'Generation error message',
  },
  USER_AVATAR: {
    primary: '.user-avatar',
    fallbacks: ['[data-user]', '.profile-icon', 'img[alt*="avatar"]'],
    description: 'Logged-in user avatar',
  },
  SIGN_IN_BUTTON: {
    primary: 'a[href*="login"]',
    fallbacks: ['a[href*="signin"]'],
    description: 'Sign in button',
  },
};

function resolveSelector(selectorDef) {
  const el = document.querySelector(selectorDef.primary);
  if (el) return el;
  for (const fallback of selectorDef.fallbacks) {
    const found = document.querySelector(fallback);
    if (found) return found;
  }
  return null;
}

function resolveSelectorAll(selectorDef) {
  let els = document.querySelectorAll(selectorDef.primary);
  if (els.length > 0) return els;
  for (const fallback of selectorDef.fallbacks) {
    els = document.querySelectorAll(fallback);
    if (els.length > 0) return els;
  }
  return document.querySelectorAll('__never_match__');
}

function preflightCheck() {
  const critical = ['PROMPT_TEXTAREA', 'GENERATE_BUTTON'];
  const missing = [];
  for (const key of critical) {
    if (!resolveSelector(SELECTORS[key])) {
      missing.push({ key, description: SELECTORS[key].description, primary: SELECTORS[key].primary });
    }
  }
  return missing;
}
