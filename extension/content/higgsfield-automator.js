// HiggsBot — Higgsfield content script
// All automation is now driven by chrome.scripting.executeScript from the
// service worker (queue-manager.js). This file just handles CHECK_SESSION.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CHECK_SESSION') {
    const loggedOut = Array.from(document.querySelectorAll('a, button')).some((el) => {
      const t = el.textContent.trim();
      return t === 'Sign In' || t === 'Log in' || t === 'Log In';
    });
    sendResponse({ loggedIn: !loggedOut });
    return false;
  }
});
