using System.Globalization;
using Amazon.DynamoDBv2.Model;
using Loopr.Api.Serialization;

namespace Loopr.Api.Repositories;

internal static class DynamoDbAttributeMap
{
    public static AttributeValue String(string value)
    {
        return new AttributeValue { S = value };
    }

    public static AttributeValue Number(int value)
    {
        return new AttributeValue { N = value.ToString(CultureInfo.InvariantCulture) };
    }

    public static AttributeValue Number(double value)
    {
        return new AttributeValue { N = value.ToString(CultureInfo.InvariantCulture) };
    }

    public static AttributeValue Boolean(bool value)
    {
        return new AttributeValue { BOOL = value };
    }

    public static AttributeValue Timestamp(DateTimeOffset timestamp)
    {
        return String(IsoTimestamp.Format(timestamp));
    }

    public static string ReadString(
        Dictionary<string, AttributeValue> item,
        string attributeName
    )
    {
        return item[attributeName].S ?? "";
    }

    public static int ReadInt(Dictionary<string, AttributeValue> item, string attributeName)
    {
        return int.Parse(item[attributeName].N ?? "0", CultureInfo.InvariantCulture);
    }

    public static double ReadDouble(
        Dictionary<string, AttributeValue> item,
        string attributeName
    )
    {
        return double.Parse(item[attributeName].N ?? "0", CultureInfo.InvariantCulture);
    }

    public static bool ReadBoolean(
        Dictionary<string, AttributeValue> item,
        string attributeName
    )
    {
        return item[attributeName].BOOL == true;
    }

    public static DateTimeOffset ReadTimestamp(
        Dictionary<string, AttributeValue> item,
        string attributeName
    )
    {
        return DateTimeOffset.Parse(
            ReadString(item, attributeName),
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal
        );
    }
}
