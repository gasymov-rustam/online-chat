import { useEffect } from 'react';
import { computed } from '@preact/signals-react';
import { chatStore } from './signals/chat';
import { signalRService } from './services/signalRService';
import { UserLogin } from './components/UserLogin';
import { ChatWindow } from './components/ChatWindow';
import { ChatList } from './components/ChatList';
import { ErrorBoundary } from './components/ErrorBoundary';

const isAuthenticated = computed(() => !!chatStore.currentUser.value);

function App() {
  useEffect(() => {
    // Initialize SignalR when username is set
    if (chatStore.currentUser.value) {
      // signalRService.initializeConnection(chatStore.currentUser.value);
      // signalRService.startConnection(chatStore.currentUser.value);
    }
  }, [chatStore.currentUser.value]);

  if (!isAuthenticated.value) {
    return <UserLogin />;
  }

  if (chatStore.error.value) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{chatStore.error.value.toString()}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-100">
        <div className="w-1/4 border-r">
          <ChatList />
        </div>
        <div className="flex-1">
          <ChatWindow />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
