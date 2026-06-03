import { fmtMoeda, mostrarErro, mostrarSucesso, mostrarAviso, parseCSV, parseMoeda, validarValor, validarData, CSVRow } from './utils.ts';
import { carregarDados, salvarItem, atualizarItem, removerItem, obterItem, verificarPedidoExistente, ContasData, ContaItem } from './data.ts';
import { listaMeses, emails, deParaFilial } from './config.ts';
import { login, logout } from './auth.ts';

let dadosCarregados: ContasData = {};

const getMesAtualSistema = () => {
    const now = new Date();
    return listaMeses[now.getMonth()];
};

const getInputValue = (id: string) => {
    return (document.getElementById(id) as HTMLInputElement | null)?.value || '';
};

const setFiltroMesAtual = () => {
    const filtro = document.getElementById('mesFiltro') as HTMLSelectElement | null;
    if (!filtro) return;
    const mesAtual = getMesAtualSistema();
    if (listaMeses.includes(mesAtual)) {
        filtro.value = mesAtual;
    }
};

export const initUI = () => {
    setFiltroMesAtual();

    document.getElementById('btnLogin')?.addEventListener('click', handleLogin);
    document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
    document.getElementById('btnSalvarManual')?.addEventListener('click', handleSalvarManual);
    document.getElementById('csvInput')?.addEventListener('change', handleCSVImport);
    document.getElementById('btnCleanup')?.addEventListener('click', handleCleanupImport);
    document.getElementById('mesFiltro')?.addEventListener('change', renderizarDados);
    document.getElementById('filtroLocal')?.addEventListener('change', renderizarDados);
    document.getElementById('inputBusca')?.addEventListener('input', renderizarDados);
};

export const onLogin = () => {
    document.getElementById('loginOverlay')!.style.display = 'none';
    document.getElementById('appContent')!.style.display = 'block';
    showLoading();
    renderizarDados();
    hideLoading();
};

export const onLogout = () => {
    document.getElementById('loginOverlay')!.style.display = 'flex';
    document.getElementById('appContent')!.style.display = 'none';
};

const handleLogin = async () => {
    const email = getInputValue('loginEmail');
    const senha = getInputValue('loginPass');
    try {
        await login(email, senha);
        await carregarDados(setDados);
        onLogin();
    } catch (error) {
        mostrarErro((error as Error).message);
    }
};

const handleLogout = async () => {
    try {
        await logout();
        onLogout();
    } catch {
        mostrarErro('Erro ao fazer logout');
    }
};

const handleSalvarManual = async () => {
    const item: ContaItem = {
        tipo: getInputValue('mTipo'),
        local: getInputValue('mLocal'),
        pedido: getInputValue('mPedido'),
        codFor: getInputValue('mCodFor'),
        fornecedor: getInputValue('mFornecedor').toUpperCase(),
        cc: getInputValue('mCC'),
        valor: parseMoeda(getInputValue('mValor')),
        vencimento: getInputValue('mVenc'),
        pagamento: getInputValue('mPagamento'),
        status: 'Pendente',
        mes: getInputValue('mesFiltro')
    };

    if (!item.fornecedor) {
        mostrarErro('Fornecedor é obrigatório');
        return;
    }
    if (!validarValor(item.valor)) {
        mostrarErro('Valor inválido');
        return;
    }
    if (item.vencimento && !validarData(item.vencimento)) {
        mostrarErro('Data de vencimento inválida (formato DD/MM)');
        return;
    }

    try {
        await salvarItem(item);
        await carregarDados(setDados);
        mostrarSucesso('Item salvo com sucesso');
        ['mPedido', 'mCodFor', 'mFornecedor', 'mCC', 'mValor', 'mVenc'].forEach(id => {
            const element = document.getElementById(id) as HTMLInputElement | null;
            if (element) element.value = '';
        });
    } catch (error) {
        mostrarErro((error as Error).message);
    }
};

