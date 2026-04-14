import { getQueue, setQueue, getJob, setJob, appendResults } from './storage-manager.js';

const ALARM_NEXT_JOB = 'hb-next-job';
const SOUL_URL = 'https://higgsfield.ai/image/soul';
const CHAR_URL = 'https://higgsfield.ai/character';

// ─── executeScript helper ──────────────────────────────────────────────────
// Runs a function directly in the tab — no message passing, no port issues.

async function exec(tabId, func, args = []) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func,
      args,
    });
    return results?.[0]?.result ?? null;
  } catch (e) {
    console.error('[HiggsBot] executeScript error:', e.message);
    return null;
  }
}

// ─── Tab navigation helpers ────────────────────────────────────────────────

function waitForTabLoad(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(false); }, timeoutMs);
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function navigateTab(tabId, url) {
  await chrome.tabs.update(tabId, { url });
  await waitForTabLoad(tabId, 15000);
  await sleep(2500); // React hydration
}

async function ensureSoulTab() {
  const existing = await chrome.tabs.query({ url: ['https://higgsfield.ai/*', 'https://www.higgsfield.ai/*'] });
  if (existing.length > 0) {
    const tab = existing[0];
    await chrome.tabs.update(tab.id, { active: true });
    if (!tab.url?.includes('/image/soul')) {
      await navigateTab(tab.id, SOUL_URL);
    }
    // Re-fetch tab to get updated info
    return await chrome.tabs.get(tab.id);
  }
  // Open new tab
  const tab = await chrome.tabs.create({ url: SOUL_URL, active: true });
  await waitForTabLoad(tab.id, 20000);
  await sleep(3000);
  return tab;
}

// ─── In-tab functions (injected via executeScript) ─────────────────────────
// These run INSIDE the Higgsfield page context. No imports, pure functions.

function PAGE_isLoggedIn() {
  return !Array.from(document.querySelectorAll('a, button')).some((el) => {
    const t = el.textContent.trim();
    return t === 'Sign In' || t === 'Log in' || t === 'Log In';
  });
}

function PAGE_clickCharacter(name) {
  if (!name) return 'skipped';
  const target = name.trim().toUpperCase();

  // Find leaf text nodes matching the name
  const allEls = Array.from(document.querySelectorAll('*'));
  const match = allEls.find((el) =>
    el.children.length === 0 && el.textContent.trim().toUpperCase() === target
  );
  if (!match) return 'not_found';

  // Walk up to find clickable ancestor (a, button, or role=button)
  let node = match;
  for (let i = 0; i < 8; i++) {
    if (!node) break;
    if (node.tagName === 'A' || node.tagName === 'BUTTON' ||
        node.getAttribute('role') === 'button') {
      node.click();
      return 'clicked';
    }
    node = node.parentElement;
  }
  // Fallback: click the parent of the text element
  match.parentElement?.click();
  return 'clicked_parent';
}

function PAGE_getCurrentUrl() {
  return window.location.href;
}

function PAGE_snapshotImages() {
  return Array.from(document.querySelectorAll('img'))
    .map((img) => img.src)
    .filter((s) => s && s.startsWith('http') && !/favicon|logo|icon|avatar|profile/i.test(s));
}

function PAGE_injectAndGenerate(prompt) {
  // Find textarea
  const textareas = Array.from(document.querySelectorAll('textarea'));
  const textarea =
    textareas.find((t) => /describe|imagine|prompt/i.test(t.placeholder || '')) ||
    textareas[0];
  if (!textarea) return { ok: false, error: 'No textarea found' };

  // Inject prompt via React-safe native setter
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (setter) {
    setter.call(textarea, prompt);
  } else {
    textarea.value = prompt;
  }
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  // Verify injection
  if (!textarea.value?.trim()) {
    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, prompt);
  }

  // Find and click Generate button
  const btn = Array.from(document.querySelectorAll('button')).find((b) =>
    /^generate/i.test(b.textContent.trim())
  );
  if (!btn) return { ok: false, error: 'Generate button not found' };

  btn.click();
  return { ok: true, promptValue: textarea.value?.slice(0, 80) };
}

function PAGE_getNewImages(beforeUrls) {
  const beforeSet = new Set(beforeUrls);
  return Array.from(document.querySelectorAll('img'))
    .map((img) => img.src)
    .filter((s) =>
      s && s.startsWith('http') &&
      !/favicon|logo|icon|avatar|profile/i.test(s) &&
      !beforeSet.has(s)
    );
}

// ─── Core: select character then generate ─────────────────────────────────

async function selectCharacter(tab, characterName) {
  if (!characterName) return;

  // 1. Navigate to /character page
  console.log(`[HiggsBot] Selecting character: ${characterName}`);
  await navigateTab(tab.id, CHAR_URL);

  // 2. Click the character card
  const result = await exec(tab.id, PAGE_clickCharacter, [characterName]);
  console.log(`[HiggsBot] Character click result: ${result}`);

  if (result === 'not_found') {
    console.warn(`[HiggsBot] Character "${characterName}" not found — navigating to soul directly`);
    await navigateTab(tab.id, SOUL_URL);
    return;
  }

  // 3. Wait for navigation to /image/soul (Higgsfield navigates automatically after character click)
  console.log('[HiggsBot] Waiting for /image/soul after character selection...');
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    await sleep(800);
    const url = await exec(tab.id, PAGE_getCurrentUrl);
    if (url && url.includes('/image/soul')) {
      console.log('[HiggsBot] Arrived at /image/soul');
      await sleep(2000); // let UI settle
      return;
    }
  }

  // If didn't navigate automatically, go there manually
  await navigateTab(tab.id, SOUL_URL);
}

