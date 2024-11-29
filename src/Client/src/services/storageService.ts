import Dexie, { Table } from 'dexie';

export interface Chat {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  participants: string[];
}

export interface UserState {
  id: number;
  currentUser: string;
  lastChatId: string | null;
}

export interface ChatMessage {
  username?: string;
  content: string;
  timestamp: string;
  id?: string;
  chatId?: string;
  sender?: string;
}

class ChatDatabase extends Dexie {
  chats!: Table<Chat, string>;
  userState!: Table<UserState>;
  messages!: Table<ChatMessage, string>;

  constructor() {
    super('chatApp');
    
    this.version(4).stores({
      chats: 'id, updatedAt',
      userState: 'id',
      messages: '[chatId+id], chatId, timestamp'
    });
  }
}

class StorageService {
  private db: ChatDatabase;

  constructor() {
    this.db = new ChatDatabase();
  }

  async init(): Promise<void> {
    try {
      await this.db.open();
      console.log('Database opened successfully');
    } catch (error) {
      console.error('Failed to open database:', error);
      throw error;
    }
  }

  async saveChat(chat: Chat): Promise<void> {
    await this.db.chats.put(chat);
  }

  async getChat(chatId: string): Promise<Chat | null> {
    const chat = await this.db.chats.get(chatId);
    return chat || null;
  }

  async getAllChats(): Promise<Chat[]> {
    return await this.db.chats
      .orderBy('updatedAt')
      .reverse()
      .toArray();
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.db.chats.delete(chatId);
  }

  async saveUserState(state: UserState): Promise<void> {
    try {
      console.log('Saving user state:', state);
      await this.db.userState.put(state);
      console.log('User state saved successfully');
      
      // Verify save
      const saved = await this.getUserState();
      console.log('Verified saved state:', saved);
    } catch (error) {
      console.error('Failed to save user state:', error);
      throw error;
    }
  }

  async getUserState(): Promise<UserState | null> {
    try {
      const state = await this.db.userState.get(1);
      return state || null;
    } catch (error) {
      console.debug('No user state found'); 
      return null;
    }
  }

  async clearUserState(): Promise<void> {
    try {
      await this.db.userState.clear();
      console.log('User state cleared successfully');
    } catch (error) {
      console.error('Failed to clear user state:', error);
      throw error;
    }
  }

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const messages = await this.db.messages
        .where('chatId')
        .equals(chatId)
        .sortBy('timestamp');
      
      // Convert stored messages to new interface
      return messages.map(msg => ({
        username: msg.username || msg.sender, // Prefer username, fallback to sender
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString(),
        id: msg.id,
        chatId: msg.chatId
      }));
    } catch (error) {
      console.error(`Failed to retrieve messages for chat ${chatId}:`, error);
      return [];
    }
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      // Convert to storage-compatible message
      const storageMessage: ChatMessage = {
        id: message.id || crypto.randomUUID(),
        chatId: message.chatId || '', // Ensure a default value
        username: message.username || message.sender || 'Unknown', // Provide a default string
        content: message.content,
        timestamp: new Date().toISOString()

      };
      await this.db.messages.put(storageMessage);
    } catch (error) {
      console.error('Failed to save message:', error);
      throw error;
    }
  }

  async deleteMessagesForChat(chatId: string): Promise<void> {
    try {
      await this.db.messages
        .where('chatId')
        .equals(chatId)
        .delete();
    } catch (error) {
      console.error(`Failed to delete messages for chat ${chatId}:`, error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
