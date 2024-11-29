import { signal, computed, batch } from '@preact/signals-react';
import { ChatMessage } from '../types/ChatMessage';
import { storageService, Chat } from '../services/storageService';
import { signalRService } from '../services/signalRService';

class ChatStore {
  // Core state
  private _currentUser = signal<string>('');
  private _isConnected = signal<boolean>(false);
  private _isInitialized = signal<boolean>(false);
  private _error = signal<Error | null>(null);
  private _isLoading = signal<boolean>(false);
  
  // Chat state
  private _currentChatId = signal<string | null>(null);
  private _chats = signal<Map<string, Chat>>(new Map());
  private _messages = signal<Map<string, ChatMessage[]>>(new Map());

  // Computed values
  public readonly currentUser = computed(() => this._currentUser.value);
  public readonly isConnected = computed(() => this._isConnected.value);
  public readonly currentChatId = computed(() => this._currentChatId.value);
  public readonly isInitialized = computed(() => this._isInitialized.value);
  public readonly error = computed(() => this._error.value);
  public readonly isLoading = computed(() => this._isLoading.value);
  
  public readonly currentChat = computed(() => 
    this._currentChatId.value ? this._chats.value.get(this._currentChatId.value) : null
  );
  public readonly currentMessages = computed(() => 
    this._currentChatId.value ? this._messages.value.get(this._currentChatId.value) || [] : []
  );
  public readonly chats = computed(() => Array.from(this._chats.value.values()));

  constructor() {
    this.initialize().catch(error => {
      console.error('Failed to initialize ChatStore:', error);
      this._error.value = error instanceof Error ? error : new Error('Failed to initialize ChatStore');
    });
  }

  private async initialize() {
    if (this._isInitialized.value) return;

    try {
      this._isLoading.value = true;
      this._error.value = null; // Clear any previous errors
      await this.loadState();
      this._isInitialized.value = true;
      await this.initializeFromUrl();
    } catch (error) {
      console.error('Failed to initialize ChatStore:', error);
      this._error.value = error instanceof Error ? error : new Error('Failed to initialize ChatStore');
      throw error;
    } finally {
      this._isLoading.value = false;
    }
  }

  // Chat methods
  public async createChat(name: string, participants: string[]): Promise<string> {
    await this.ensureInitialized();

    try {
      // Create chat through SignalR to notify all users
      const chatId = await signalRService.createChat(name, participants);
      return chatId;
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw error;
    }
  }

  public addChat(chat: Chat): void {
    // Update in-memory state
    this._chats.value = new Map(this._chats.value).set(chat.id, chat);
    
    // Persist to storage
    storageService.saveChat(chat).catch(error => {
      console.error('Failed to save new chat to storage:', error);
    });
  }

  public updateChat(chat: Chat): void {
    // Update in-memory state
    this._chats.value = new Map(this._chats.value).set(chat.id, chat);
    
    // Persist to storage
    storageService.saveChat(chat).catch(error => {
      console.error('Failed to save updated chat to storage:', error);
    });
  }

  public async refreshChat(chatId: string): Promise<void> {
    try {
      const chat = await storageService.getChat(chatId);
      if (chat) {
        this._chats.value = new Map(this._chats.value).set(chatId, chat);
      }
    } catch (error) {
      console.error('Failed to refresh chat:', error);
    }
  }

  public async selectChat(chatId: string): Promise<void> {
    try {
      await this.ensureInitialized();

      if (!this._isConnected.value) {
        await signalRService.startConnection(this._currentUser.value);
      }

      // Leave current chat if any
      if (this._currentChatId.value) {
        await signalRService.leaveChat(this._currentChatId.value);
      }

      // Join new chat
      await signalRService.joinChat(chatId);
      this._currentChatId.value = chatId;
      
      // Load chat messages from storage
      try {
        const messages = await storageService.getChatMessages(chatId);
        if (messages && messages.length > 0) {
          // Sort messages by timestamp
          const sortedMessages = messages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          this._messages.value = new Map(this._messages.value).set(chatId, sortedMessages as ChatMessage[]);
        } else {
          // Initialize empty message list if no messages found
          this._messages.value = new Map(this._messages.value).set(chatId, []);
        }
      } catch (error) {
        console.error('Failed to load chat messages:', error);
        // Initialize empty message list on error
        this._messages.value = new Map(this._messages.value).set(chatId, []);
      }

      this.updateUrl();
    } catch (error) {
      console.error('Failed to select chat:', error);
      throw error;
    }
  }

