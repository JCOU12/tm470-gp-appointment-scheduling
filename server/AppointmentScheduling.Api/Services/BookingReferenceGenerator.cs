using System.Security.Cryptography;

namespace AppointmentScheduling.Api.Services;

public sealed class BookingReferenceGenerator
{
    public const string Prefix = "APT-";
    public const int RandomCharacterCount = 8;

    private const string Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    public string Generate()
    {
        var randomCharacters = Enumerable.Range(0, RandomCharacterCount)
            .Select(_ => Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)]);

        return Prefix + string.Concat(randomCharacters);
    }

    public static bool IsValid(string reference)
    {
        return reference.Length == Prefix.Length + RandomCharacterCount
            && reference.StartsWith(Prefix, StringComparison.Ordinal)
            && reference[Prefix.Length..].All(Alphabet.Contains);
    }
}
