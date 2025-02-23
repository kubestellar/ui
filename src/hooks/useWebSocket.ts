import { useState, useEffect, useCallback } from 'react';

interface WebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);

  const connect = useCallback(() => {
    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    websocket.onmessage = (event) => {
      if (options.onMessage) {
        try {
          const data = JSON.parse(event.data);
          options.onMessage(data);
        } catch (e) {
          options.onMessage(event.data);
        }
      }
    };

    websocket.onerror = (event) => {
      setError(event);
      if (options.onError) options.onError(event);
    };

    websocket.onclose = () => {
      setIsConnected(false);
      if (options.onClose) options.onClose();
      if (options.autoReconnect) {
        setTimeout(connect, options.reconnectInterval || 5000);
      }
    };

    setWs(websocket);
  }, [url, options]);

  useEffect(() => {
    connect();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (ws && isConnected) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, [ws, isConnected]);

  return {
    isConnected,
    error,
    send,
  };
}; 