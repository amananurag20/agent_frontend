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
    refreshing: false,
    socket: null,
    socketReady: false,
    socketClientPromise: null,
    configRefreshPromise: null,
    configLoadedAt: 0,
    activeClientMessageId: null,
    streamingContent: "",
    leadCaptureComplete: Boolean(readSession()),
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
    ".ac-launcher:focus-visible,.ac-close:focus-visible,.ac-new-chat:focus-visible,.ac-send:focus-visible,.ac-handoff:focus-visible,.ac-retry:focus-visible,.ac-confirm-button:focus-visible,.ac-input:focus-visible{outline:3px solid rgba(14,165,233,.45);outline-offset:2px}",
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
    ".ac-header-actions{display:flex;align-items:center;gap:2px}",
    ".ac-close,.ac-new-chat{height:34px;display:grid;place-items:center;flex:none;border:0;border-radius:9px;background:transparent;color:#fff;cursor:pointer}",
    ".ac-close{width:34px}.ac-new-chat{width:auto;grid-auto-flow:column;gap:6px;padding:0 9px;font:650 11px/1 inherit}",
    ".ac-close:hover,.ac-new-chat:hover{background:rgba(255,255,255,.13)}",
    ".ac-close svg,.ac-new-chat svg{width:18px;height:18px}",
    ".ac-new-chat:disabled{cursor:not-allowed;opacity:.5}",
    ".ac-messages{overflow-y:auto;padding:16px;background:#f6f8fc;scroll-behavior:smooth}",
    ".ac-row{display:flex;margin:0 0 12px}",
    ".ac-row-user{justify-content:flex-end}",
    ".ac-bubble{max-width:84%;border-radius:14px;padding:10px 12px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word}",
    ".ac-markdown{white-space:normal}.ac-markdown p{margin:0 0 8px}.ac-markdown p:last-child{margin-bottom:0}.ac-markdown h1,.ac-markdown h2,.ac-markdown h3{margin:8px 0 5px;font-size:1em;font-weight:700}.ac-markdown ul,.ac-markdown ol{margin:5px 0 8px;padding-left:20px}.ac-markdown pre{overflow:auto;margin:7px 0;border-radius:7px;background:#0f172a;padding:9px;color:#e2e8f0;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.ac-markdown code{border-radius:4px;background:#e9eef6;padding:1px 4px;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}.ac-markdown pre code{background:transparent;padding:0;color:inherit}",
    ".ac-row-assistant .ac-bubble{border:1px solid #e1e7f0;border-top-left-radius:4px;background:#fff;color:#334155;box-shadow:0 2px 7px rgba(15,23,42,.04)}",
    ".ac-row-user .ac-bubble{border-top-right-radius:4px;background:var(--ac-color);color:#fff}",
    ".ac-citations{margin-top:7px;color:#64748b;font-size:10px;font-weight:600}",
    ".ac-typing{display:flex;align-items:center;gap:5px;width:auto;color:#64748b}",
    ".ac-thinking-label{margin-right:2px;font-size:11px;font-weight:600}",
    ".ac-typing i{width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:ac-dot 1.2s infinite ease-in-out}",
    ".ac-typing i:nth-child(2){animation-delay:.15s}.ac-typing i:nth-child(3){animation-delay:.3s}",
    "@keyframes ac-dot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-3px);opacity:1}}",
    ".ac-error{margin:0 0 12px;padding:10px 12px;border:1px solid #fecaca;border-radius:10px;background:#fff1f2;color:#b42318;font-size:11px}",
    ".ac-lead-card{margin-top:12px;border:1px solid #dbe4f0;border-radius:14px;background:#fff;padding:14px;box-shadow:0 3px 12px rgba(15,23,42,.05)}",
    ".ac-lead-title{margin:0;color:#172033;font-size:14px;font-weight:700}",
    ".ac-lead-copy{margin:4px 0 13px;color:#64748b;font-size:11px;line-height:1.5}",
    ".ac-lead-form{display:grid;gap:11px}",
    ".ac-lead-label,.ac-lead-legend{display:block;margin:0 0 5px;color:#334155;font-size:11px;font-weight:650}",
    ".ac-lead-control{width:100%;min-height:38px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:8px 10px;color:#172033;font:400 12px/1.4 inherit;outline:0}",
    ".ac-lead-control:focus{border-color:var(--ac-color);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac-color) 14%,transparent)}",
    "textarea.ac-lead-control{min-height:70px;resize:vertical}",
    ".ac-lead-options{display:flex;flex-wrap:wrap;gap:8px 12px}",
    ".ac-lead-choice{display:flex;align-items:flex-start;gap:7px;color:#334155;font-size:12px}",
    ".ac-lead-choice input{margin-top:2px}",
    ".ac-lead-submit{min-height:40px;border:0;border-radius:9px;background:var(--ac-color);color:#fff;font:650 12px/1 inherit;cursor:pointer}",
    ".ac-lead-submit:hover{background:var(--ac-color-dark)}.ac-lead-submit:disabled{cursor:not-allowed;opacity:.55}",
    ".ac-lead-skip{border:0;background:transparent;color:#64748b;font:600 11px/1.3 inherit;cursor:pointer;text-decoration:underline}",
    ".ac-retry{margin-top:7px;border:0;background:transparent;color:#b42318;font-size:11px;font-weight:700;text-decoration:underline;cursor:pointer}",
    ".ac-composer{border-top:1px solid #e2e8f0;background:#fff;padding:12px}",
    ".ac-form{display:flex;align-items:flex-end;gap:8px}",
    ".ac-input{min-width:0;max-height:104px;flex:1;resize:none;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:10px 11px;color:#172033;font:400 13px/1.4 inherit;outline:0}",
    ".ac-input:focus{border-color:var(--ac-color);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac-color) 14%,transparent)}",
    ".ac-input::placeholder{color:#94a3b8}",
    ".ac-send{width:40px;height:40px;display:grid;place-items:center;flex:none;border:0;border-radius:10px;background:var(--ac-color);color:#fff;cursor:pointer}",
    ".ac-send:hover{background:var(--ac-color-dark)}.ac-send:disabled{cursor:not-allowed;opacity:.55}",
    ".ac-send.ac-stop{background:#dc2626}.ac-send.ac-stop:hover{background:#b91c1c}",
    ".ac-send svg{width:17px;height:17px}",
    ".ac-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}",
    ".ac-handoff{border:0;background:transparent;padding:2px;color:#64748b;font:600 10px/1.3 inherit;cursor:pointer}",
    ".ac-handoff:hover{color:var(--ac-color);text-decoration:underline}.ac-handoff:disabled{cursor:default;color:#94a3b8;text-decoration:none}",
    ".ac-footer{margin-top:8px;text-align:center;color:#94a3b8;font-size:9px}",
    ".ac-confirm{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:rgba(15,23,42,.48);padding:22px}",
    ".ac-confirm-card{width:100%;border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:18px;box-shadow:0 18px 44px rgba(15,23,42,.24)}",
    ".ac-confirm-title{margin:0;color:#172033;font-size:15px;font-weight:700}",
    ".ac-confirm-copy{margin:7px 0 16px;color:#64748b;font-size:12px;line-height:1.55}",
    ".ac-confirm-actions{display:flex;justify-content:flex-end;gap:8px}",
    ".ac-confirm-button{min-height:38px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:0 13px;color:#334155;font:600 12px/1 inherit;cursor:pointer}",
    ".ac-confirm-button:hover{background:#f8fafc}.ac-confirm-button:disabled{cursor:not-allowed;opacity:.55}",
    ".ac-confirm-primary{border-color:var(--ac-color);background:var(--ac-color);color:#fff}",
    ".ac-confirm-primary:hover{background:var(--ac-color-dark)}",
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
    '<div class="ac-header-actions"><button class="ac-new-chat ac-hidden" type="button" aria-label="Start a new conversation" title="Start a new conversation">' + refreshIcon() + '<span>New chat</span></button>' +
    '<button class="ac-close" type="button" aria-label="Close chat">' + closeIcon() + '</button></div></header>' +
    '<main class="ac-messages" role="log" aria-live="polite" aria-relevant="additions"></main>' +
    '<footer class="ac-composer"><form class="ac-form"><textarea class="ac-input" rows="1" maxlength="2000" placeholder="Type your message..." aria-label="Message"></textarea>' +
    '<button class="ac-send" type="submit" aria-label="Send message">' + sendIcon() + '</button></form>' +
    '<div class="ac-actions"><button class="ac-handoff" type="button">Talk to a human</button><span class="ac-footer">Powered by AgentCore</span></div></footer>' +
    '<div class="ac-confirm ac-hidden" role="alertdialog" aria-modal="true" aria-labelledby="ac-confirm-title"><div class="ac-confirm-card">' +
    '<p class="ac-confirm-title" id="ac-confirm-title">Start a new conversation?</p>' +
    '<p class="ac-confirm-copy">This conversation will be closed and kept in support history. Your new chat will start with a clean context.</p>' +
    '<div class="ac-confirm-actions"><button class="ac-confirm-button ac-confirm-cancel" type="button">Cancel</button>' +
    '<button class="ac-confirm-button ac-confirm-primary ac-confirm-start" type="button">Start new</button></div></div></div></section>' +
    '<button class="ac-launcher" type="button" aria-label="Open support chat">' + chatIcon() + '<span>Chat with us</span></button>';
  shadow.appendChild(root);

  var panel = root.querySelector(".ac-panel");
  var launcher = root.querySelector(".ac-launcher");
  var closeButton = root.querySelector(".ac-close");
  var newChatButton = root.querySelector(".ac-new-chat");
  var confirmDialog = root.querySelector(".ac-confirm");
  var confirmCancelButton = root.querySelector(".ac-confirm-cancel");
  var confirmStartButton = root.querySelector(".ac-confirm-start");
  var messages = root.querySelector(".ac-messages");
  var composer = root.querySelector(".ac-composer");
  var form = root.querySelector(".ac-form");
  var input = root.querySelector(".ac-input");
  var sendButton = root.querySelector(".ac-send");
  var handoffButton = root.querySelector(".ac-handoff");

  launcher.addEventListener("click", openWidget);
  closeButton.addEventListener("click", closeWidget);
  newChatButton.addEventListener("click", showNewChatConfirmation);
  confirmCancelButton.addEventListener("click", hideNewChatConfirmation);
  confirmStartButton.addEventListener("click", startNewConversation);
  confirmDialog.addEventListener("click", function (event) {
    if (event.target === confirmDialog) hideNewChatConfirmation();
  });
  panel.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!confirmDialog.classList.contains("ac-hidden")) hideNewChatConfirmation();
    else closeWidget();
  });
  form.addEventListener("submit", onSubmit);
  sendButton.addEventListener("click", function (event) {
    if (!state.sending) return;
    event.preventDefault();
    cancelGeneration();
  });
  handoffButton.addEventListener("click", requestHandoff);
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
      await refreshWidgetConfig();
      await restoreConversation();
      state.leadCaptureComplete = Boolean(state.session) || activeLeadFields().length === 0;
      startRealtime();
      renderMessages();
    } catch (error) {
      state.error = readableError(error, "Chat is currently unavailable.");
      renderMessages();
      launcher.disabled = true;
      launcher.title = state.error;
    }
  }

  function refreshWidgetConfig() {
    if (state.configRefreshPromise) return state.configRefreshPromise;
    state.configRefreshPromise = apiRequest(
      "/customer-chat/widget/" + encodeURIComponent(widgetKey) + "/config",
      { cache: "no-store" },
    )
      .then(function (config) {
        state.config = config;
        state.configLoadedAt = Date.now();
        applyConfig();
        return config;
      })
      .finally(function () {
        state.configRefreshPromise = null;
      });
    return state.configRefreshPromise;
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
      var clientMessageId = createId();
      state.activeClientMessageId = clientMessageId;
      state.conversation.messages[state.conversation.messages.length - 1].id = "optimistic-" + clientMessageId;
      var socketReady = await ensureSocket(1500);
      if (socketReady) {
        state.socket.emit("message.send", {
          clientMessageId: clientMessageId,
          content: content,
        });
        return;
      }
      var response = await apiRequest(
        "/customer-chat/widget/conversations/" + encodeURIComponent(state.session.conversationId) + "/messages",
        {
          method: "POST",
          headers: { "x-visitor-token": state.session.visitorToken },
          body: { content: content, clientMessageId: clientMessageId },
        },
      );
      state.conversation = response.conversation;
    } catch (error) {
      state.error = readableError(error, "Your message could not be sent. Please try again.");
      removeOptimisticMessages();
      input.value = content;
      if (error && (error.status === 401 || error.status === 404)) clearSession();
    } finally {
      if (state.socketReady && state.activeClientMessageId) return;
      state.sending = false;
      state.activeClientMessageId = null;
      setSending(false);
      renderMessages();
      input.focus();
    }
  }

  async function ensureConversation(leadCapture) {
    if (state.session && state.session.conversationId && state.session.visitorToken) return;

    var visitorId = createId();
    var created = await apiRequest(
      "/customer-chat/widget/" + encodeURIComponent(widgetKey) + "/conversations",
      {
        method: "POST",
        body: {
          visitorId: visitorId,
          leadCapture: leadCapture || {},
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
    state.conversation = created.conversation;
    state.leadCaptureComplete = true;
    writeSession(state.session);
    startRealtime();
  }

  async function requestHandoff() {
    if (state.sending) return;
    state.sending = true;
    setSending(true);
    try {
      await ensureConversation();
      state.conversation = await apiRequest(
        "/customer-chat/widget/conversations/" + encodeURIComponent(state.session.conversationId) + "/handoff",
        {
          method: "PATCH",
          headers: { "x-visitor-token": state.session.visitorToken },
        },
      );
      renderMessages();
    } catch (error) {
      state.error = readableError(error, "A human agent could not be requested right now.");
      renderMessages();
    } finally {
      state.sending = false;
      setSending(false);
    }
  }

  function startRealtime() {
    if (!state.session || !state.session.conversationId || !state.session.visitorToken) return;
    if (state.socket && (state.socket.connected || state.socket.active)) return;
    void loadSocketClient().then(connectSocket).catch(function () {
      state.socketReady = false;
    });
  }

  function connectSocket() {
    if (!state.session || !window.io) return;
    if (state.socket) state.socket.disconnect();
    var details = socketDetails();
    var socket = window.io(details.origin, {
      path: details.path,
      auth: {
        conversationId: state.session.conversationId,
        visitorToken: state.session.visitorToken,
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 750,
      reconnectionDelayMax: 10000,
      timeout: 5000,
      forceNew: true,
    });
    state.socket = socket;
    socket.on("ready", function () {
      if (state.socket !== socket) return;
      state.socketReady = true;
    });
    socket.on("conversation.event", function (event) {
      handleSocketEvent(socket, "conversation.event", event);
    });
    ["message.started", "message.delta", "message.replace", "message.completed", "message.discarded", "message.cancelled", "message.error"].forEach(function (eventName) {
      socket.on(eventName, function (payload) {
        handleSocketEvent(socket, eventName, payload || {});
      });
    });
    socket.on("disconnect", function () {
      if (state.socket !== socket) return;
      state.socketReady = false;
      if (state.activeClientMessageId) void refreshConversation();
    });
    socket.on("connect_error", function (error) {
      if (state.socket !== socket) return;
      state.socketReady = false;
      var code = error && error.data ? error.data.code : "";
      if (code === "unauthorized" || code === "not_found") {
        clearSession();
      }
    });
  }

  function handleSocketEvent(socket, eventName, frame) {
    if (state.socket !== socket) return;
    if (eventName === "conversation.event") {
      void refreshConversation();
      return;
    }
    if (frame.clientMessageId && frame.clientMessageId !== state.activeClientMessageId) return;
    if (eventName === "message.started") {
      state.streamingContent = "";
      renderMessages(true);
      return;
    }
    if (eventName === "message.delta") {
      state.streamingContent += frame.delta || "";
      renderMessages(false);
      return;
    }
    if (eventName === "message.replace") {
      state.streamingContent = frame.content || "";
      renderMessages(false);
      return;
    }
    if (eventName === "message.completed") {
      state.conversation = frame.result && frame.result.conversation ? frame.result.conversation : state.conversation;
      finishGeneration();
      return;
    }
    if (eventName === "message.discarded") {
      state.conversation = frame.conversation || state.conversation;
      finishGeneration();
      void refreshConversation();
      return;
    }
    if (eventName === "message.cancelled") {
      finishGeneration();
      void refreshConversation();
      return;
    }
    if (eventName === "message.error") {
      state.error = frame.message || "The reply could not be completed.";
      finishGeneration();
    }
  }

  function finishGeneration() {
    state.sending = false;
    state.activeClientMessageId = null;
    state.streamingContent = "";
    setSending(false);
    renderMessages();
    input.focus();
  }

  function ensureSocket(timeoutMs) {
    startRealtime();
    if (state.socketReady) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var started = Date.now();
      var timer = window.setInterval(function () {
        if (state.socketReady || Date.now() - started >= timeoutMs) {
          window.clearInterval(timer);
          resolve(state.socketReady);
        }
      }, 50);
    });
  }

  function cancelGeneration() {
    if (!state.activeClientMessageId || !state.socketReady) return;
    state.socket.emit("message.cancel", {
      clientMessageId: state.activeClientMessageId,
    });
  }

  async function refreshConversation() {
    if (state.refreshing || !state.session) return;
    state.refreshing = true;
    try {
      state.conversation = await apiRequest(
        "/customer-chat/widget/conversations/" + encodeURIComponent(state.session.conversationId),
        { headers: { "x-visitor-token": state.session.visitorToken } },
      );
      renderMessages();
    } finally {
      state.refreshing = false;
    }
  }

  function renderMessages(showTyping) {
    while (messages.firstChild) messages.removeChild(messages.firstChild);

    if (!state.leadCaptureComplete && activeLeadFields().length) {
      appendBubble("assistant", state.config.greetingText || "Hi! How can I help you today?", []);
      appendLeadCaptureForm();
      composer.classList.add("ac-hidden");
      newChatButton.classList.add("ac-hidden");
      window.requestAnimationFrame(function () {
        messages.scrollTop = messages.scrollHeight;
      });
      return;
    }

    composer.classList.remove("ac-hidden");
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

    if (state.streamingContent) appendBubble("assistant", state.streamingContent, []);
    else if (showTyping || state.sending) appendTyping();
    if (state.error) appendError(state.error);
    newChatButton.classList.toggle("ac-hidden", !state.session);
    setSending(state.sending);
    window.requestAnimationFrame(function () {
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function appendBubble(role, content, citations) {
    if (role !== "visitor" && role !== "assistant" && role !== "agent" && role !== "system") return;
    var row = document.createElement("div");
    var isUser = role === "visitor";
    row.className = "ac-row " + (isUser ? "ac-row-user" : "ac-row-assistant");
    var bubble = document.createElement("div");
    bubble.className = "ac-bubble";
    var text = document.createElement("div");
    if (isUser) text.textContent = content || "";
    else renderMarkdown(text, content || "");
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
    bubble.setAttribute("aria-label", "Assistant is thinking");
    bubble.innerHTML = '<span class="ac-thinking-label">Thinking</span><i></i><i></i><i></i>';
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
    input.disabled = sending;
    newChatButton.disabled = sending;
    confirmCancelButton.disabled = sending;
    confirmStartButton.disabled = sending;
    confirmDialog.setAttribute("aria-busy", sending ? "true" : "false");
    confirmStartButton.textContent =
      sending && !confirmDialog.classList.contains("ac-hidden") ? "Starting..." : "Start new";
    sendButton.classList.toggle("ac-stop", sending);
    sendButton.setAttribute("aria-label", sending ? "Stop generating" : "Send message");
    sendButton.innerHTML = sending ? stopIcon() : sendIcon();
    handoffButton.disabled =
      sending || (state.conversation && state.conversation.status === "waiting_for_agent");
    handoffButton.textContent =
      state.conversation && state.conversation.status === "waiting_for_agent"
        ? "Human agent requested"
        : "Talk to a human";
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
    if (Date.now() - state.configLoadedAt > 15000) {
      void refreshWidgetConfig()
        .then(function () {
          if (!state.session) {
            state.leadCaptureComplete = activeLeadFields().length === 0;
            renderMessages();
          }
        })
        .catch(function () {
          // Keep the last known working configuration for an active visitor.
        });
    }
    window.setTimeout(function () {
      var firstLeadInput = messages.querySelector(".ac-lead-control, .ac-lead-choice input");
      if (firstLeadInput) firstLeadInput.focus();
      else input.focus();
    }, 40);
  }

  function closeWidget() {
    hideNewChatConfirmation();
    state.open = false;
    root.classList.remove("ac-open");
    panel.setAttribute("aria-modal", "false");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  function showNewChatConfirmation() {
    if (!state.session || state.sending) return;
    confirmDialog.classList.remove("ac-hidden");
    confirmStartButton.focus();
  }

  function hideNewChatConfirmation(force) {
    if (state.sending && force !== true) return;
    var shouldRestoreFocus =
      force !== true && !confirmDialog.classList.contains("ac-hidden") && state.open;
    confirmDialog.classList.add("ac-hidden");
    if (shouldRestoreFocus) newChatButton.focus();
  }

  async function startNewConversation() {
    if (!state.session || state.sending) return;
    state.sending = true;
    state.error = "";
    setSending(true);
    try {
      // Lead fields and appearance can change while an embedded page remains open.
      await refreshWidgetConfig();
      await apiRequest(
        "/customer-chat/widget/conversations/" + encodeURIComponent(state.session.conversationId) + "/close",
        {
          method: "PATCH",
          headers: { "x-visitor-token": state.session.visitorToken },
        },
      );
      hideNewChatConfirmation(true);
      clearSession();
    } catch (error) {
      state.error = readableError(error, "A new conversation could not be started. Please try again.");
      hideNewChatConfirmation(true);
    } finally {
      state.sending = false;
      setSending(false);
      renderMessages();
      if (state.leadCaptureComplete) input.focus();
    }
  }

  function destroyWidget() {
    if (state.socket) state.socket.disconnect();
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
      cache: options.cache || "default",
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
    if (state.socket) state.socket.disconnect();
    state.socket = null;
    state.socketReady = false;
    state.activeClientMessageId = null;
    state.streamingContent = "";
    state.session = null;
    state.conversation = null;
    state.leadCaptureComplete = activeLeadFields().length === 0;
    try { localStorage.removeItem(storageKey); } catch {}
  }

  function activeLeadFields() {
    return state.config && Array.isArray(state.config.leadFields)
      ? state.config.leadFields.filter(function (field) { return field && field.enabled; })
      : [];
  }

  function appendLeadCaptureForm() {
    var card = document.createElement("section");
    card.className = "ac-lead-card";
    var title = document.createElement("p");
    title.className = "ac-lead-title";
    title.textContent = "Before we start";
    var copy = document.createElement("p");
    copy.className = "ac-lead-copy";
    copy.textContent = "Share any details below so the team can identify and follow up with you.";
    var leadForm = document.createElement("form");
    leadForm.className = "ac-lead-form";
    var fields = activeLeadFields();
    fields.forEach(function (field) {
      leadForm.appendChild(createLeadField(field));
    });
    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "ac-lead-submit";
    submit.textContent = "Start conversation";
    leadForm.appendChild(submit);
    if (!fields.some(function (field) { return field.required; })) {
      var skip = document.createElement("button");
      skip.type = "button";
      skip.className = "ac-lead-skip";
      skip.textContent = "Continue without sharing details";
      skip.addEventListener("click", function () { void submitLeadCapture(leadForm, submit, {}); });
      leadForm.appendChild(skip);
    }
    leadForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var values = {};
      fields.forEach(function (field) {
        var control = leadForm.elements.namedItem(field.key);
        if (field.type === "checkbox") {
          if (control && control.checked) values[field.key] = true;
        } else if (field.type === "radio") {
          var selected = leadForm.querySelector('input[name="' + cssEscape(field.key) + '"]:checked');
          if (selected) values[field.key] = selected.value;
        } else {
          var value = control ? String(control.value || "").trim() : "";
          if (value && !(field.type === "number" && Number(value) === 0)) {
            values[field.key] = value;
          }
        }
      });
      void submitLeadCapture(leadForm, submit, values);
    });
    card.appendChild(title);
    card.appendChild(copy);
    card.appendChild(leadForm);
    messages.appendChild(card);
  }

  async function submitLeadCapture(leadForm, submit, values) {
    if (state.sending) return;
    state.sending = true;
    state.error = "";
    submit.disabled = true;
    submit.textContent = "Starting...";
    Array.prototype.forEach.call(leadForm.elements, function (element) { element.disabled = true; });
    try {
      await ensureConversation(values);
      renderMessages();
      input.focus();
    } catch (error) {
      state.error = readableError(error, "Your details could not be saved. Please try again.");
      renderMessages();
    } finally {
      state.sending = false;
      setSending(false);
    }
  }

  function createLeadField(field) {
    var wrapper = document.createElement(field.type === "radio" ? "fieldset" : "div");
    var label = document.createElement(field.type === "radio" ? "legend" : "label");
    var controlId = "agentcore-lead-" + field.key;
    label.className = field.type === "radio" ? "ac-lead-legend" : "ac-lead-label";
    label.textContent = field.label + (field.required ? " *" : "");
    if (field.type !== "radio") label.htmlFor = controlId;
    wrapper.appendChild(label);

    if (field.type === "checkbox") {
      var choice = document.createElement("label");
      choice.className = "ac-lead-choice";
      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = controlId;
      checkbox.name = field.key;
      checkbox.required = Boolean(field.required);
      choice.appendChild(checkbox);
      choice.appendChild(document.createTextNode(field.placeholder || "Yes"));
      wrapper.appendChild(choice);
      return wrapper;
    }

    if (field.type === "radio") {
      var options = document.createElement("div");
      options.className = "ac-lead-options";
      (field.options || []).forEach(function (option) {
        var radioLabel = document.createElement("label");
        radioLabel.className = "ac-lead-choice";
        var radio = document.createElement("input");
        radio.type = "radio";
        radio.name = field.key;
        radio.value = option;
        radio.required = Boolean(field.required);
        radioLabel.appendChild(radio);
        radioLabel.appendChild(document.createTextNode(option));
        options.appendChild(radioLabel);
      });
      wrapper.appendChild(options);
      return wrapper;
    }

    var control;
    if (field.type === "textarea") control = document.createElement("textarea");
    else if (field.type === "select") {
      control = document.createElement("select");
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Select an option";
      control.appendChild(empty);
      (field.options || []).forEach(function (option) {
        var optionNode = document.createElement("option");
        optionNode.value = option;
        optionNode.textContent = option;
        control.appendChild(optionNode);
      });
    } else {
      control = document.createElement("input");
      control.type = field.type === "phone" ? "tel" : field.type;
    }
    control.name = field.key;
    control.id = controlId;
    control.className = "ac-lead-control";
    control.required = Boolean(field.required);
    control.maxLength = field.type === "textarea" ? 2000 : 320;
    if (field.type === "phone") {
      control.pattern = "\\+[1-9][0-9 ()-]{7,24}";
      control.title = "Use an international number including country code, for example +1 650 253 0000";
      control.autocomplete = "tel";
    } else if (field.type === "email") {
      control.autocomplete = "email";
    }
    if (field.placeholder && field.type !== "select") control.placeholder = field.placeholder;
    wrapper.appendChild(control);
    return wrapper;
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function socketDetails() {
    var url = new URL(apiBase, window.location.href);
    return {
      origin: url.origin,
      path: url.pathname.replace(/\/+$/, "") + "/customer-chat/widget/socket.io",
      scriptUrl: url.origin + url.pathname.replace(/\/+$/, "") + "/customer-chat/widget/socket.io/socket.io.js",
    };
  }

  function loadSocketClient() {
    if (typeof window.io === "function") return Promise.resolve();
    if (state.socketClientPromise) return state.socketClientPromise;
    state.socketClientPromise = new Promise(function (resolve, reject) {
      var clientScript = document.createElement("script");
      clientScript.src = socketDetails().scriptUrl;
      clientScript.async = true;
      clientScript.onload = function () {
        if (typeof window.io === "function") resolve();
        else reject(new Error("Socket.IO client did not initialize"));
      };
      clientScript.onerror = function () {
        reject(new Error("Socket.IO client could not be loaded"));
      };
      document.head.appendChild(clientScript);
    }).catch(function (error) {
      state.socketClientPromise = null;
      throw error;
    });
    return state.socketClientPromise;
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
  function refreshIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0 2 5.3"/><path d="M20 4v7h-7"/></svg>';
  }
  function stopIcon() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>';
  }

  function renderMarkdown(container, value) {
    container.className = "ac-markdown";
    var lines = String(value || "").split("\n");
    var code = null;
    var list = null;
    lines.forEach(function (line) {
      if (/^```/.test(line.trim())) {
        if (code) { container.appendChild(code.pre); code = null; }
        else {
          var pre = document.createElement("pre");
          var codeNode = document.createElement("code");
          pre.appendChild(codeNode);
          code = { pre: pre, node: codeNode };
        }
        list = null;
        return;
      }
      if (code) {
        code.node.appendChild(document.createTextNode((code.node.textContent ? "\n" : "") + line));
        return;
      }
      var listMatch = line.match(/^\s*([-*]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        var tag = /\d+\./.test(listMatch[1]) ? "ol" : "ul";
        if (!list || list.tagName.toLowerCase() !== tag) {
          list = document.createElement(tag);
          container.appendChild(list);
        }
        var item = document.createElement("li");
        appendInlineMarkdown(item, listMatch[2]);
        list.appendChild(item);
        return;
      }
      list = null;
      var heading = line.match(/^(#{1,3})\s+(.+)$/);
      var node = document.createElement(heading ? "h" + heading[1].length : "p");
      appendInlineMarkdown(node, heading ? heading[2] : line);
      if (line || heading) container.appendChild(node);
    });
    if (code) container.appendChild(code.pre);
  }

  function appendInlineMarkdown(container, value) {
    var pattern = /(?:\*\*[^*]+\*\*|`[^`]+`)/g;
    var last = 0;
    String(value).replace(pattern, function (match, offset) {
      container.appendChild(document.createTextNode(value.slice(last, offset)));
      var node = document.createElement(match.slice(0, 2) === "**" ? "strong" : "code");
      node.textContent = match.slice(match.slice(0, 2) === "**" ? 2 : 1, match.slice(0, 2) === "**" ? -2 : -1);
      container.appendChild(node);
      last = offset + match.length;
      return match;
    });
    container.appendChild(document.createTextNode(value.slice(last)));
  }
  function sparkleIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9Z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></svg>';
  }
})();
