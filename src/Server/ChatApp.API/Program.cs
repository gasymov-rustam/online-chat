using ChatApp.API.Extensions;
using ChatApp.API.Hubs;
using ChatApp.Application;
using ChatApp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Application and Infrastructure services
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", builder => builder
        .WithOrigins("http://localhost:3000")
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
});

// Add SPA configuration
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSpaStaticFiles(builder.Configuration);
}

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("CorsPolicy");
app.UseAuthorization();

// Map endpoints
app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

// Configure SPA in development mode
if (app.Environment.IsDevelopment())
{
    app.UseSpaDevServer(builder.Configuration);
    app.MapReverseProxy();
}

app.Run();
