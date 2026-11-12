# Canvas embeds

In the canvas Share dialog, enable the view-only link and choose **Copy embed code**.
Paste the HTML into a website or a post editor that permits iframes. Change the
iframe height to suit the surrounding page; its width defaults to 100%.

The theme button switches between light and dark mode. Embeds use the visitor's
saved NovaStage theme, or follow the system theme when no preference is saved.
Cross-origin host pages cannot expose their own theme automatically to the iframe.

The embed allows zooming, panning, fitting the canvas, and opening component
details. It has no editing controls and exposes the same allowlisted content as
the public share link, including canvas notes and resource configuration. Project
names, members, claims, and author identities are excluded.

Saved changes appear automatically, normally within five seconds, without
reloading or resetting the visitor's view. Temporary connection failures retain
the last displayed canvas and show a reconnecting message. Disabling the share
link removes the embedded content on its next successful check. Enabling sharing
again creates a new token, requiring a new embed code.

Embeds use `/share/{token}/embed` and refresh through the GET-only
`/share/{token}/data` endpoint. Each refresh validates the share token server-side
and uses the existing public data allowlist. Visitors receive no private-table
subscriptions or write capability. Both routes bypass session refresh and return
no-store and no-referrer headers. The embed route permits framing by any website.
