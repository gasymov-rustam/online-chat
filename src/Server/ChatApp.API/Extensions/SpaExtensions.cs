using System.Diagnostics;
using ChatApp.API.Configuration;

namespace ChatApp.API.Extensions;

public static class SpaExtensions
{
    public static IServiceCollection AddSpaStaticFiles(this IServiceCollection services, IConfiguration configuration)
    {
        var spaConfig = configuration.GetSection("Spa").Get<SpaConfiguration>();
        if (spaConfig?.UseProxy == true)
        {
            services.AddReverseProxy()
                .LoadFromConfig(configuration.GetSection("ReverseProxy"));
        }
        return services;
    }

    public static void UseSpaDevServer(this IApplicationBuilder app, IConfiguration configuration)
    {
        var spaConfig = configuration.GetSection("Spa").Get<SpaConfiguration>();
        if (spaConfig?.UseProxy == true && !string.IsNullOrEmpty(spaConfig.StartupCommand))
        {
            var workingDirectory = Path.Combine(Directory.GetCurrentDirectory(), "../../Client");
            var processInfo = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c {spaConfig.StartupCommand}",
                WorkingDirectory = workingDirectory,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var process = new Process { StartInfo = processInfo };
            process.OutputDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                    Console.WriteLine($"SPA: {e.Data}");
            };
            process.ErrorDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                    Console.WriteLine($"SPA Error: {e.Data}");
            };

            try
            {
                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to start SPA dev server: {ex.Message}");
            }
        }
    }
}
