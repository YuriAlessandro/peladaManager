import { io, Socket } from 'socket.io-client';

// Use the same URL logic as the API
const SOCKET_URL = window.location.hostname === "localhost" 
  ? "http://localhost:4000" 
  : "https://plankton-app-xoik3.ondigitalocean.app";

export class SocketManager {
  private socket: Socket | null = null;
  private isConnecting = false;

  connect(gameDayId: string, onTransfer: () => void, onUpdate: () => void) {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to socket server');
        this.socket?.emit('join', gameDayId);
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnecting = false;
        // Don't show error to user, just log it
      });

      this.socket.on('game-day:transferred', onTransfer);
      this.socket.on('game-day:updated', onUpdate);

    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.socket = null;
    this.isConnecting = false;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketManager = new SocketManager();
