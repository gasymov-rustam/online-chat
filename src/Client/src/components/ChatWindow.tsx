import { useRef, useEffect } from 'react';
import { useComputed } from '@preact/signals-react';
import { chatStore } from '../signals/chat';
import { MessageInput } from './MessageInput';
import { signalRService } from '../services/signalRService';

export function ChatWindow() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChat = useComputed(() => chatStore.currentChat.value);
  const messages = useComputed(() => chatStore.currentMessages.value);
  const currentUser = useComputed(() => chatStore.currentUser.value);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.value]);

  const handleLogout = async () => {
    try {
      // Stop SignalR connection
      await signalRService.stopConnection();
      // Clear local storage
      localStorage.clear();
      // Reset the store (which includes clearing currentUser)
      chatStore.reset();
      // Force a page refresh to ensure clean state
    //   window.location.reload();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (!currentChat.value) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="p-4 bg-white shadow-sm flex justify-between items-center">
          <h2 className="text-lg font-semibold">Welcome, {currentUser.value}</h2>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
          >
            Logout
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 shadow-sm z-10 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">{currentChat.value.name}</h2>
            <p className="text-sm text-gray-500">
              {currentChat.value.participants.join(', ')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
          >
            Logout
          </button>
        </div>

        <div className="p-4 space-y-4">
          {messages.value.map((message, index) => {
            const isCurrentUser = message.username === currentUser.value;
            return (
              <div
                key={index}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isCurrentUser
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isCurrentUser && (
                    <div className="text-sm text-gray-500 mb-1">
                      {message.username}
                    </div>
                  )}
                  <div>{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <MessageInput />
    </div>
  );
}
