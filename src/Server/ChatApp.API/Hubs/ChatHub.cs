using ChatApp.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace ChatApp.API.Hubs;

public class ChatHub : Hub
{
    private readonly IChatService _chatService;
    private static readonly Dictionary<string, string> _userConnections = new();

    public ChatHub(IChatService chatService)
    {
        _chatService = chatService;
    }

    public override async Task OnConnectedAsync()
    {
        var username = Context.GetHttpContext()?.Request.Query["username"].ToString();
        if (!string.IsNullOrEmpty(username))
        {
            _userConnections[Context.ConnectionId] = username;
            await Clients.All.SendAsync("UserJoined", username);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_userConnections.TryGetValue(Context.ConnectionId, out var username))
        {
            _userConnections.Remove(Context.ConnectionId);
            await Clients.All.SendAsync("UserLeft", username);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinChat(string chatId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, chatId);
        if (_userConnections.TryGetValue(Context.ConnectionId, out var username))
        {
            await Clients.Group(chatId).SendAsync("UserJoined", username);
        }
    }

    public async Task LeaveChat(string chatId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, chatId);
        if (_userConnections.TryGetValue(Context.ConnectionId, out var username))
        {
            await Clients.Group(chatId).SendAsync("UserLeft", username);
        }
    }

    public async Task SendMessage(string chatId, string message)
    {
        if (_userConnections.TryGetValue(Context.ConnectionId, out var username))
        {
            var chatMessage = await _chatService.CreateMessageAsync(username, message);
            await Clients.Group(chatId).SendAsync("ReceiveMessage", username, message);
        }
    }

    public async Task<string> CreateChat(string name, string[] participants)
    {
        if (_userConnections.TryGetValue(Context.ConnectionId, out var creator))
        {
            var chat = await _chatService.CreateChatAsync(name, creator, participants);
            await Clients.All.SendAsync("ChatCreated", chat);
            return chat.Id;
        }
        throw new HubException("User not found");
    }
}
