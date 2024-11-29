import { useState, FormEvent } from 'react';
import { useComputed } from '@preact/signals-react';
import { signalRService } from '../services/signalRService';
import { chatStore } from '../signals/chat';

export function MessageInput() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const currentChat = useComputed(() => chatStore.currentChat.value);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending || !currentChat.value) return;

    try {
      setIsSending(true);
      await signalRService.sendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={currentChat.value ? "Type a message..." : "Select a chat to start messaging"}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          disabled={isSending || !currentChat.value}
        />
        <button
          type="submit"
          disabled={!message.trim() || isSending || !currentChat.value}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </form>
  );
}