const handleCSVImport = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const csvText = e.target?.result as string;
            const dados = parseCSV(csvText);
            const mesAtual = getInputValue('mesFiltro');

            let processados = 0;
            let ignorados = 0;
            const erros: string[] = [];
            const pedidosProcessados: Record<string, string> = {};
            const pedidosDuplicados: Array<{ pedido: string; fornecedor: string }> = [];

            for (let idx = 0; idx < dados.length; idx++) {
                const linha = dados[idx];
                try {
                    const codigoFilial = (linha.Filial || linha.Filial || '').trim();
                    const nomeFilial = deParaFilial[codigoFilial];
                    const pedido = (linha['Nº PC'] || linha['NC PC'] || linha['Numero PC'] || '').trim();
                    const codFor = (linha['Cod. Fornecedor'] || linha['CodFornecedor'] || '').trim();
                    const fornecedor = (linha.Fornecedor || '').trim().toUpperCase();
                    const cc = (linha['C. Custos'] || linha['C.Custos'] || linha['C. de custos'] || '').trim();
                    const valor = parseMoeda(linha.Valor);

                    if (!codigoFilial) {
                        erros.push(`Linha ${idx + 1}: Filial vazia`);
                        ignorados++;
                        continue;
                    }

                    if (!nomeFilial) {
                        erros.push(`Linha ${idx + 1}: Filial desconhecida (${codigoFilial}) - Verifique o código`);
                        ignorados++;
                        continue;
                    }

                    if (!pedido) {
                        erros.push(`Linha ${idx + 1}: Nº PC vazio`);
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
                        erros.push(`Linha ${idx + 1}: Valor inválido (${linha.Valor}) para PC ${pedido}`);
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
                            erros.push(`Linha ${idx + 1}: Pedido ${pedido} já existe com fornecedor diferente (${pedidoExistente.fornecedor}) - não é permitido múltiplos fornecedores para o mesmo pedido`);
                            ignorados++;
                            continue;
                        } else {
                            erros.push(`Linha ${idx + 1}: Pedido ${pedido} do fornecedor ${fornecedor} já foi importado - duplicata ignorada`);
                            ignorados++;
                            pedidosDuplicados.push({ pedido, fornecedor });
                            continue;
                        }
                    }

                    if (pedidosProcessados[pedido]) {
                        if (pedidosProcessados[pedido] !== fornecedor) {
                            erros.push(`Linha ${idx + 1}: Pedido ${pedido} aparece múltiplas vezes neste arquivo com fornecedores diferentes - não é permitido`);
                            ignorados++;
                            continue;
                        } else {
                            erros.push(`Linha ${idx + 1}: Pedido ${pedido} aparece múltiplas vezes neste arquivo - duplicata ignorada`);
                            ignorados++;
                            pedidosDuplicados.push({ pedido, fornecedor });
                            continue;
                        }
                    }

                    pedidosProcessados[pedido] = fornecedor;

                    const item: ContaItem = {
                        tipo: 'SERVICO',
                        local: nomeFilial,
                        pedido,
                        codFor,
                        fornecedor,
                        cc,
                        valor,
                        vencimento: '',
                        pagamento: '',
                        status: 'Pendente',
                        mes: mesAtual,
                        dataImportacao: new Date().toISOString()
                    };

                    await salvarItem(item);
                    processados++;
                } catch (error) {
                    const msg = `Linha ${idx + 1}: Erro - ${(error as Error).message}`;
                    erros.push(msg);
                    ignorados++;
                    console.error(msg, linha, error);
                }
            }

            await carregarDados(setDados);

            let mensagem = `RESUMO DA IMPORTAÇÃO:\n\n✓ ${processados} lançamentos importados com sucesso`;

            if (pedidosDuplicados.length > 0) {
                mensagem += `\n⚠️ ${pedidosDuplicados.length} pedidos duplicados foram ignorados (já existentes)`;
            }

            if (ignorados > 0) {
                mensagem += `\n✗ ${ignorados} linhas ignoradas`;
                if (erros.length > 0) {
                    mensagem += '\n\nMotivos dos erros:';
                    erros.slice(0, 5).forEach(err => {
                        mensagem += `\n• ${err}`;
                    });
                    if (erros.length > 5) {
                        mensagem += `\n... e mais ${erros.length - 5} erros (veja console para detalhes completos)`;
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

            if (target) target.value = '';
        } catch (error) {
            console.error('Erro geral na importação:', error);
            mostrarErro(`Erro ao processar arquivo: ${(error as Error).message}`);
            if (target) target.value = '';
        }
    };

    reader.readAsText(file);
};

