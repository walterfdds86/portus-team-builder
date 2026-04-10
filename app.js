// =====================
// ESTADO GLOBAL
// =====================
var state = {
  userName: "",
  businessName: "",
  messages: [],
  userTurns: 0,
  isLoading: false,
};

var MAX_TURNS = 7;

// =====================
// ELEMENTOS DO DOM
// =====================
var screens = {
  start: document.getElementById("screen-start"),
  chat: document.getElementById("screen-chat"),
  report: document.getElementById("screen-report"),
};

var els = {
  startForm: document.getElementById("start-form"),
  userName: document.getElementById("user-name"),
  businessName: document.getElementById("business-name"),
  chatMessages: document.getElementById("chat-messages"),
  chatInput: document.getElementById("chat-input"),
  btnSend: document.getElementById("btn-send"),
  btnReport: document.getElementById("btn-report"),
  btnSave: document.getElementById("btn-save"),
  btnRestart: document.getElementById("btn-restart"),
  progressText: document.getElementById("progress-text"),
  progressFill: document.getElementById("progress-fill"),
  reportCard: document.getElementById("report-card"),
  reportActions: document.getElementById("report-actions"),
};

// =====================
// NAVEGAÇÃO
// =====================
function showScreen(name) {
  Object.values(screens).forEach(function(s) { s.classList.remove("active"); });
  screens[name].classList.add("active");
}

// =====================
// PROGRESSO
// =====================
function updateProgress() {
  var pct = Math.min((state.userTurns / MAX_TURNS) * 100, 100);
  els.progressFill.style.width = pct + "%";
  var turn = Math.min(state.userTurns + 1, MAX_TURNS);
  els.progressText.textContent = "Pergunta " + turn + " de " + MAX_TURNS;
}

// =====================
// MENSAGENS NO CHAT
// =====================
function appendMessage(role, text) {
  var isAI = role === "assistant";
  var div = document.createElement("div");
  div.className = "message " + (isAI ? "ai" : "user");
  div.innerHTML =
    '<div class="message-avatar">' + (isAI ? "P" : state.userName.charAt(0).toUpperCase()) + "</div>" +
    '<div class="message-bubble">' + text.replace(/\n/g, "<br>") + "</div>";
  els.chatMessages.appendChild(div);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function showTyping() {
  var div = document.createElement("div");
  div.className = "message ai";
  div.id = "typing-indicator";
  div.innerHTML =
    '<div class="message-avatar">P</div>' +
    '<div class="typing-indicator">' +
      '<div class="typing-dot"></div>' +
      '<div class="typing-dot"></div>' +
      '<div class="typing-dot"></div>' +
    "</div>";
  els.chatMessages.appendChild(div);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function removeTyping() {
  var el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

// =====================
// CHAMADA À API
// =====================
function callAPI(generateReport) {
  return fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: state.messages,
      generateReport: generateReport || false,
    }),
  }).then(function(res) {
    if (!res.ok) throw new Error("API error: " + res.status);
    return res.json();
  }).then(function(data) {
    return data.content;
  });
}

// =====================
// ENVIAR MENSAGEM
// =====================
function sendMessage() {
  var text = els.chatInput.value.trim();
  if (!text || state.isLoading) return;

  state.isLoading = true;
  els.btnSend.disabled = true;
  els.chatInput.disabled = true;
  els.chatInput.value = "";

  state.messages.push({ role: "user", content: text });
  appendMessage("user", text);
  state.userTurns += 1;
  updateProgress();
  showTyping();

  callAPI(false).then(function(aiResponse) {
    removeTyping();
    state.messages.push({ role: "assistant", content: aiResponse });
    appendMessage("assistant", aiResponse);

    var readySignal = aiResponse.includes("Clique no botão abaixo para ver seu Portus Team Report");
    if (readySignal) {
      els.btnReport.classList.add("visible");
      els.chatInput.disabled = true;
      els.btnSend.disabled = true;
    }
  }).catch(function(err) {
    removeTyping();
    appendMessage("assistant", "Ocorreu um erro. Por favor, tente novamente.");
    console.error(err);
  }).finally(function() {
    state.isLoading = false;
    if (!els.btnReport.classList.contains("visible")) {
      els.chatInput.disabled = false;
      els.btnSend.disabled = false;
      els.chatInput.focus();
    }
  });
}

