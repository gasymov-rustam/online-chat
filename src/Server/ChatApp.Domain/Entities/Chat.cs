namespace ChatApp.Domain.Entities;

public class Chat
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Creator { get; set; } = string.Empty;
    public List<string> Participants { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
