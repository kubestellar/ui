import { getWebSocketUrl } from '../../lib/api';
import { Terminal } from 'xterm';

export interface WebSocketParams {
  cluster: string;
  namespace: string;
  pod: string;
}

export interface LogsWebSocketConfig {
  cluster: string;
  namespace: string;
  pod: string;
  container?: string;
  previous?: boolean;
}

export interface ExecWebSocketConfig {
  namespace: string;
  pod: string;
  container: string;
  cluster: string;
}

export class LogsWebSocket {
  private socket: WebSocket | null = null;
  private onMessage: (data: string) => void;
  private onOpen: () => void;
  private onError: (error: Event) => void;
  private onClose: () => void;

  constructor(
    onMessage: (data: string) => void,
    onOpen: () => void,
    onError: (error: Event) => void,
    onClose: () => void
  ) {
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onError = onError;
    this.onClose = onClose;
  }

  connect(config: LogsWebSocketConfig): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    let wsUrl = getWebSocketUrl(`/ws/logs?cluster=${config.cluster}&namespace=${config.namespace}&pod=${config.pod}`);

    if (config.container) {
      wsUrl += `&container=${encodeURIComponent(config.container)}`;
    }

    if (config.previous) {
      wsUrl += `&previous=true`;
    }

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = this.onOpen;
    this.socket.onmessage = (event) => this.onMessage(event.data);
    this.socket.onerror = this.onError;
    this.socket.onclose = this.onClose;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export class ExecWebSocket {
  private socket: WebSocket | null = null;
  private terminal: Terminal;
  private onOpen: () => void;
  private onError: (error: Event) => void;
  private onClose: () => void;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    terminal: Terminal,
    onOpen: () => void,
    onError: (error: Event) => void,
    onClose: () => void
  ) {
    this.terminal = terminal;
    this.onOpen = onOpen;
    this.onError = onError;
    this.onClose = onClose;
  }

  connect(config: ExecWebSocketConfig): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    const wsUrl = getWebSocketUrl(
      `/ws/pod/${encodeURIComponent(config.namespace)}/${encodeURIComponent(config.pod)}/shell/${encodeURIComponent(config.container)}?context=${encodeURIComponent(config.cluster)}&shell=sh`
    );

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.onOpen();
      this.startPingInterval();
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.Op === 'stdout') {
          this.terminal.write(msg.Data);
        }
      } catch {
        this.terminal.writeln(event.data);
      }
    };

    this.socket.onerror = this.onError;
    this.socket.onclose = () => {
      this.stopPingInterval();
      this.onClose();
    };

    // Handle terminal input
    this.terminal.onData((data: string) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        const msg = JSON.stringify({ Op: 'stdin', Data: data });
        this.socket.send(msg);
      }
    });
  }

  disconnect(): void {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ Op: 'ping' }));
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const createLogsWebSocket = (
  onMessage: (data: string) => void,
  onOpen: () => void,
  onError: (error: Event) => void,
  onClose: () => void
): LogsWebSocket => {
  return new LogsWebSocket(onMessage, onOpen, onError, onClose);
};

export const createExecWebSocket = (
  terminal: Terminal,
  onOpen: () => void,
  onError: (error: Event) => void,
  onClose: () => void
): ExecWebSocket => {
  return new ExecWebSocket(terminal, onOpen, onError, onClose);
}; 