// =====================
// GERAR RELATÓRIO
// =====================
function generateReport() {
  els.btnReport.disabled = true;
  showScreen("report");
  els.reportCard.innerHTML =
    '<div class="loading-spinner">' +
      '<div class="spinner"></div>' +
      '<p style="color: var(--color-text-muted); font-size: 14px;">Analisando seu negócio...</p>' +
    "</div>";

  callAPI(true).then(function(raw) {
    var jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado na resposta: " + raw.substring(0, 200));
    var report = JSON.parse(jsonMatch[0]);
    renderReport(report);
  }).catch(function(err) {
    els.reportCard.innerHTML =
      '<p style="color: red; padding: 24px; text-align: center;">' +
        'Erro ao gerar o relatório. <a href="#" onclick="generateReport()">Tente novamente</a>' +
      "</p>";
    console.error("Erro ao gerar relatório:", err);
  });
}

// =====================
// RENDERIZAR RELATÓRIO
// =====================
function renderReport(report) {
  var teamHTML = (report.teamStructure || []).map(function(member) {
    return (
      '<div class="team-card">' +
        '<div class="team-priority">' + member.priority + "</div>" +
        '<div class="team-info">' +
          '<div class="team-role">' + member.role + "</div>" +
          '<div class="team-meta">' +
            '<span class="level-badge ' + member.seniority + '">' + member.seniority + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="team-right">' +
          '<div class="team-salary">' + member.salaryRange + "</div>" +
          '<div class="team-contract">' + member.contractType + "</div>" +
        "</div>" +
      "</div>"
    );
  }).join("");

  var roadmapHTML = (report.hiringRoadmap || []).map(function(phase, idx) {
    var hiresHTML = (phase.hires || []).map(function(h) {
      return '<span class="roadmap-hire-tag">' + h + "</span>";
    }).join("");
    return (
      '<div class="roadmap-phase">' +
        '<div class="roadmap-indicator">' +
          '<div class="roadmap-dot">' + (idx + 1) + "</div>" +
          '<div class="roadmap-line"></div>' +
        "</div>" +
        '<div class="roadmap-content">' +
          '<div class="roadmap-phase-title">' + phase.phase + "</div>" +
          '<div class="roadmap-hires">' + hiresHTML + "</div>" +
          '<div class="roadmap-rationale">' + phase.rationale + "</div>" +
        "</div>" +
      "</div>"
    );
  }).join("");

  els.reportCard.innerHTML =
    '<div class="report-header">' +
      '<div class="report-logo">port<span>ü</span>s</div>' +
      '<div class="report-label">Team Report</div>' +
    "</div>" +
    '<div class="report-business">' +
      '<div class="report-business-name">' + state.businessName + "</div>" +
      '<span class="report-stage-badge">Estágio: ' + (report.stage || "—") + "</span>" +
    "</div>" +
    '<div class="report-section">' +
      '<div class="report-section-title">Estrutura do Time</div>' +
      '<div class="team-grid">' + teamHTML + "</div>" +
    "</div>" +
    '<div class="report-section">' +
      '<div class="report-section-title">Roadmap de Contratações</div>' +
      '<div class="roadmap">' + roadmapHTML + "</div>" +
    "</div>" +
    '<div class="report-section">' +
      '<div class="report-section-title">Alerta Estratégico</div>' +
      '<div class="warning-card">' +
        '<div class="warning-label">⚠ Atenção</div>' +
        '<div class="warning-text">' + (report.strategicWarning || "—") + "</div>" +
      "</div>" +
    "</div>" +
    '<div class="report-footer">' +
      '<div class="report-budget"><span>Investimento estimado</span>' + (report.totalBudget || "—") + "</div>" +
      '<div class="report-date">' + (report.date || "") + "</div>" +
    "</div>" +
    '<div class="cta-portus">' +
      '<div class="cta-portus-inner">' +
        '<div class="cta-portus-text">' +
          '<strong>A Portus pode montar esse time por você.</strong>' +
          '<span>Recrutamento especializado em times de alta performance para o mercado digital.</span>' +
        "</div>" +
        '<a href="portus.html" target="_blank" class="btn-cta-portus">Conhecer a Portus →</a>' +
      "</div>" +
    "</div>";

  els.reportActions.style.display = "flex";
}

