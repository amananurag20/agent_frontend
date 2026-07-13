# AgentCore Console

Next.js operations console and embeddable customer-chat widget for AgentCore.

## Local development

```bash
npm install
npm run dev
```

The console runs at `http://localhost:3000` by default.

## Environment

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

The booking page and `widget.js` are served by the frontend itself, so their
public URLs are derived from the current console origin.

## Installing the website widget

Configure and enable the widget in **Console > Widget**, add each exact allowed
website origin, then paste the generated snippet before the closing `body` tag:

```html
<script
  src="https://console.example.com/widget.js"
  data-widget-key="YOUR_WIDGET_KEY"
  data-api-base="https://api.example.com/api/v1"
  defer
></script>
```

The loader uses Shadow DOM to isolate its styles and `localStorage` to preserve a
visitor conversation across page navigation. The widget key is a public tenant
identifier; conversation access is protected by a separate random visitor token.

For production deployments:

- Serve the script and API over HTTPS.
- Keep the Widget allowed-domain list restricted to real customer origins.
- Ensure API CORS permits those origins. If `CORS_ORIGINS` is restricted, include
  every website that embeds the widget.
- If the customer website uses Content Security Policy, allow the script host in
  `script-src` and the API host in `connect-src`.

The host page can control the loaded widget with:

```js
window.AgentCoreWidget.open();
window.AgentCoreWidget.close();
window.AgentCoreWidget.destroy();
```

## Verification

```bash
npm run lint
npm run build
node --check public/widget.js
```
