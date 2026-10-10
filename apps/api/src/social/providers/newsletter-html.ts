export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function newsletterHtml(
  text: string,
  images: Array<{ url: string; alt?: string }> = [],
) {
  const blocks = text
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`);
  const media = images
    .filter((item) => item.url)
    .map((item) => {
      const alt = escapeHtml(item.alt ?? "");
      return `<p><img src="${escapeHtml(item.url)}" alt="${alt}" /></p>`;
    });
  const inner = [...blocks, ...media].join("") || "<p></p>";
  return `<div>${inner}</div>`;
}

export function newsletterFrom(email: string, name?: string | null) {
  const address = email.trim();
  const label = (name ?? "").trim();
  if (!label) return address;
  return `${label} <${address}>`;
}
