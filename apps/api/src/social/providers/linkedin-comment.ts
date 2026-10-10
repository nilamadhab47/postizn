export function linkedInCommentUrl(postUrn: string) {
  return `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`;
}

export function linkedInCommentBody(actorUrn: string, postUrn: string, text: string) {
  return {
    actor: actorUrn,
    object: postUrn,
    message: { text },
  };
}
