using ChatApp.Domain.Entities;

namespace ChatApp.Application.Interfaces;

public interface IChatService
{
    Task<ChatMessage> CreateMessageAsync(string user, string message);
    Task<IEnumerable<ChatMessage>> GetRecentMessagesAsync(int count = 50);
    Task<Chat> CreateChatAsync(string name, string creator, string[] participants);
}