  // Message methods
  public async addMessage(chatId: string, message: ChatMessage): Promise<void> {
    if (!this._isInitialized.value) {
      console.warn('Attempting to add message before initialization');
      return;
    }

    try {
      // Add message to storage first
      const messageToSave = {
        ...message,
        chatId,
        timestamp: new Date().toISOString()
      };
      await storageService.saveMessage(messageToSave);

      // Then update in-memory state
      const messages = this._messages.value.get(chatId) || [];
      const newMessages = [...messages, messageToSave];
      this._messages.value = new Map(this._messages.value).set(chatId, newMessages);

      // Update chat's updatedAt timestamp
      const chat = this._chats.value.get(chatId);
      if (chat) {
        this.saveChat({
          ...chat,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  // User methods
  public async setCurrentUser(username: string): Promise<void> {
    try {
      await this.ensureInitialized();

      if (username.trim()) {
        this._error.value = null; // Clear any previous errors
        this._currentUser.value = username.trim();
        
        // Initialize and start SignalR connection
        await signalRService.startConnection(username.trim());
        
        // Load user's chats after setting the user
        const chats = await storageService.getAllChats();
        const chatsMap = new Map();
        chats.forEach(chat => chatsMap.set(chat.id, chat));
        this._chats.value = chatsMap;
        
        await this.saveUserState();
      }
    } catch (error) {
      console.error('Failed to set current user:', error);
      this._error.value = error instanceof Error ? error : new Error('Failed to set current user');
      throw error;
    }
  }

  public async connectToChat(): Promise<void> {
    try {
      if (!this._currentUser.value) {
        throw new Error('Cannot connect: No user set');
      }
      await signalRService.startConnection(this._currentUser.value);
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      this._error.value = error instanceof Error ? error : new Error('Failed to connect to chat');
      throw error;
    }
  }

  public async logout(): Promise<void> {
    await this.ensureInitialized();

    if (this._currentChatId.value) {
      await signalRService.leaveChat(this._currentChatId.value);
    }
    
    await storageService.clearUserState();
    
    batch(() => {
      this._currentUser.value = '';
      this._currentChatId.value = null;
      this._isConnected.value = false;
      this._messages.value = new Map();
      window.history.replaceState({}, '', window.location.pathname);
    });
  }

  // Connection methods
  public setConnectionStatus(status: boolean): void {
    this._isConnected.value = status;
  }

  // URL management
  private async initializeFromUrl(): Promise<void> {
    // Only process URL parameters if user is logged in
    if (this._currentUser.value) {
      const params = new URLSearchParams(window.location.search);
      const chatId = params.get('chat');
      if (chatId) {
        await this.selectChat(chatId);
      } else {
        // If no chat in URL, try to load last chat from storage
        const userState = await storageService.getUserState();
        if (userState?.lastChatId) {
          await this.selectChat(userState.lastChatId);
        }
      }
    } else {
      // If no user, remove any URL parameters
      if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }

  private updateUrl(): void {
    // Only update URL if user is logged in
    if (this._currentUser.value) {
      const params = new URLSearchParams();
      if (this._currentChatId.value) {
        params.set('chat', this._currentChatId.value);
      }
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.pushState({}, '', newUrl);
    } else {
      // If no user, ensure URL is clean
      if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    
    // Always save state to storage
    if (this._currentChatId.value) {
      this.saveUserState();
    }
  }

  // State persistence
  private async loadState(): Promise<void> {
    try {
      // Load user state
      const userState = await storageService.getUserState();
      if (userState?.currentUser) {
        this._currentUser.value = userState.currentUser;
      }

      // Only load chats if we have a user
      if (this._currentUser.value) {
        const chats = await storageService.getAllChats();
        const chatsMap = new Map();
        chats.forEach(chat => chatsMap.set(chat.id, chat));
        this._chats.value = chatsMap;
      }
    } catch (error) {
      console.error('Error loading state:', error);
      // Don't throw error here as this is part of initialization
    }
  }

  private async saveUserState(): Promise<void> {
    try {
      if (this._currentUser.value) {
        await storageService.saveUserState({
          id: 1, // We only ever have one user state
          currentUser: this._currentUser.value,
          lastChatId: this._currentChatId.value
        });
      }
    } catch (error) {
      console.error('Error saving user state:', error);
      // Don't throw as this is not critical
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this._isInitialized.value) {
      throw new Error('ChatStore is not initialized');
    }
  }

  // Methods to safely modify private signals from outside the class
  public updateMessages(chatId: string, messages: ChatMessage[]) {
    const updatedMessages = new Map(this._messages.value);
    updatedMessages.set(chatId, messages);
    this._messages.value = updatedMessages;
  }

  public setCurrentChatId(chatId: string | null) {
    this._currentChatId.value = chatId;
  }

  public setError(errorMessage: string) {
    this._error.value = new Error(errorMessage);
  }

  public saveChat(chat: Chat): void {
    if (!this._isInitialized.value) {
      console.warn('Attempting to save chat before initialization');
      return;
    }

    const updatedChats = new Map(this._chats.value);
    updatedChats.set(chat.id, chat);
    this._chats.value = updatedChats;

    // Optional: Persist to storage service if needed
    storageService.saveChat(chat).catch(error => {
      console.error('Failed to save chat:', error);
    });
  }

  reset() {
    this._currentUser.value = '';
    this._currentChatId.value = null;
    this._messages.value = new Map();
    this._chats.value = new Map();
    this._error.value = null;
    this._isConnected.value = false;
  }
}

export const chatStore = new ChatStore();