const handleCleanupImport = async () => {
    const mesAtual = getInputValue('mesFiltro');

    abrirConfirmacao(
        'ATENÇÃO',
        `Você está prestes a DELETAR TODOS os lançamentos de ${mesAtual}.\n\nEsta ação não pode ser desfeita!`,
        async () => {
            const itensParaRemover = Object.entries(dadosCarregados)
                .map(([id, item]) => ({ id, ...item }))
                .filter(item => item.mes === mesAtual);

            if (itensParaRemover.length === 0) {
                mostrarErro(`Nenhum lançamento encontrado para ${mesAtual}.`);
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
                    console.error('Erro ao remover item:', item.id, error);
                }
            }

            let mensagem = `✓ ${removidos} lançamentos removidos de ${mesAtual}`;
            if (erros > 0) {
                mensagem += `\n⚠️ ${erros} erros durante a limpeza`;
            }

            await carregarDados(setDados);
            mostrarSucesso(mensagem);
        },
        'EXCLUIR',
        'CANCELAR'
    );
};

const getGrupoExibicao = (item: ContaItem) => {
    if (item.status === 'Enviado ao CSC') return 3;
    if (item.pedido && String(item.pedido).trim() !== '') return 1;
    return 2;
};

const getTextoGrupo = (group: number) => {
    if (group === 1) return 'Notas com Nº PC';
    if (group === 2) return 'Notas Pendentes';
    return 'Notas enviadas ao CSC';
};

const criarLinhaGrupo = (texto: string, colSpan = 10) => {
    const tr = document.createElement('tr');
    tr.className = 'table-group-row';
    tr.innerHTML = `<td colspan="${colSpan}">${texto}</td>`;
    return tr;
};

