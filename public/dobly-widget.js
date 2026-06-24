(function () {
  var script = document.currentScript;
  var workspaceId = script && script.getAttribute("data-workspace-id");
  var apiBase = (script && script.getAttribute("data-api-base")) || "";
  var widgetKey = script && script.getAttribute("data-widget-key");
  if (!workspaceId || !widgetKey) return;

  var root = document.createElement("div");
  root.style.position = "fixed";
  root.style.right = "20px";
  root.style.bottom = "20px";
  root.style.zIndex = "2147483647";
  root.style.fontFamily = "Inter, system-ui, sans-serif";
  document.body.appendChild(root);

  var button = document.createElement("button");
  button.textContent = "Chat with us";
  button.style.border = "0";
  button.style.borderRadius = "999px";
  button.style.padding = "12px 16px";
  button.style.background = "#c4501a";
  button.style.color = "white";
  button.style.fontWeight = "700";
  button.style.boxShadow = "0 18px 50px rgba(0,0,0,.22)";
  button.style.cursor = "pointer";
  root.appendChild(button);

  var panel = document.createElement("div");
  panel.style.display = "none";
  panel.style.width = "340px";
  panel.style.maxWidth = "calc(100vw - 40px)";
  panel.style.marginBottom = "12px";
  panel.style.borderRadius = "20px";
  panel.style.overflow = "hidden";
  panel.style.background = "#121210";
  panel.style.color = "#f5ede4";
  panel.style.border = "1px solid rgba(245,237,228,.12)";
  panel.style.boxShadow = "0 24px 80px rgba(0,0,0,.34)";
  root.insertBefore(panel, button);

  var header = document.createElement("div");
  header.textContent = "Dobly Reception";
  header.style.padding = "14px 16px";
  header.style.fontWeight = "800";
  header.style.borderBottom = "1px solid rgba(245,237,228,.1)";
  panel.appendChild(header);

  var log = document.createElement("div");
  log.style.height = "260px";
  log.style.overflow = "auto";
  log.style.padding = "14px";
  log.style.fontSize = "14px";
  log.style.lineHeight = "1.45";
  panel.appendChild(log);

  var form = document.createElement("form");
  form.style.display = "flex";
  form.style.gap = "8px";
  form.style.padding = "12px";
  form.style.borderTop = "1px solid rgba(245,237,228,.1)";
  panel.appendChild(form);

  var input = document.createElement("input");
  input.placeholder = "Type your message...";
  input.style.flex = "1";
  input.style.border = "1px solid rgba(245,237,228,.12)";
  input.style.borderRadius = "12px";
  input.style.background = "rgba(255,255,255,.04)";
  input.style.color = "#f5ede4";
  input.style.padding = "10px 12px";
  input.style.outline = "none";
  form.appendChild(input);

  var send = document.createElement("button");
  send.textContent = "Send";
  send.style.border = "0";
  send.style.borderRadius = "12px";
  send.style.background = "#c4501a";
  send.style.color = "white";
  send.style.fontWeight = "700";
  send.style.padding = "0 12px";
  form.appendChild(send);

  function addLine(label, text) {
    var line = document.createElement("div");
    line.style.marginBottom = "10px";
    line.innerHTML = "<strong>" + label + ":</strong> " + String(text).replace(/[<>&]/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c];
    });
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  button.onclick = function () {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  };

  form.onsubmit = function (event) {
    event.preventDefault();
    var message = input.value.trim();
    if (!message) return;
    input.value = "";
    addLine("You", message);
    fetch(apiBase + "/api/chat/widget", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Dobly-Widget-Key": widgetKey },
      body: JSON.stringify({
        workspaceId: workspaceId,
        message: message,
        visitorId: localStorage.getItem("dobly_visitor_id") || Math.random().toString(36).slice(2)
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) { addLine("Dobly", data.reply || "Thanks. We received your message."); })
      .catch(function () { addLine("Dobly", "Thanks. We received your message."); });
  };
})();
