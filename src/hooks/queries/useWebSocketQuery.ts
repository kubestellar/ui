import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { getWebSocketUrl } from '../../lib/api';

interface UseWebSocketOptions<TData, TRawData = unknown> {
  url: string;
  queryKey: string[];
  enabled?: boolean;
  onMessage?: (data: TData) => void;
  onRawMessage?: (event: MessageEvent) => void;
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  onError?: (error: Error) => void;
  transform?: (data: TRawData) => TData;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  parseData?: boolean;
}

interface WebSocketState {
  isConnected: boolean;
  error: Error | null;
}

export type WebSocketFeatures = {
  sendMessage: (data: string | object) => void;
  disconnect: () => void;
  connect: () => void;
  isConnected: boolean;
  wsError: Error | null;
};

export type WebSocketQueryResult<TData> = UseQueryResult<TData, Error> & WebSocketFeatures;

export const useWebSocketQuery = <TData = unknown, TRawData = TData>(
  options: UseWebSocketOptions<TData, TRawData>
): WebSocketQueryResult<TData> => {
  const {
    url,
    queryKey,
    enabled = true,
    onMessage,
    onRawMessage,
    onConnect,
    onDisconnect,
    onError,
    transform = (data: TRawData) => data as unknown as TData,
    autoReconnect = true,
    reconnectInterval = 3000,
    parseData = true,
  } = options;

  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [wsState, setWsState] = useState<WebSocketState>({
    isConnected: false,
    error: null,
  });

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const wsUrl = getWebSocketUrl(url);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState({ isConnected: true, error: null });
      queryClient.setQueryData(queryKey, null);
      onConnect?.();
    };

    ws.onmessage = event => {
      onRawMessage?.(event);

      try {
        let data: TRawData = event.data;

        if (parseData && typeof event.data === 'string') {
          data = JSON.parse(event.data) as TRawData;
        } else if (parseData) {
          throw new Error('Expected string data for JSON parsing');
        }

        const transformedData = transform(data);
        queryClient.setQueryData(queryKey, transformedData);
        onMessage?.(transformedData);
      } catch (error) {
        const wsError =
          error instanceof Error ? error : new Error('Failed to process WebSocket message');
        setWsState(prev => ({ ...prev, error: wsError }));
        onError?.(wsError);
      }
    };

    ws.onerror = error => {
      const wsError = error instanceof Error ? error : new Error('WebSocket error');
      setWsState({ isConnected: false, error: wsError });
      queryClient.setQueryData(queryKey, null);
      onError?.(wsError);
    };

    ws.onclose = event => {
      setWsState({ isConnected: false, error: null });
      queryClient.setQueryData(queryKey, null);
      wsRef.current = null;
      onDisconnect?.(event);

      if (autoReconnect && enabled) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, reconnectInterval);
      }
    };
  };

  const sendMessage = (data: string | object) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    wsRef.current.send(message);
  };

  const disconnect = () => {
    if (!wsRef.current) return;

    // Force close by setting readyState to CLOSED (3)
    if (wsRef.current.readyState !== WebSocket.CLOSED) {
      try {
        wsRef.current.close();
      } catch (e) {
        console.warn('Error closing WebSocket:', e);
      }
    }

    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (enabled) {
      connectWebSocket();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, url]);

  const queryResult = useQuery<TData, Error>({
    queryKey,
    queryFn: () => Promise.resolve(queryClient.getQueryData(queryKey) ?? (null as TData)),
    enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  return {
    ...queryResult,
    sendMessage,
    disconnect,
    connect: connectWebSocket,
    isConnected: wsState.isConnected,
    wsError: wsState.error,
  };
};
