/**
 * "Built by TaylorURL" credit link. Renders identically across every TaylorURL
 * Vercel site — only the resolved theme tokens differ per palette. Plain text,
 * no chrome; muted by default, transitions to the accent on hover/focus.
 */
export default function BuiltByBadge() {
  return (
    <div className="flex justify-center py-3 sm:py-4">
      <a
        href="https://www.taylorurl.com"
        target="_blank"
        rel="noopener noreferrer"
        className="group rounded-sm text-xs tracking-wider text-text-muted transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-accent-bright focus-visible:text-accent-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Built by <span className="font-medium">TaylorURL</span>
      </a>
    </div>
  )
}
