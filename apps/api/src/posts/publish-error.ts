export function publicPublishError(raw: string | null | undefined) {
  if (!raw?.trim()) return "Could not publish to this channel.";
  const text = raw.toLowerCase();
  if (
    text.includes("reconnect") ||
    text.includes("expired") ||
    text.includes("unauthorized") ||
    text.includes("401") ||
    text.includes("403") ||
    text.includes("token")
  ) {
    return "This channel needs to be reconnected.";
  }
  if (text.includes("rate") || text.includes("429") || text.includes("too many")) {
    return "That network asked us to wait. Try again in a bit.";
  }
  if (
    text.includes("timeout") ||
    text.includes("network") ||
    text.includes("fetch failed") ||
    text.includes("econn")
  ) {
    return "Could not reach that network. Try again.";
  }
  if (
    text.includes("media") ||
    text.includes("image") ||
    text.includes("gif") ||
    text.includes("upload") ||
    text.includes("invalid request")
  ) {
    return "The image could not be sent with this post.";
  }
  if (text.includes("character") || text.includes("too long") || text.includes("length")) {
    return "The text is too long for this channel.";
  }
  return "Could not publish to this channel.";
}