async function generateImage(tab, job) {
  // Snapshot before
  const beforeUrls = await exec(tab.id, PAGE_snapshotImages) || [];

  // Inject prompt + click Generate
  const genResult = await exec(tab.id, PAGE_injectAndGenerate, [job.prompt]);
  console.log('[HiggsBot] Generate result:', JSON.stringify(genResult));

  if (!genResult?.ok) {
    return { success: false, errorType: 'selector_not_found', error: genResult?.error || 'Injection failed' };
  }

  // Poll for new images (2 min)
  const deadline = Date.now() + 130000;
  while (Date.now() < deadline) {
    await sleep(2500);
    const newImgs = await exec(tab.id, PAGE_getNewImages, [beforeUrls]);
    if (newImgs && newImgs.length >= 1) {
      await sleep(3000); // let remaining images finish
      const final = await exec(tab.id, PAGE_getNewImages, [beforeUrls]) || newImgs;
      console.log(`[HiggsBot] Got ${final.length} images`);
      return { success: true, imageUrls: final };
    }
  }

  return { success: false, errorType: 'generation_timeout', error: 'No new images after 2 min' };
}

// ─── Main queue processor ──────────────────────────────────────────────────

export async function processNext() {
  const queue = await getQueue();
  if (!queue || queue.status !== 'running') return;

  // Find next queued job
  let nextIndex = queue.currentIndex;
  let job = null;
  while (nextIndex < queue.jobIds.length) {
    const candidate = await getJob(queue.jobIds[nextIndex]);
    if (candidate?.status === 'queued') { job = candidate; break; }
    nextIndex++;
  }

  if (!job) {
    queue.status = 'idle';
    await setQueue(queue);
    return;
  }

  queue.currentIndex = nextIndex;
  job.status = 'running';
  job.startedAt = Date.now();
  await setQueue(queue);
  await setJob(job.id, job);

  const startTime = Date.now();

  try {
    // Ensure Higgsfield tab exists and is on soul page
    const tab = await ensureSoulTab();

    // Check login
    const loggedIn = await exec(tab.id, PAGE_isLoggedIn);
    if (!loggedIn) {
      job.status = 'failed';
      job.errorType = 'session_expired';
      job.errorMessage = 'Not logged into Higgsfield';
      await setJob(job.id, job);
      queue.status = 'paused';
      queue.failedJobs++;
      await setQueue(queue);
      return;
    }

    // Select character (navigates /character → /image/soul)
    await selectCharacter(tab, job.characterName);

    // Generate
    const result = await generateImage(tab, job);

    if (result.success) {
      job.status = 'success';
      job.completedAt = Date.now();
      await setJob(job.id, job);
      await appendResults([{
        id: crypto.randomUUID(),
        jobId: job.id,
        productId: job.productId,
        characterId: job.characterId,
        sceneId: job.sceneId,
        batchId: job.batchId,
        imageUrls: result.imageUrls,
        prompt: job.prompt,
        generationTimeMs: Date.now() - startTime,
        createdAt: Date.now(),
      }]);
      queue.completedJobs++;
    } else {
      job.retryCount = (job.retryCount || 0) + 1;
      const maxRetries = job.maxRetries ?? 3;

      if (result.errorType === 'session_expired' || result.errorType === 'selector_not_found') {
        job.status = 'failed';
        job.errorType = result.errorType;
        job.errorMessage = result.error;
        await setJob(job.id, job);
        queue.status = 'paused';
        queue.failedJobs++;
        await setQueue(queue);
        return;
      }

      if (job.retryCount >= maxRetries) {
        job.status = 'failed';
        job.errorType = result.errorType;
        job.errorMessage = result.error;
        queue.failedJobs++;
      } else {
        job.status = 'queued'; // will retry
      }
      await setJob(job.id, job);
    }
  } catch (err) {
    console.error('[HiggsBot] Unexpected error:', err);
    job.retryCount = (job.retryCount || 0) + 1;
    if (job.retryCount >= (job.maxRetries ?? 3)) {
      job.status = 'failed';
      job.errorType = 'unknown';
      job.errorMessage = err.message;
      queue.failedJobs++;
    } else {
      job.status = 'queued';
    }
    await setJob(job.id, job);
  }

  queue.currentIndex = nextIndex + 1;
  const elapsed = Date.now() - (queue.startedAt || Date.now());
  const remaining = queue.totalJobs - queue.completedJobs - queue.failedJobs;
  const avg = queue.completedJobs > 0 ? elapsed / queue.completedJobs : 60000;
  queue.estimatedCompletionAt = Date.now() + remaining * avg;
  await setQueue(queue);

  scheduleNextJob();
}

function scheduleNextJob() {
  // 25-35s gap between jobs to stay under rate limits
  const gapMs = 25000 + Math.random() * 10000;
  chrome.alarms.create(ALARM_NEXT_JOB, { delayInMinutes: gapMs / 60000 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NEXT_JOB) processNext();
});
