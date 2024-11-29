import { useState } from 'react';
import { useComputed } from '@preact/signals-react';
import { chatStore } from '../signals/chat';

export function ChatList() {
  const [isCreating, setIsCreating] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const chats = useComputed(() => chatStore.chats.value);
  const currentChatId = useComputed(() => chatStore.currentChatId.value);
  const currentUser = useComputed(() => chatStore.currentUser.value);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatName.trim()) return;

    try {
      setError(null);
      // Create chat and notify all users through SignalR
      const chatId = await chatStore.createChat(newChatName.trim(), [currentUser.value]);
      // Select the newly created chat
      await chatStore.selectChat(chatId);
      setNewChatName('');
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat');
    }
  };

  const handleSelectChat = async (chatId: string) => {
    try {
      setError(null);
      await chatStore.selectChat(chatId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select chat');
    }
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {isCreating ? 'Cancel' : 'New Chat'}
        </button>

        {isCreating && (
          <form onSubmit={handleCreateChat} className="mt-4">
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="Chat name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newChatName.trim()}
              className="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </form>
        )}

        {error && (
          <div className="mt-2 text-sm text-red-500">{error}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.value.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No chats yet. Create one to start messaging!
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {chats.value
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full p-3 text-left rounded-lg transition-colors ${
                    chat.id === currentChatId.value
                      ? 'bg-blue-50 text-blue-700 opacity-100'
                      : 'bg-blue-50 text-blue-700 opacity-30 hover:opacity-100 transition-opacity duration-500'
                  }`}
                >
                  <div className="font-medium truncate">{chat.name}</div>
                  <div className="text-sm text-gray-500 truncate">
                    {chat.participants.join(', ')}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(chat.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
