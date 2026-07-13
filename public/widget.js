(function () {
  "use strict";

  if (window.AgentCoreWidget && window.AgentCoreWidget.loaded) return;

  var script = document.currentScript;
  if (!script) return;

  var widgetKey = script.getAttribute("data-widget-key");
  var apiBase = (script.getAttribute("data-api-base") || "").replace(/\/+$/, "");

  if (!widgetKey || !apiBase) {
    console.error("AgentCore widget requires data-widget-key and data-api-base.");
    return;
  }

  var storageKey = "agentcore_widget_session_" + widgetKey;
  var rootHost = document.createElement("div");
  rootHost.id = "agentcore-widget-root";
  rootHost.setAttribute("data-agentcore-widget", widgetKey);
  document.body.appendChild(rootHost);

  var shadow = rootHost.attachShadow({ mode: "open" });
  var state = {
    config: null,
    conversation: null,
    session: readSession(),
    open: false,
    sending: false,
    error: "",
  };

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial}",
    "*,*:before,*:after{box-sizing:border-box}",
    ".ac-root{--ac-color:#2563eb;--ac-color-dark:#1d4ed8;position:fixed;right:24px;bottom:24px;z-index:2147483000;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;color:#172033;line-height:1.45}",
    ".ac-root.ac-left{right:auto;left:24px}",
    ".ac-launcher{height:56px;display:flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:0 20px;background:var(--ac-color);color:#fff;font:600 14px/1 inherit;box-shadow:0 14px 38px rgba(15,23,42,.24);cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,background .16s ease}",
    ".ac-launcher:hover{background:var(--ac-color-dark);transform:translateY(-1px);box-shadow:0 17px 42px rgba(15,23,42,.28)}",
    ".ac-launcher:focus-visible,.ac-close:focus-visible,.ac-send:focus-visible,.ac-retry:focus-visible,.ac-input:focus-visible{outline:3px solid rgba(14,165,233,.45);outline-offset:2px}",
    ".ac-launcher svg{width:21px;height:21px;flex:none}",
    ".ac-panel{position:absolute;right:0;bottom:70px;width:min(380px,calc(100vw - 32px));height:min(620px,calc(100vh - 112px));display:none;grid-template-rows:auto 1fr auto;overflow:hidden;border:1px solid #dbe4f0;border-radius:18px;background:#fff;box-shadow:0 24px 72px rgba(15,23,42,.23);transform-origin:bottom right}",
    ".ac-left .ac-panel{right:auto;left:0;transform-origin:bottom left}",
    ".ac-open .ac-panel{display:grid;animation:ac-in .18s ease-out}",
    ".ac-open .ac-launcher{display:none}",
    "@keyframes ac-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}",
    ".ac-header{display:flex;align-items:center;gap:11px;padding:15px 16px;background:var(--ac-color);color:#fff}",
    ".ac-avatar{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:50%;background:rgba(255,255,255,.18)}",
    ".ac-avatar svg{width:19px;height:19px}",
    ".ac-identity{min-width:0;flex:1}",
    ".ac-name{margin:0;overflow:hidden;font-size:14px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}",
    ".ac-presence{display:flex;align-items:center;gap:6px;margin:2px 0 0;color:rgba(255,255,255,.82);font-size:11px}",
    ".ac-presence:before{content:\"\";width:6px;height:6px;border-radius:50%;background:#86efac}",
    ".ac-close{width:34px;height:34px;display:grid;place-items:center;flex:none;border:0;border-radius:9px;background:transparent;color:#fff;cursor:pointer}",
    ".ac-close:hover{background:rgba(255,255,255,.13)}",
    ".ac-close svg{width:19px;height:19px}",
    ".ac-messages{overflow-y:auto;padding:16px;background:#f6f8fc;scroll-behavior:smooth}",
    ".ac-row{display:flex;margin:0 0 12px}",
    ".ac-row-user{justify-content:flex-end}",
    ".ac-bubble{max-width:84%;border-radius:14px;padding:10px 12px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word}",
    ".ac-row-assistant .ac-bubble{border:1px solid #e1e7f0;border-top-left-radius:4px;background:#fff;color:#334155;box-shadow:0 2px 7px rgba(15,23,42,.04)}",
    ".ac-row-user .ac-bubble{border-top-right-radius:4px;background:var(--ac-color);color:#fff}",
    ".ac-citations{margin-top:7px;color:#64748b;font-size:10px;font-weight:600}",
    ".ac-typing{display:flex;align-items:center;gap:4px;width:52px}",
    ".ac-typing i{width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:ac-dot 1.2s infinite ease-in-out}",
    ".ac-typing i:nth-child(2){animation-delay:.15s}.ac-typing i:nth-child(3){animation-delay:.3s}",
    "@keyframes ac-dot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}",
    ".ac-error{margin:0 0 12px;padding:10px 12px;border:1px solid #fecaca;border-radius:10px;background:#fff1f2;color:#b42318;font-size:11px}",
    ".ac-retry{margin-top:7px;border:0;background:transparent;color:#b42318;font-size:11px;font-weight:700;text-decoration:underline;cursor:pointer}",
    ".ac-composer{border-top:1px solid #e2e8f0;background:#fff;padding:12px}",
    ".ac-form{display:flex;align-items:flex-end;gap:8px}",
    ".ac-input{min-width:0;max-height:104px;flex:1;resize:none;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:10px 11px;color:#172033;font:400 13px/1.4 inherit;outline:0}",
    ".ac-input:focus{border-color:var(--ac-color);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac-color) 14%,transparent)}",
    ".ac-input::placeholder{color:#94a3b8}",
    ".ac-send{width:40px;height:40px;display:grid;place-items:center;flex:none;border:0;border-radius:10px;background:var(--ac-color);color:#fff;cursor:pointer}",
    ".ac-send:hover{background:var(--ac-color-dark)}.ac-send:disabled{cursor:not-allowed;opacity:.55}",
    ".ac-send svg{width:17px;height:17px}",
    ".ac-footer{margin-top:8px;text-align:center;color:#94a3b8;font-size:9px}",
    ".ac-hidden{display:none!important}",
    "@media(max-width:520px){.ac-root,.ac-root.ac-left{right:12px;bottom:12px;left:12px}.ac-launcher{margin-left:auto}.ac-left .ac-launcher{margin-right:auto;margin-left:0}.ac-panel,.ac-left .ac-panel{position:fixed;inset:12px;width:auto;height:auto;border-radius:16px}.ac-open .ac-panel{display:grid}.ac-open .ac-launcher{display:none}}",
    "@media(prefers-reduced-motion:reduce){.ac-panel,.ac-launcher,.ac-messages{animation:none!important;transition:none!important;scroll-behavior:auto}}",
  ].join("");
  shadow.appendChild(style);

  var root = document.createElement("div");
  root.className = "ac-root";
  root.innerHTML =
    '<section class="ac-panel" role="dialog" aria-label="Customer support chat" aria-modal="false">' +
    '<header class="ac-header"><div class="ac-avatar" aria-hidden="true">' + sparkleIcon() + '</div>' +
    '<div class="ac-identity"><p class="ac-name">AI Assistant</p><p class="ac-presence">Online</p></div>' +
    '<button class="ac-close" type="button" aria-label="Close chat">' + closeIcon() + '</button></header>' +
    '<main class="ac-messages" role="log" aria-live="polite" aria-relevant="additions"></main>' +
    '<footer class="ac-composer"><form class="ac-form"><textarea class="ac-input" rows="1" maxlength="2000" placeholder="Type your message..." aria-label="Message"></textarea>' +
    '<button class="ac-send" type="submit" aria-label="Send message">' + sendIcon() + '</button></form>' +
    '<div class="ac-footer">Powered by AgentCore</div></footer></section>' +
    '<button class="ac-launcher" type="button" aria-label="Open support chat">' + chatIcon() + '<span>Chat with us</span></button>';
  shadow.appendChild(root);

  var panel = root.querySelector(".ac-panel");
  var launcher = root.querySelector(".ac-launcher");
  var closeButton = root.querySelector(".ac-close");
  var messages = root.querySelector(".ac-messages");
  var form = root.querySelector(".ac-form");
  var input = root.querySelector(".ac-input");
  var sendButton = root.querySelector(".ac-send");

  launcher.addEventListener("click", openWidget);
  closeButton.addEventListener("click", closeWidget);
  form.addEventListener("submit", onSubmit);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", autoSizeInput);

  window.AgentCoreWidget = {
    loaded: true,
    open: openWidget,
    close: closeWidget,
    destroy: destroyWidget,
  };

  loadConfig();

  async function loadConfig() {
    try {
      state.config = await apiRequest(
        "/customer-chat/widget/" + encodeURIComponent(widgetKey) + "/config",
      );
      applyConfig();
      await restoreConversation();
      renderMessages();
    } catch (error) {
      state.error = readableError(error, "Chat is currently unavailable.");
      renderMessages();
      launcher.disabled = true;
      launcher.title = state.error;
    }
  }

  function applyConfig() {
    var settings = state.config && state.config.settings ? state.config.settings : {};
    var primaryColor = validColor(settings.primaryColor) ? settings.primaryColor : "#2563eb";
    var position = settings.position === "bottom-left" ? "bottom-left" : "bottom-right";
    var name = validText(settings.assistantName, "AgentCore Assistant");
    var label = validText(settings.launcherLabel, "Chat with us");

    root.style.setProperty("--ac-color", primaryColor);
    root.style.setProperty("--ac-color-dark", darken(primaryColor));
    root.classList.toggle("ac-left", position === "bottom-left");
    root.querySelector(".ac-name").textContent = name;
    launcher.querySelector("span").textContent = label;
    launcher.setAttribute("aria-label", "Open chat with " + name);
  }

  async function restoreConversation() {
    if (!state.session || !state.session.conversationId || !state.session.visitorToken) return;

    try {
      state.conversation = await apiRequest(
        "/customer-chat/widget/conversations/" + encodeURIComponent(state.session.conversationId),
        { headers: { "x-visitor-token": state.session.visitorToken } },
      );
    } catch (error) {
      if (error && (error.status === 401 || error.status === 404)) clearSession();
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    var content = input.value.trim();
    if (!content || state.sending) return;

    state.sending = true;
    state.error = "";
    input.value = "";
    autoSizeInput();
    setSending(true);

    if (!state.conversation) {
      state.conversation = { messages: [] };
    }
    state.conversation.messages.push({
      id: "optimistic-" + Date.now(),
      role: "visitor",
      content: content,
      citations: [],
    });
    renderMessages(true);

    try {
      await ensureConversation();
      var response = await apiRequest(
        "/customer-chat/widget/conversations/" + encodeURIComponent(state.session.conversationId) + "/messages",
        {
          method: "POST",
          headers: { "x-visitor-token": state.session.visitorToken },
          body: { content: content },
        },
      );
      state.conversation = response.conversation;
    } catch (error) {
      state.error = readableError(error, "Your message could not be sent. Please try again.");
      removeOptimisticMessages();
      input.value = content;
      if (error && (error.status === 401 || error.status === 404)) clearSession();
    } finally {
      state.sending = false;
      setSending(false);
      renderMessages();
      input.focus();
    }
  }

  async function ensureConversation() {
    if (state.session && state.session.conversationId && state.session.visitorToken) return;

    var visitorId = createId();
    var created = await apiRequest(
      "/customer-chat/widget/" + encodeURIComponent(widgetKey) + "/conversations",
      {
        method: "POST",
        body: {
          visitorId: visitorId,
          metadata: {
            source: "embedded_widget",
            pageUrl: window.location.href,
            pageTitle: document.title,
            referrer: document.referrer || undefined,
          },
        },
      },
    );

    state.session = {
      conversationId: created.conversation.id,
      visitorToken: created.visitorToken,
    };
    writeSession(state.session);
  }

  function renderMessages(showTyping) {
    while (messages.firstChild) messages.removeChild(messages.firstChild);

    var conversationMessages =
      state.conversation && Array.isArray(state.conversation.messages)
        ? state.conversation.messages
        : [];

    if (!conversationMessages.length && state.config) {
      appendBubble("assistant", state.config.greetingText || "Hi! How can I help you today?", []);
    } else {
      conversationMessages.forEach(function (message) {
        appendBubble(message.role, message.content, message.citations || []);
      });
    }

    if (showTyping) appendTyping();
    if (state.error) appendError(state.error);
    window.requestAnimationFrame(function () {
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function appendBubble(role, content, citations) {
    if (role !== "visitor" && role !== "assistant" && role !== "agent") return;
    var row = document.createElement("div");
    var isUser = role === "visitor";
    row.className = "ac-row " + (isUser ? "ac-row-user" : "ac-row-assistant");
    var bubble = document.createElement("div");
    bubble.className = "ac-bubble";
    var text = document.createElement("div");
    text.textContent = content || "";
    bubble.appendChild(text);
    if (citations.length) {
      var citation = document.createElement("div");
      citation.className = "ac-citations";
      citation.textContent =
        "Grounded in " + citations.length + " knowledge source" + (citations.length === 1 ? "" : "s");
      bubble.appendChild(citation);
    }
    row.appendChild(bubble);
    messages.appendChild(row);
  }

  function appendTyping() {
    var row = document.createElement("div");
    row.className = "ac-row ac-row-assistant";
    var bubble = document.createElement("div");
    bubble.className = "ac-bubble ac-typing";
    bubble.setAttribute("aria-label", "Assistant is typing");
    bubble.innerHTML = "<i></i><i></i><i></i>";
    row.appendChild(bubble);
    messages.appendChild(row);
  }

  function appendError(message) {
    var error = document.createElement("div");
    error.className = "ac-error";
    error.textContent = message;
    messages.appendChild(error);
  }

  function setSending(sending) {
    sendButton.disabled = sending;
    input.disabled = sending;
  }

  function removeOptimisticMessages() {
    if (!state.conversation || !Array.isArray(state.conversation.messages)) return;
    state.conversation.messages = state.conversation.messages.filter(function (message) {
      return String(message.id || "").indexOf("optimistic-") !== 0;
    });
  }

  function openWidget() {
    state.open = true;
    root.classList.add("ac-open");
    panel.setAttribute("aria-modal", "true");
    launcher.setAttribute("aria-expanded", "true");
    window.setTimeout(function () { input.focus(); }, 40);
  }

  function closeWidget() {
    state.open = false;
    root.classList.remove("ac-open");
    panel.setAttribute("aria-modal", "false");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  function destroyWidget() {
    rootHost.remove();
    try { delete window.AgentCoreWidget; } catch { window.AgentCoreWidget = undefined; }
  }

  function autoSizeInput() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 104) + "px";
  }

  async function apiRequest(path, options) {
    options = options || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    var response = await fetch(apiBase + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      mode: "cors",
      credentials: "omit",
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var error = new Error(payload.message || "Request failed");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function readSession() {
    try {
      var value = localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function writeSession(session) {
    try { localStorage.setItem(storageKey, JSON.stringify(session)); } catch {}
  }

  function clearSession() {
    state.session = null;
    state.conversation = null;
    try { localStorage.removeItem(storageKey); } catch {}
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "visitor-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  function validText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim().slice(0, 60) : fallback;
  }

  function validColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }

  function darken(hex) {
    var value = hex.replace("#", "");
    var channels = [0, 2, 4].map(function (index) {
      return Math.max(0, Math.round(parseInt(value.slice(index, index + 2), 16) * 0.82));
    });
    return "#" + channels.map(function (channel) { return channel.toString(16).padStart(2, "0"); }).join("");
  }

  function readableError(error, fallback) {
    if (error && error.status === 403) return "This website is not authorized to use the chat widget.";
    if (error && error.status === 429) return "Too many requests. Please wait a moment and try again.";
    return fallback;
  }

  function chatIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>';
  }
  function sendIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  }
  function closeIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  }
  function sparkleIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9Z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></svg>';
  }
})();
