"use strict";
(() => {
  // auth.ts
  var API_BASE = "/api";
  var authToken = localStorage.getItem("authToken") || "";
  var getAuthHeaders = () => {
    const headers = {
      "Content-Type": "application/json"
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return headers;
  };
  var saveAuthToken = (token) => {
    authToken = token || "";
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  };
  var initAuth = async (onLogin2, onLogout2) => {
    if (!authToken) {
      onLogout2();
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/me`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error("Sess\xE3o inv\xE1lida");
      }
      onLogin2();
    } catch {
      saveAuthToken(null);
      onLogout2();
    }
  };
  var login = async (email, senha) => {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, senha })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Credenciais inv\xE1lidas");
    }
    saveAuthToken(data.idToken);
  };
  var logout = async () => {
    saveAuthToken(null);
  };

  // data.ts
  var API_BASE2 = "/api";
  var getAuthToken = () => localStorage.getItem("authToken") || "";
  var apiFetch = async (url, init = {}) => {
    const token = getAuthToken();
    const headers = {
      "Content-Type": "application/json",
      ...init.headers || {}
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...init, headers });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(data?.error || `Erro na requisi\xE7\xE3o: ${response.status}`);
    }
    return data;
  };
  var carregarDados = async (callback) => {
    const data = await apiFetch(`${API_BASE2}/contas`);
    callback(data);
  };
  var salvarItem = async (item) => {
    try {
      await apiFetch(`${API_BASE2}/contas`, {
        method: "POST",
        body: JSON.stringify(item)
      });
    } catch (error) {
      throw new Error(error.message || "Erro ao salvar item");
    }
  };
  var atualizarItem = async (id, campo, valor) => {
    try {
      const dados = typeof campo === "object" && campo !== null ? campo : { [campo]: valor };
      await apiFetch(`${API_BASE2}/contas/${id}`, {
        method: "PATCH",
        body: JSON.stringify(dados)
      });
    } catch (error) {
      throw new Error(error.message || "Erro ao atualizar item");
    }
  };
  var removerItem = async (id) => {
    try {
      await apiFetch(`${API_BASE2}/contas/${id}`, {
        method: "DELETE"
      });
    } catch (error) {
      throw new Error(error.message || "Erro ao remover item");
    }
  };
  var obterItem = async (id) => {
    try {
      const data = await apiFetch(`${API_BASE2}/contas/${id}`);
      return data;
    } catch (error) {
      throw new Error(error.message || "Erro ao obter item");
    }
  };
  var verificarPedidoExistente = async (pedido, mes) => {
    try {
      const data = await apiFetch(`${API_BASE2}/contas/check-pedido?pedido=${encodeURIComponent(pedido)}&mes=${encodeURIComponent(mes)}`);
      return data;
    } catch (error) {
      throw new Error(error.message || "Erro ao verificar pedido existente");
    }
  };

  // utils.ts
  var fmtMoeda = (v) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  var parseMoeda = (s) => {
    if (typeof s === "number")
      return s;
    if (s == null)
      return 0;
    let limpo = String(s).trim();
    if (limpo.includes(",") && limpo.includes(".")) {
      const ultimoVirgula = limpo.lastIndexOf(",");
      const ultimoPonto = limpo.lastIndexOf(".");
      if (ultimoVirgula > ultimoPonto) {
        limpo = limpo.replace(/\./g, "").replace(",", ".");
      } else {
        limpo = limpo.replace(/,/g, "");
      }
    } else if (limpo.includes(",")) {
      limpo = limpo.replace(",", ".");
    }
    limpo = limpo.replace(/[^\d.-]/g, "");
    return parseFloat(limpo) || 0;
  };
  var validarData = (dataStr) => {
    const regex = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/;
    const match = regex.exec(dataStr);
    if (!match)
      return false;
    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const ano = match[3] ? Number(match[3]) : (/* @__PURE__ */ new Date()).getFullYear();
    const data = new Date(ano, mes - 1, dia);
    return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  };
  var validarValor = (valor) => {
    const num = parseMoeda(valor);
    return !isNaN(num) && num >= 0;
  };
  var mostrarErro = (mensagem) => {
    mostrarNotificacao(mensagem, "erro", "ERRO");
  };
  var mostrarSucesso = (mensagem) => {
    mostrarNotificacao(mensagem, "sucesso", "SUCESSO");
  };
  var mostrarAviso = (mensagem) => {
    mostrarNotificacao(mensagem, "aviso", "AVISO");
  };
  var mostrarNotificacao = (mensagem, tipo = "sucesso", titulo = "", duracao = 8e3) => {
    const container = document.getElementById("notificacaoContainer");
    if (!container)
      return;
    const notificacao = document.createElement("div");
    notificacao.className = `notificacao notificacao-${tipo}`;
    let icone = "\u2713";
    if (tipo === "erro")
      icone = "\u2715";
    if (tipo === "aviso")
      icone = "\u26A0";
    const tituloHtml = titulo ? `<div class="notificacao-titulo">${titulo}</div>` : "";
    notificacao.innerHTML = `
        <div class="notificacao-icone">${icone}</div>
        <div class="notificacao-conteudo">
            ${tituloHtml}
            <div class="notificacao-mensagem">${mensagem}</div>
        </div>
        <button class="notificacao-fechar">\xD7</button>
    `;
    container.appendChild(notificacao);
    notificacao.querySelector(".notificacao-fechar")?.addEventListener("click", () => {
      fecharNotificacao(notificacao);
    });
    if (duracao > 0) {
      setTimeout(() => {
        fecharNotificacao(notificacao);
      }, duracao);
    }
  };
  var fecharNotificacao = (notificacao) => {
    notificacao.classList.add("saindo");
    setTimeout(() => {
      notificacao.remove();
    }, 300);
  };
  var parseCSV = (csvText) => {
    const linhas = csvText.split(/\r?\n/).filter((l) => l.trim());
    if (linhas.length < 2)
      return [];
    const cabecalhos = linhas[0].split(";").map(
      (h) => h.trim().replace(/\ufeff/g, "").replace(/^"|"$/g, "")
    );
    const dados = linhas.slice(1).map((linha) => {
      const valores = [];
      let valor = "";
      let dentroAspas = false;
      for (let i = 0; i < linha.length; i++) {
        const char = linha[i];
        if (char === '"') {
          dentroAspas = !dentroAspas;
        } else if (char === ";" && !dentroAspas) {
          valores.push(valor.trim().replace(/^"|"$/g, ""));
          valor = "";
        } else {
          valor += char;
        }
      }
      valores.push(valor.trim().replace(/^"|"$/g, ""));
      const obj = {};
      cabecalhos.forEach((h, i) => {
        obj[h] = valores[i] || "";
      });
      return obj;
    });
    return dados;
  };

  // config.ts
  var deParaFilial = {
    "010001": "MATRIZ",
    "010020": "PINHAIS",
    "010025": "TOLEDO",
    "010035": "GOIANIRA",
    "010057": "ARAGUAINA",
    "010085": "BOM DESPACHO",
    "010090": "NOVA PONTE",
    "010091": "NOVA PONTE"
  };
  var emails = {
    servicos: "servicos@vaccinar.com.br",
    ccServicos: "nfe.ti@vaccinar.com.br;contasapagar@vaccinar.com.br",
    aprovacao: "juliana.lopes@vaccinar.com.br",
    ccAprovacao: "marcus.tonini@vaccinar.com.br"
  };
  var listaMeses = [
    "JANEIRO",
    "FEVEREIRO",
    "MAR\xC7O",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
  ];

  // ui.ts
  var dadosCarregados = {};
  var getMesAtualSistema = () => {
    const now = /* @__PURE__ */ new Date();
    return listaMeses[now.getMonth()];
  };
  var getInputValue = (id) => {
    return document.getElementById(id)?.value || "";
  };
  var setFiltroMesAtual = () => {
    const filtro = document.getElementById("mesFiltro");
    if (!filtro)
      return;
    const mesAtual = getMesAtualSistema();
    if (listaMeses.includes(mesAtual)) {
      filtro.value = mesAtual;
    }
  };
  var initUI = () => {
    setFiltroMesAtual();
    document.getElementById("btnLogin")?.addEventListener("click", handleLogin);
    document.getElementById("btnLogout")?.addEventListener("click", handleLogout);
    document.getElementById("btnSalvarManual")?.addEventListener("click", handleSalvarManual);
    document.getElementById("csvInput")?.addEventListener("change", handleCSVImport);
    document.getElementById("btnCleanup")?.addEventListener("click", handleCleanupImport);
    document.getElementById("mesFiltro")?.addEventListener("change", renderizarDados);
    document.getElementById("filtroLocal")?.addEventListener("change", renderizarDados);
    document.getElementById("inputBusca")?.addEventListener("input", renderizarDados);
  };
  var onLogin = () => {
    document.getElementById("loginOverlay").style.display = "none";
    document.getElementById("appContent").style.display = "block";
    showLoading();
    renderizarDados();
    hideLoading();
  };
  var onLogout = () => {
    document.getElementById("loginOverlay").style.display = "flex";
    document.getElementById("appContent").style.display = "none";
  };
  var handleLogin = async () => {
    const email = getInputValue("loginEmail");
    const senha = getInputValue("loginPass");
    try {
      await login(email, senha);
      await carregarDados(setDados);
      onLogin();
    } catch (error) {
      mostrarErro(error.message);
    }
  };
  var handleLogout = async () => {
    try {
      await logout();
      onLogout();
    } catch {
      mostrarErro("Erro ao fazer logout");
    }
  };
  var handleSalvarManual = async () => {
    const item = {
      tipo: getInputValue("mTipo"),
      local: getInputValue("mLocal"),
      pedido: getInputValue("mPedido"),
      codFor: getInputValue("mCodFor"),
      fornecedor: getInputValue("mFornecedor").toUpperCase(),
      cc: getInputValue("mCC"),
      valor: parseMoeda(getInputValue("mValor")),
      vencimento: getInputValue("mVenc"),
      pagamento: getInputValue("mPagamento"),
      status: "Pendente",
      mes: getInputValue("mesFiltro")
    };
    if (!item.fornecedor) {
      mostrarErro("Fornecedor \xE9 obrigat\xF3rio");
      return;
    }
    if (!validarValor(item.valor)) {
      mostrarErro("Valor inv\xE1lido");
      return;
    }
    if (item.vencimento && !validarData(item.vencimento)) {
      mostrarErro("Data de vencimento inv\xE1lida (formato DD/MM)");
      return;
    }
    try {
      await salvarItem(item);
      await carregarDados(setDados);
      mostrarSucesso("Item salvo com sucesso");
      ["mPedido", "mCodFor", "mFornecedor", "mCC", "mValor", "mVenc"].forEach((id) => {
        const element = document.getElementById(id);
        if (element)
          element.value = "";
      });
    } catch (error) {
      mostrarErro(error.message);
    }
  };
  var handleCSVImport = async (event) => {
    const target = event.target;
    const file = target.files?.[0];
    if (!file)
      return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result;
        const dados = parseCSV(csvText);
        const mesAtual = getInputValue("mesFiltro");
        let processados = 0;
        let ignorados = 0;
        const erros = [];
        const pedidosProcessados = {};
        const pedidosDuplicados = [];
        for (let idx = 0; idx < dados.length; idx++) {
          const linha = dados[idx];
          try {
            const codigoFilial = (linha.Filial || linha.Filial || "").trim();
            const nomeFilial = deParaFilial[codigoFilial];
            const pedido = (linha["N\xBA PC"] || linha["NC PC"] || linha["Numero PC"] || "").trim();
            const codFor = (linha["Cod. Fornecedor"] || linha["CodFornecedor"] || "").trim();
            const fornecedor = (linha.Fornecedor || "").trim().toUpperCase();
            const cc = (linha["C. Custos"] || linha["C.Custos"] || linha["C. de custos"] || "").trim();
            const valor = parseMoeda(linha.Valor);
            if (!codigoFilial) {
              erros.push(`Linha ${idx + 1}: Filial vazia`);
              ignorados++;
              continue;
            }
            if (!nomeFilial) {
              erros.push(`Linha ${idx + 1}: Filial desconhecida (${codigoFilial}) - Verifique o c\xF3digo`);
              ignorados++;
              continue;
            }
            if (!pedido) {
              erros.push(`Linha ${idx + 1}: N\xBA PC vazio`);
              ignorados++;
              continue;
            }
            if (!codFor) {
              erros.push(`Linha ${idx + 1}: Cod. Fornecedor vazio (PC: ${pedido})`);
              ignorados++;
              continue;
            }
            if (!fornecedor) {
              erros.push(`Linha ${idx + 1}: Fornecedor vazio (PC: ${pedido})`);
              ignorados++;
              continue;
            }
            if (!valor || isNaN(valor) || valor <= 0) {
              erros.push(`Linha ${idx + 1}: Valor inv\xE1lido (${linha.Valor}) para PC ${pedido}`);
              ignorados++;
              continue;
            }
            if (!cc) {
              erros.push(`Linha ${idx + 1}: Centro de Custos vazio (PC: ${pedido})`);
              ignorados++;
              continue;
            }
            const pedidoExistente = await verificarPedidoExistente(pedido, mesAtual);
            if (pedidoExistente) {
              if (pedidoExistente.fornecedor !== fornecedor) {
                erros.push(`Linha ${idx + 1}: Pedido ${pedido} j\xE1 existe com fornecedor diferente (${pedidoExistente.fornecedor}) - n\xE3o \xE9 permitido m\xFAltiplos fornecedores para o mesmo pedido`);
                ignorados++;
                continue;
              } else {
                erros.push(`Linha ${idx + 1}: Pedido ${pedido} do fornecedor ${fornecedor} j\xE1 foi importado - duplicata ignorada`);
                ignorados++;
                pedidosDuplicados.push({ pedido, fornecedor });
                continue;
              }
            }
            if (pedidosProcessados[pedido]) {
              if (pedidosProcessados[pedido] !== fornecedor) {
                erros.push(`Linha ${idx + 1}: Pedido ${pedido} aparece m\xFAltiplas vezes neste arquivo com fornecedores diferentes - n\xE3o \xE9 permitido`);
                ignorados++;
                continue;
              } else {
                erros.push(`Linha ${idx + 1}: Pedido ${pedido} aparece m\xFAltiplas vezes neste arquivo - duplicata ignorada`);
                ignorados++;
                pedidosDuplicados.push({ pedido, fornecedor });
                continue;
              }
            }
            pedidosProcessados[pedido] = fornecedor;
            const item = {
              tipo: "SERVICO",
              local: nomeFilial,
              pedido,
              codFor,
              fornecedor,
              cc,
              valor,
              vencimento: "",
              pagamento: "",
              status: "Pendente",
              mes: mesAtual,
              dataImportacao: (/* @__PURE__ */ new Date()).toISOString()
            };
            await salvarItem(item);
            processados++;
          } catch (error) {
            const msg = `Linha ${idx + 1}: Erro - ${error.message}`;
            erros.push(msg);
            ignorados++;
            console.error(msg, linha, error);
          }
        }
        await carregarDados(setDados);
        let mensagem = `RESUMO DA IMPORTA\xC7\xC3O:

\u2713 ${processados} lan\xE7amentos importados com sucesso`;
        if (pedidosDuplicados.length > 0) {
          mensagem += `
\u26A0\uFE0F ${pedidosDuplicados.length} pedidos duplicados foram ignorados (j\xE1 existentes)`;
        }
        if (ignorados > 0) {
          mensagem += `
\u2717 ${ignorados} linhas ignoradas`;
          if (erros.length > 0) {
            mensagem += "\n\nMotivos dos erros:";
            erros.slice(0, 5).forEach((err) => {
              mensagem += `
\u2022 ${err}`;
            });
            if (erros.length > 5) {
              mensagem += `
... e mais ${erros.length - 5} erros (veja console para detalhes completos)`;
            }
          }
        }
        if (processados > 0) {
          mostrarSucesso(mensagem);
        } else if (ignorados > 0) {
          mostrarAviso(mensagem);
        } else {
          mostrarSucesso(mensagem);
        }
        if (target)
          target.value = "";
      } catch (error) {
        console.error("Erro geral na importa\xE7\xE3o:", error);
        mostrarErro(`Erro ao processar arquivo: ${error.message}`);
        if (target)
          target.value = "";
      }
    };
    reader.readAsText(file);
  };
  var handleCleanupImport = async () => {
    const mesAtual = getInputValue("mesFiltro");
    abrirConfirmacao(
      "ATEN\xC7\xC3O",
      `Voc\xEA est\xE1 prestes a DELETAR TODOS os lan\xE7amentos de ${mesAtual}.

Esta a\xE7\xE3o n\xE3o pode ser desfeita!`,
      async () => {
        const itensParaRemover = Object.entries(dadosCarregados).map(([id, item]) => ({ id, ...item })).filter((item) => item.mes === mesAtual);
        if (itensParaRemover.length === 0) {
          mostrarErro(`Nenhum lan\xE7amento encontrado para ${mesAtual}.`);
          return;
        }
        let removidos = 0;
        let erros = 0;
        for (const item of itensParaRemover) {
          try {
            await removerItem(item.id);
            removidos++;
          } catch (error) {
            erros++;
            console.error("Erro ao remover item:", item.id, error);
          }
        }
        let mensagem = `\u2713 ${removidos} lan\xE7amentos removidos de ${mesAtual}`;
        if (erros > 0) {
          mensagem += `
\u26A0\uFE0F ${erros} erros durante a limpeza`;
        }
        await carregarDados(setDados);
        mostrarSucesso(mensagem);
      },
      "EXCLUIR",
      "CANCELAR"
    );
  };
  var getGrupoExibicao = (item) => {
    if (item.status === "Enviado ao CSC")
      return 3;
    if (item.pedido && String(item.pedido).trim() !== "")
      return 1;
    return 2;
  };
  var getTextoGrupo = (group) => {
    if (group === 1)
      return "Notas com N\xBA PC";
    if (group === 2)
      return "Notas Pendentes";
    return "Notas enviadas ao CSC";
  };
  var criarLinhaGrupo = (texto, colSpan = 10) => {
    const tr = document.createElement("tr");
    tr.className = "table-group-row";
    tr.innerHTML = `<td colspan="${colSpan}">${texto}</td>`;
    return tr;
  };
  var renderizarDados = () => {
    if (!dadosCarregados)
      return;
    const mesAtu = getInputValue("mesFiltro");
    const localF = getInputValue("filtroLocal");
    const busca = getInputValue("inputBusca").toLowerCase();
    const itens = Object.keys(dadosCarregados).map((id) => ({ id, ...dadosCarregados[id] })).filter((i) => {
      const termo = String((i.pedido || "") + (i.fornecedor || "") + (i.codFor || "")).toLowerCase();
      return i.mes === mesAtu && (localF === "TODOS" || i.local === localF) && termo.includes(busca);
    }).sort((a, b) => {
      const ga = getGrupoExibicao(a);
      const gb = getGrupoExibicao(b);
      if (ga !== gb)
        return ga - gb;
      if (ga === 1) {
        return String(a.pedido || "").localeCompare(String(b.pedido || ""), void 0, { numeric: true, sensitivity: "base" }) || String(a.fornecedor || "").localeCompare(String(b.fornecedor || ""), void 0, { sensitivity: "base" });
      }
      return String(a.fornecedor || "").localeCompare(String(b.fornecedor || ""), void 0, { sensitivity: "base" });
    });
    const tServ = document.getElementById("tabelaServico");
    const tProd = document.getElementById("tabelaProduto");
    if (!tServ || !tProd)
      return;
    tServ.innerHTML = "";
    tProd.innerHTML = "";
    const servicos = itens.filter((item) => item.tipo === "SERVICO");
    const produtos = itens.filter((item) => item.tipo === "PRODUTO");
    let pVal = 0;
    let eVal = 0;
    let pCount = 0;
    let eCount = 0;
    const renderGrupo = (lista, container) => {
      let ultimoGrupo = null;
      lista.forEach((item) => {
        const grupo = getGrupoExibicao(item);
        if (grupo !== ultimoGrupo) {
          container.appendChild(criarLinhaGrupo(getTextoGrupo(grupo), 10));
          ultimoGrupo = grupo;
        }
        const isEnv = item.status === "Enviado ao CSC";
        if (!isEnv) {
          pVal += item.valor;
          pCount++;
        } else {
          eVal += item.valor;
          eCount++;
        }
        const tr = document.createElement("tr");
        tr.classList.add(`row-grupo-${grupo}`);
        if (isEnv)
          tr.classList.add("row-enviada");
        const tdPedido = `<td class="col-pedido"><input type="text" value="${item.pedido || ""}" class="input-tabela" onblur="atualizarCampo('${item.id}', 'pedido', this.value)"></td>`;
        const tdValor = `<td class="col-valor">R$ <input type="text" value="${fmtMoeda(item.valor)}" class="input-tabela col-valor" onblur="atualizarCampo('${item.id}', 'valor', this.value)"></td>`;
        const tdPagamento = `<td><select class="input-tabela" onchange="atualizarCampo('${item.id}', 'pagamento', this.value)">
                <option value="${item.pagamento || ""}" selected>${item.pagamento || "Selecione"}</option>
                <option value="Boleto">Boleto</option>
                <option value="Deposito">Deposito</option>
            </select></td>`;
        const htmlBase = `
                <td>${item.local}</td>
                ${tdPedido}
                <td class="col-codfor">${item.codFor || ""}</td>
                <td>${item.fornecedor}</td>
                <td class="col-cc">${item.cc || ""}</td>
                ${tdValor}
                <td class="col-venc"><input type="text" value="${item.vencimento || ""}" class="input-tabela" onblur="atualizarCampo('${item.id}', 'vencimento', this.value)"></td>
                ${tdPagamento}
                <td><span class="status-badge ${isEnv ? "status-enviado" : "status-pendente"}">${item.status}</span></td>`;
        const acoes = `<td>
                <button onclick="abrirModalItem('${item.id}')" class="btn-acao">
                    <i class="fas ${item.tipo === "SERVICO" ? "fa-paper-plane" : "fa-copy"}"></i>
                </button>
                <button onclick="removerItemUI('${item.id}')" class="btn-acao-del"><i class="fas fa-trash"></i></button>
            </td>`;
        tr.innerHTML = htmlBase + acoes;
        container.appendChild(tr);
      });
    };
    renderGrupo(servicos, tServ);
    renderGrupo(produtos, tProd);
    document.getElementById("totalPendente").innerText = `R$ ${fmtMoeda(pVal)}`;
    document.getElementById("totalEnviado").innerText = `R$ ${fmtMoeda(eVal)}`;
    document.getElementById("countPendente").innerText = `${pCount} notas`;
    document.getElementById("countEnviado").innerText = `${eCount} notas`;
    document.getElementById("btnAprovacao").onclick = () => {
      const alto = itens.filter((i) => i.valor >= 1e4 && i.status === "Pendente");
      if (alto.length === 0)
        return mostrarErro("Nenhuma nota > 10k pendente.");
      let corpoEmail = "Juliana, tudo bem?\n\nSegue abaixo os pedidos aguardando aprova\xE7\xE3o:\n\n";
      alto.forEach((i) => {
        corpoEmail += `${i.local} - Pedido: ${i.pedido || ""} - Fornecedor: ${i.codFor || ""} - ${i.fornecedor} - Valor: R$ ${fmtMoeda(i.valor)} - C/C: ${i.cc || ""} - Venc.: ${i.vencimento || ""}.
`;
      });
      window.location.href = `mailto:${emails.aprovacao}?cc=${emails.ccAprovacao}&subject=Pedidos aguardando aprova\xE7\xE3o&body=${encodeURIComponent(corpoEmail)}`;
    };
  };
  var setDados = (dados) => {
    dadosCarregados = dados || {};
    renderizarDados();
  };
  window.atualizarCampo = async (id, campo, valor) => {
    try {
      const valorFinal = campo === "valor" ? parseMoeda(valor) : valor;
      await atualizarItem(id, campo, valorFinal);
      await carregarDados(setDados);
    } catch (error) {
      mostrarErro(error.message);
    }
  };
  window.abrirModalItem = async (id) => {
    try {
      const item = await obterItem(id);
      const corpoEmail = gerarTextoEmail(item);
      const assunto = `Enc. ${item.local} - Pedido: ${item.pedido || ""} - Fornecedor: ${item.codFor || ""} - ${item.fornecedor} - Valor: R$ ${fmtMoeda(item.valor)} - C/C: ${item.cc || ""} - Venc.: ${item.vencimento || ""}`;
      if (item.tipo === "SERVICO") {
        abrirModal("Tratar Servi\xE7o", corpoEmail, [
          { txt: "ENVIAR E-MAIL", cl: "btn-primary-modal", fn: async () => {
            window.location.href = `mailto:${emails.servicos}?cc=${emails.ccServicos}&subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpoEmail)}`;
            await atualizarItem(id, "status", "Enviado ao CSC");
            await carregarDados(setDados);
            fecharModal();
          } },
          { txt: "MARCAR COMO ENVIADO", cl: "btn-secondary-modal", fn: async () => {
            await atualizarItem(id, "status", "Enviado ao CSC");
            await carregarDados(setDados);
            fecharModal();
          } }
        ]);
      } else {
        const textoCopia = corpoEmail;
        abrirModal("Copiar Dados Produto", textoCopia, [
          { txt: "COPIAR E MARCAR", cl: "btn-primary-modal", fn: async () => {
            await navigator.clipboard.writeText(textoCopia);
            mostrarSucesso("Mensagem copiada!");
            await atualizarItem(id, "status", "Enviado ao CSC");
            await carregarDados(setDados);
            fecharModal();
          } }
        ]);
      }
    } catch (error) {
      mostrarErro(error.message);
    }
  };
  window.removerItemUI = async (id) => {
    abrirConfirmacao(
      "EXCLUIR ITEM",
      "Deseja realmente excluir este item?",
      async () => {
        try {
          await removerItem(id);
          await carregarDados(setDados);
          mostrarSucesso("Item removido");
        } catch (error) {
          mostrarErro(error.message);
        }
      },
      "EXCLUIR",
      "CANCELAR"
    );
  };
  var gerarTextoEmail = (c) => {
    const vFmt = fmtMoeda(c.valor);
    return `Bom dia! 

Segue Para Lan\xE7amento: 
${c.local} - Pedido: ${c.pedido || ""} - Fornecedor: ${c.codFor || ""} - ${c.fornecedor} - Valor: R$ ${vFmt} - C/C: ${c.cc || ""} - Venc.: ${c.vencimento || ""} 

Pagamento via: ${c.pagamento}.`;
  };
  var abrirModal = (t, p, btns) => {
    document.getElementById("modalTitle").innerText = t;
    document.getElementById("modalPreview").innerText = p;
    const container = document.getElementById("modalActions");
    container.innerHTML = "";
    btns.forEach((b) => {
      const el = document.createElement("button");
      el.innerText = b.txt;
      el.className = `modal-btn ${b.cl}`;
      el.onclick = b.fn;
      container.appendChild(el);
    });
    const bc = document.createElement("button");
    bc.innerText = "CANCELAR";
    bc.className = "modal-btn btn-secondary-modal";
    bc.onclick = fecharModal;
    container.appendChild(bc);
    document.getElementById("modalApp").style.display = "flex";
  };
  var fecharModal = () => {
    document.getElementById("modalApp").style.display = "none";
  };
  var abrirConfirmacao = (titulo, mensagem, fnConfirmar, textoConfirmar = "OK", textoCancelar = "CANCELAR") => {
    abrirModal(titulo, mensagem, [
      { txt: textoConfirmar, cl: "btn-primary-modal", fn: async () => {
        await fnConfirmar();
        fecharModal();
      } }
    ]);
  };
  var showLoading = () => {
    document.getElementById("loadingIndicator").style.display = "block";
  };
  var hideLoading = () => {
    document.getElementById("loadingIndicator").style.display = "none";
  };

  // app.ts
  initAuth(
    async () => {
      onLogin();
      await carregarDados(setDados);
    },
    async () => {
      onLogout();
    }
  );
  initUI();
})();
//# sourceMappingURL=app.js.map