export const renderizarDados = () => {
    if (!dadosCarregados) return;

    const mesAtu = getInputValue('mesFiltro');
    const localF = getInputValue('filtroLocal');
    const busca = getInputValue('inputBusca').toLowerCase();

    const itens = Object.keys(dadosCarregados).map(id => ({ id, ...dadosCarregados[id] }))
        .filter(i => {
            const termo = String((i.pedido || '') + (i.fornecedor || '') + (i.codFor || '')).toLowerCase();
            return i.mes === mesAtu && (localF === 'TODOS' || i.local === localF) && termo.includes(busca);
        })
        .sort((a, b) => {
            const ga = getGrupoExibicao(a);
            const gb = getGrupoExibicao(b);
            if (ga !== gb) return ga - gb;
            if (ga === 1) {
                return String(a.pedido || '').localeCompare(String(b.pedido || ''), undefined, { numeric: true, sensitivity: 'base' })
                    || String(a.fornecedor || '').localeCompare(String(b.fornecedor || ''), undefined, { sensitivity: 'base' });
            }
            return String(a.fornecedor || '').localeCompare(String(b.fornecedor || ''), undefined, { sensitivity: 'base' });
        });

    const tServ = document.getElementById('tabelaServico') as HTMLTableSectionElement | null;
    const tProd = document.getElementById('tabelaProduto') as HTMLTableSectionElement | null;
    if (!tServ || !tProd) return;

    tServ.innerHTML = '';
    tProd.innerHTML = '';

    const servicos = itens.filter(item => item.tipo === 'SERVICO');
    const produtos = itens.filter(item => item.tipo === 'PRODUTO');

    let pVal = 0;
    let eVal = 0;
    let pCount = 0;
    let eCount = 0;

    const renderGrupo = (lista: Array<ContaItem & { id: string }>, container: HTMLElement) => {
        let ultimoGrupo: number | null = null;
        lista.forEach(item => {
            const grupo = getGrupoExibicao(item);
            if (grupo !== ultimoGrupo) {
                container.appendChild(criarLinhaGrupo(getTextoGrupo(grupo), 10));
                ultimoGrupo = grupo;
            }

            const isEnv = item.status === 'Enviado ao CSC';
            if (!isEnv) {
                pVal += item.valor;
                pCount++;
            } else {
                eVal += item.valor;
                eCount++;
            }

            const tr = document.createElement('tr');
            tr.classList.add(`row-grupo-${grupo}`);
            if (isEnv) tr.classList.add('row-enviada');

            const tdPedido = `<td class="col-pedido"><input type="text" value="${item.pedido || ''}" class="input-tabela" onblur="atualizarCampo('${item.id}', 'pedido', this.value)"></td>`;
            const tdValor = `<td class="col-valor">R$ <input type="text" value="${fmtMoeda(item.valor)}" class="input-tabela col-valor" onblur="atualizarCampo('${item.id}', 'valor', this.value)"></td>`;
            const tdPagamento = `<td><select class="input-tabela" onchange="atualizarCampo('${item.id}', 'pagamento', this.value)">
                <option value="${item.pagamento || ''}" selected>${item.pagamento || 'Selecione'}</option>
                <option value="Boleto">Boleto</option>
                <option value="Deposito">Deposito</option>
            </select></td>`;

            const htmlBase = `
                <td>${item.local}</td>
                ${tdPedido}
                <td class="col-codfor">${item.codFor || ''}</td>
                <td>${item.fornecedor}</td>
                <td class="col-cc">${item.cc || ''}</td>
                ${tdValor}
                <td class="col-venc"><input type="text" value="${item.vencimento || ''}" class="input-tabela" onblur="atualizarCampo('${item.id}', 'vencimento', this.value)"></td>
                ${tdPagamento}
                <td><span class="status-badge ${isEnv ? 'status-enviado' : 'status-pendente'}">${item.status}</span></td>`;

            const acoes = `<td>
                <button onclick="abrirModalItem('${item.id}')" class="btn-acao">
                    <i class="fas ${item.tipo === 'SERVICO' ? 'fa-paper-plane' : 'fa-copy'}"></i>
                </button>
                <button onclick="removerItemUI('${item.id}')" class="btn-acao-del"><i class="fas fa-trash"></i></button>
            </td>`;

            tr.innerHTML = htmlBase + acoes;
            container.appendChild(tr);
        });
    };

    renderGrupo(servicos, tServ);
    renderGrupo(produtos, tProd);

    document.getElementById('totalPendente')!.innerText = `R$ ${fmtMoeda(pVal)}`;
    document.getElementById('totalEnviado')!.innerText = `R$ ${fmtMoeda(eVal)}`;
    document.getElementById('countPendente')!.innerText = `${pCount} notas`;
    document.getElementById('countEnviado')!.innerText = `${eCount} notas`;

    document.getElementById('btnAprovacao')!.onclick = () => {
        const alto = itens.filter(i => i.valor >= 10000 && i.status === 'Pendente');
        if (alto.length === 0) return mostrarErro('Nenhuma nota > 10k pendente.');

        let corpoEmail = 'Juliana, tudo bem?\n\nSegue abaixo os pedidos aguardando aprovação:\n\n';

        alto.forEach(i => {
            corpoEmail += `${i.local} - Pedido: ${i.pedido || ''} - Fornecedor: ${i.codFor || ''} - ${i.fornecedor} - Valor: R$ ${fmtMoeda(i.valor)} - C/C: ${i.cc || ''} - Venc.: ${i.vencimento || ''}.\n`;
        });

        window.location.href = `mailto:${emails.aprovacao}?cc=${emails.ccAprovacao}&subject=Pedidos aguardando aprovação&body=${encodeURIComponent(corpoEmail)}`;
    };
};

export const setDados = (dados: ContasData | null) => {
    dadosCarregados = dados || {};
    renderizarDados();
};

declare global {
    interface Window {
        atualizarCampo: (id: string, campo: string, valor: string) => Promise<void>;
        abrirModalItem: (id: string) => Promise<void>;
        removerItemUI: (id: string) => Promise<void>;
    }
}

window.atualizarCampo = async (id, campo, valor) => {
    try {
        const valorFinal = campo === 'valor' ? parseMoeda(valor) : valor;
        await atualizarItem(id, campo, valorFinal);
        await carregarDados(setDados);
    } catch (error) {
        mostrarErro((error as Error).message);
    }
};

