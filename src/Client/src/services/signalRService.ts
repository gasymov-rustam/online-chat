import * as signalR from '@microsoft/signalr';
import { chatStore } from '../signals/chat';
import { config } from '../../config/config';
import { Chat } from './storageService';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private initialized = false;

  initializeConnection(username: string) {
    const safeUsername = username || chatStore.currentUser.value || 'Anonymous';

    // If connection exists and is not in Disconnected state, stop it first
    if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) {
      this.connection.stop().catch(console.error);
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${config.hubUrl}?username=${encodeURIComponent(safeUsername)}`)
      .withAutomaticReconnect()
      .build();

    this.setupHandlers();
  }

  async startConnection(username: string) {
    try {
      // Always reinitialize connection with new username
      this.initializeConnection(username);
      
      if (!this.connection) {
        throw new Error('Connection not initialized properly');
      }

      if (this.connection.state === signalR.HubConnectionState.Connected) {
        console.log('SignalR already connected');
        return;
      }

      await this.connection.start();
      this.initialized = true;
      chatStore.setConnectionStatus(true);
      console.log('SignalR connected successfully');
    } catch (error) {
      console.error('SignalR connection failed:', error);
      chatStore.setConnectionStatus(false);
      this.initialized = false;
      throw error;
    }
  }

  private setupHandlers() {
    if (!this.connection) return;

    this.connection.on('ReceiveMessage', async (username: string, message: string) => {
      try {
        const currentChatId = chatStore.currentChatId.value;
        if (!currentChatId) {
          console.warn('Received message but no chat is selected');
          return;
        }

        // Create message object
        const newMessage = {
          username,
          content: message,
          timestamp: new Date().toISOString(),
          chatId: currentChatId
        };

        // Save message and update store
        await chatStore.addMessage(currentChatId, newMessage);
      } catch (error) {
        console.error('Failed to handle received message:', error);
      }
    });

    this.connection.on('ChatCreated', (chat: Chat) => {
      chatStore.addChat(chat);
    });

    this.connection.on('ChatUpdated', (chat: Chat) => {
      chatStore.updateChat(chat);
    });

    this.connection.on('UserJoined', (username: string, chatId: string) => {
      const currentUser = chatStore.currentUser.value || '';
      if (username !== currentUser) {
        chatStore.refreshChat(chatId);
      }
    });

    this.connection.on('UserLeft', (username: string, chatId: string) => {
      chatStore.refreshChat(chatId);
    });

    this.connection.onclose(() => {
      chatStore.setConnectionStatus(false);
      this.initialized = false;
    });
  }

  async stop() {
    if (!this.connection) return;
    
    try {
      if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
        await this.connection.stop();
      }
      this.initialized = false;
      chatStore.setConnectionStatus(false);
    } catch (err) {
      console.error('Error stopping SignalR connection:', err);
    } finally {
      this.connection = null;
    }
  }

  async stopConnection() {
    try {
      if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) {
        await this.connection.stop();
        this.initialized = false;
        chatStore.setConnectionStatus(false);
        console.log('SignalR disconnected successfully');
      }
    } catch (error) {
      console.error('Error stopping SignalR connection:', error);
      throw error;
    }
  }

  async joinChat(chatId: string) {
    if (!this.connection) {
      console.error('SignalR connection not initialized');
      throw new Error('SignalR connection not initialized');
    }

    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('SignalR not connected. Current state:', this.connection.state);
      throw new Error('SignalR not connected');
    }

    try {
      console.log('Attempting to join chat:', chatId);
      await this.connection.invoke('joinChat', chatId); 
      console.log('Successfully joined chat:', chatId);
      chatStore.setCurrentChatId(chatId);
    } catch (err) {
      console.error('Error joining chat:', err);
      chatStore.setError('Failed to join chat');
      throw err;
    }
  }

  async leaveChat(chatId: string) {
    if (!this.connection || !this.initialized) return;

    try {
      await this.connection.invoke('LeaveChat', chatId);
      chatStore.setCurrentChatId(null);
    } catch (err) {
      console.error('Error leaving chat:', err);
    }
  }

  async createChat(name: string, participants: string[]): Promise<string> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR connection is not established');
    }

    try {
      // Assuming the server has a method named "CreateChat" in the ChatHub
      const chatId = await this.connection.invoke<string>('CreateChat', name, participants);
      return chatId;
    } catch (error) {
      console.error('Failed to create chat via SignalR:', error);
      throw error;
    }
  }

  async sendMessage(message: string) {
    if (!this.connection || !this.initialized || !chatStore.currentChatId.value) {
      console.error('Cannot send message: Not initialized or no chat selected');
      return;
    }

    try {
      await this.connection.invoke('SendMessage', chatStore.currentChatId.value, message);
    } catch (err) {
      console.error('Error sending message:', err);
      chatStore.setError('Failed to send message');
    }
  }
}

export const signalRService = new SignalRService();