// =====================
// BAIXAR PDF
// =====================
function saveAsPDF() {
  var btn = els.btnSave;
  btn.textContent = "Gerando PDF...";
  btn.disabled = true;

  // Oculta temporariamente o CTA para não entrar no PDF
  var ctaEl = els.reportCard.querySelector(".cta-portus");
  if (ctaEl) ctaEl.style.display = "none";

  html2canvas(els.reportCard, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  }).then(function(canvas) {
    var imgData = canvas.toDataURL("image/jpeg", 0.92);
    var mmPerPx = 0.264583;
    var imgWidthMM = 210; // A4 width
    var imgHeightMM = (canvas.height / canvas.width) * imgWidthMM;
    var { jsPDF } = window.jspdf;

    // PDF com altura exata do conteúdo (single page bem dimensionado)
    var pdf = new jsPDF({ unit: "mm", format: [imgWidthMM, imgHeightMM] });
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidthMM, imgHeightMM);
    pdf.save("portus-team-report-" + state.businessName.replace(/\s+/g, "-").toLowerCase() + ".pdf");
  }).catch(function(err) {
    console.error("Erro ao gerar PDF:", err);
    alert("Erro ao gerar PDF. Tente novamente.");
  }).finally(function() {
    if (ctaEl) ctaEl.style.display = "";
    btn.textContent = "Baixar PDF";
    btn.disabled = false;
  });
}

// =====================
// REINICIAR
// =====================
function restart() {
  state.userName = "";
  state.businessName = "";
  state.messages = [];
  state.userTurns = 0;
  state.isLoading = false;

  els.chatMessages.innerHTML = "";
  els.chatInput.value = "";
  els.chatInput.disabled = false;
  els.btnSend.disabled = false;
  els.btnReport.disabled = false;
  els.btnReport.classList.remove("visible");
  els.reportActions.style.display = "none";
  els.progressFill.style.width = "0%";
  els.progressText.textContent = "Pergunta 1 de " + MAX_TURNS;
  els.startForm.reset();

  showScreen("start");
}

// =====================
// INICIAR DIAGNÓSTICO
// =====================
function startInterview(e) {
  e.preventDefault();
  var name = els.userName.value.trim();
  var business = els.businessName.value.trim();
  if (!name || !business) return;

  state.userName = name;
  state.businessName = business;
  state.messages = [];
  state.userTurns = 0;
  state.isLoading = false;
  els.btnReport.classList.remove("visible");

  showScreen("chat");
  updateProgress();
  showTyping();
  state.isLoading = true;
  els.btnSend.disabled = true;

  state.messages.push({
    role: "user",
    content: "Olá, meu nome é " + name + " e quero um diagnóstico de time para meu negócio: " + business + ".",
  });

  callAPI(false).then(function(aiResponse) {
    removeTyping();
    state.messages.push({ role: "assistant", content: aiResponse });
    appendMessage("assistant", aiResponse);
  }).catch(function(err) {
    removeTyping();
    appendMessage("assistant", "Erro ao iniciar. Por favor, recarregue a página.");
    console.error(err);
  }).finally(function() {
    state.isLoading = false;
    els.btnSend.disabled = false;
    els.chatInput.focus();
  });
}

// =====================
// EVENT LISTENERS
// =====================
els.startForm.addEventListener("submit", startInterview);
els.btnSend.addEventListener("click", sendMessage);
els.chatInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
els.chatInput.addEventListener("input", function() {
  els.chatInput.style.height = "auto";
  els.chatInput.style.height = Math.min(els.chatInput.scrollHeight, 120) + "px";
});
els.btnReport.addEventListener("click", generateReport);
els.btnSave.addEventListener("click", saveAsPDF);
els.btnRestart.addEventListener("click", restart);
