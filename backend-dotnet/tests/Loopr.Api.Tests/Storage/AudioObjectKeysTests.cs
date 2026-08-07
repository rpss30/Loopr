using Loopr.Api.Storage;

namespace Loopr.Api.Tests.Storage;

public sealed class AudioObjectKeysTests
{
    [Fact]
    public void BuildTrackAudioObjectKeyUsesDefaultExtension()
    {
        var key = AudioObjectKeys.BuildTrackAudioObjectKey(
            new TrackAudioObjectKeyInput("project-1", "session-1", "track-1")
        );

        Assert.Equal("projects/project-1/sessions/session-1/tracks/track-1.m4a", key);
    }

    [Fact]
    public void BuildTrackAudioObjectKeySupportsCustomExtensions()
    {
        var key = AudioObjectKeys.BuildTrackAudioObjectKey(
            new TrackAudioObjectKeyInput("project-1", "session-1", "track-1", ".wav")
        );

        Assert.Equal("projects/project-1/sessions/session-1/tracks/track-1.wav", key);
    }

    [Fact]
    public void BuildTrackAudioObjectPrefixUsesProjectAndSession()
    {
        var prefix = AudioObjectKeys.BuildTrackAudioObjectPrefix("project-1", "session-1");

        Assert.Equal("projects/project-1/sessions/session-1/tracks", prefix);
    }

    [Fact]
    public void BuildTrackAudioObjectKeyTrimsAndUrlEncodesSegments()
    {
        var key = AudioObjectKeys.BuildTrackAudioObjectKey(
            new TrackAudioObjectKeyInput(" project 1 ", "session/1", "track 1")
        );

        Assert.Equal("projects/project%201/sessions/session%2F1/tracks/track%201.m4a", key);
    }

    [Fact]
    public void BuildTrackAudioObjectKeyRejectsEmptySegments()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            AudioObjectKeys.BuildTrackAudioObjectKey(
                new TrackAudioObjectKeyInput("", "session-1", "track-1")
            )
        );

        Assert.Equal("S3 object key segments must not be empty.", error.Message);
    }

    [Fact]
    public void BuildTrackAudioObjectKeyRejectsInvalidExtensions()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            AudioObjectKeys.BuildTrackAudioObjectKey(
                new TrackAudioObjectKeyInput("project-1", "session-1", "track-1", "../m4a")
            )
        );

        Assert.Equal("Audio file extension must be alphanumeric.", error.Message);
    }
}
