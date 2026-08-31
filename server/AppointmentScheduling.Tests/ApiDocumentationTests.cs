using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;

namespace AppointmentScheduling.Tests;

public sealed class ApiDocumentationTests :
    IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ApiDocumentationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureLogging(logging => logging.ClearProviders());
        });
    }

    [Fact]
    public async Task SwaggerUi_IsAvailableInDevelopment()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/swagger/index.html");
        var content = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("GP Appointment Scheduling API", content);
    }

    [Fact]
    public async Task OpenApiDocument_DescribesEveryApiOperation()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");
        await using var contentStream = await response.Content.ReadAsStreamAsync();
        using var document = await JsonDocument.ParseAsync(contentStream);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "GP Appointment Scheduling API",
            document.RootElement
                .GetProperty("info")
                .GetProperty("title")
                .GetString());

        var paths = document.RootElement.GetProperty("paths");
        AssertOperationHasSummary(paths, "/api/clinicians", "get");
        AssertOperationHasSummary(paths, "/api/slots", "get");
        AssertOperationHasSummary(paths, "/api/bookings", "post");
        AssertOperationHasSummary(
            paths,
            "/api/bookings/{bookingReference}",
            "get");
        AssertOperationHasSummary(
            paths,
            "/api/bookings/{bookingReference}/cancel",
            "post");
        AssertOperationHasSummary(paths, "/api/staff/sessions", "post");
        AssertOperationHasSummary(
            paths,
            "/api/staff/unavailable-periods",
            "post");
        AssertOperationHasSummary(paths, "/api/staff/bookings", "get");
    }

    [Fact]
    public async Task UnknownApiRoute_ReturnsProblemDetailsInProduction()
    {
        using var productionFactory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Production");
                builder.ConfigureLogging(logging => logging.ClearProviders());
            });
        using var client = productionFactory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost")
            });

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "/api/unknown-route");
        request.Headers.Accept.ParseAdd("application/json");

        var response = await client.SendAsync(request);
        await using var contentStream = await response.Content.ReadAsStreamAsync();
        using var document = await JsonDocument.ParseAsync(contentStream);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(
            "application/problem+json",
            response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(
            StatusCodes.Status404NotFound,
            document.RootElement.GetProperty("status").GetInt32());
    }

    private static void AssertOperationHasSummary(
        JsonElement paths,
        string path,
        string method)
    {
        var operation = paths.GetProperty(path).GetProperty(method);

        Assert.False(
            string.IsNullOrWhiteSpace(
                operation.GetProperty("summary").GetString()),
            $"{method.ToUpperInvariant()} {path} is missing a summary.");
        Assert.False(
            string.IsNullOrWhiteSpace(
                operation.GetProperty("description").GetString()),
            $"{method.ToUpperInvariant()} {path} is missing a description.");
    }
}
