import { useState, useEffect, useCallback } from 'react';

export function useExtensionStatus() {
  const [connected, setConnected] = useState(false);

  const checkConnection = useCallback(() => {
    window.postMessage({ type: 'HIGGSBOT_PING' }, '*');

    const timeout = setTimeout(() => {
      setConnected(false);
    }, 2000);

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'HIGGSBOT_PONG') {
        clearTimeout(timeout);
        setConnected(true);
        window.removeEventListener('message', handler);
      }
    };

    window.addEventListener('message', handler);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
    };
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return { connected, checkConnection };
}