window.abrirModalItem = async (id) => {
    try {
        const item = await obterItem(id);
        const corpoEmail = gerarTextoEmail(item);
        const assunto = `Enc. ${item.local} - Pedido: ${item.pedido || ''} - Fornecedor: ${item.codFor || ''} - ${item.fornecedor} - Valor: R$ ${fmtMoeda(item.valor)} - C/C: ${item.cc || ''} - Venc.: ${item.vencimento || ''}`;

        if (item.tipo === 'SERVICO') {
            abrirModal('Tratar Serviço', corpoEmail, [
                { txt: 'ENVIAR E-MAIL', cl: 'btn-primary-modal', fn: async () => {
                    window.location.href = `mailto:${emails.servicos}?cc=${emails.ccServicos}&subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpoEmail)}`;
                    await atualizarItem(id, 'status', 'Enviado ao CSC');
                    await carregarDados(setDados);
                    fecharModal();
                }},
                { txt: 'MARCAR COMO ENVIADO', cl: 'btn-secondary-modal', fn: async () => {
                    await atualizarItem(id, 'status', 'Enviado ao CSC');
                    await carregarDados(setDados);
                    fecharModal();
                }}
            ]);
        } else {
            const textoCopia = corpoEmail;
            abrirModal('Copiar Dados Produto', textoCopia, [
                { txt: 'COPIAR E MARCAR', cl: 'btn-primary-modal', fn: async () => {
                    await navigator.clipboard.writeText(textoCopia);
                    mostrarSucesso('Mensagem copiada!');
                    await atualizarItem(id, 'status', 'Enviado ao CSC');
                    await carregarDados(setDados);
                    fecharModal();
                }}
            ]);
        }
    } catch (error) {
        mostrarErro((error as Error).message);
    }
};

window.removerItemUI = async (id) => {
    abrirConfirmacao(
        'EXCLUIR ITEM',
        'Deseja realmente excluir este item?',
        async () => {
            try {
                await removerItem(id);
                await carregarDados(setDados);
                mostrarSucesso('Item removido');
            } catch (error) {
                mostrarErro((error as Error).message);
            }
        },
        'EXCLUIR',
        'CANCELAR'
    );
};

const gerarTextoEmail = (c: ContaItem) => {
    const vFmt = fmtMoeda(c.valor);
    return `Bom dia! \n\nSegue Para Lançamento: \n${c.local} - Pedido: ${c.pedido || ''} - Fornecedor: ${c.codFor || ''} - ${c.fornecedor} - Valor: R$ ${vFmt} - C/C: ${c.cc || ''} - Venc.: ${c.vencimento || ''} \n\nPagamento via: ${c.pagamento}.`;
};

const abrirModal = (t: string, p: string, btns: Array<{ txt: string; cl: string; fn: () => void }>) => {
    document.getElementById('modalTitle')!.innerText = t;
    document.getElementById('modalPreview')!.innerText = p;
    const container = document.getElementById('modalActions')!;
    container.innerHTML = '';
    btns.forEach(b => {
        const el = document.createElement('button');
        el.innerText = b.txt;
        el.className = `modal-btn ${b.cl}`;
        el.onclick = b.fn;
        container.appendChild(el);
    });
    const bc = document.createElement('button');
    bc.innerText = 'CANCELAR';
    bc.className = 'modal-btn btn-secondary-modal';
    bc.onclick = fecharModal;
    container.appendChild(bc);
    document.getElementById('modalApp')!.style.display = 'flex';
};

const fecharModal = () => {
    document.getElementById('modalApp')!.style.display = 'none';
};

const abrirConfirmacao = (titulo: string, mensagem: string, fnConfirmar: () => Promise<void>, textoConfirmar = 'OK', textoCancelar = 'CANCELAR') => {
    abrirModal(titulo, mensagem, [
        { txt: textoConfirmar, cl: 'btn-primary-modal', fn: async () => {
            await fnConfirmar();
            fecharModal();
        }}
    ]);
};

const showLoading = () => {
    document.getElementById('loadingIndicator')!.style.display = 'block';
};

const hideLoading = () => {
    document.getElementById('loadingIndicator')!.style.display = 'none';
};
