using ChatApp.Application.Interfaces;
using ChatApp.Domain.Entities;

namespace ChatApp.Infrastructure.Services;

public class ChatService : IChatService
{
    private readonly List<ChatMessage> _messages = new();
    private readonly List<Chat> _chats = new();

    public async Task<ChatMessage> CreateMessageAsync(string user, string message)
    {
        var chatMessage = new ChatMessage
        {
            Id = Guid.NewGuid(),
            User = user,
            Message = message,
            Timestamp = DateTime.UtcNow
        };

        _messages.Add(chatMessage);
        return await Task.FromResult(chatMessage);
    }

    public async Task<IEnumerable<ChatMessage>> GetRecentMessagesAsync(int count = 50)
    {
        return await Task.FromResult(_messages.OrderByDescending(m => m.Timestamp).Take(count).Reverse());
    }

    public async Task<Chat> CreateChatAsync(string name, string creator, string[] participants)
    {
        var chat = new Chat
        {
            Id = Guid.NewGuid().ToString(),
            Name = name,
            Creator = creator,
            Participants = new List<string>(participants) { creator },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _chats.Add(chat);
        return await Task.FromResult(chat);
    }
}
