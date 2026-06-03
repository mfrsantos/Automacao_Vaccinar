export const fmtMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export const parseMoeda = (s: string | number | null | undefined) => {
    if (typeof s === 'number') return s;
    if (s == null) return 0;

    let limpo = String(s).trim();

    if (limpo.includes(',') && limpo.includes('.')) {
        const ultimoVirgula = limpo.lastIndexOf(',');
        const ultimoPonto = limpo.lastIndexOf('.');

        if (ultimoVirgula > ultimoPonto) {
            limpo = limpo.replace(/\./g, '').replace(',', '.');
        } else {
            limpo = limpo.replace(/,/g, '');
        }
    } else if (limpo.includes(',')) {
        limpo = limpo.replace(',', '.');
    }

    limpo = limpo.replace(/[^\d.-]/g, '');
    return parseFloat(limpo) || 0;
};

export const validarData = (dataStr: string) => {
    const regex = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/;
    const match = regex.exec(dataStr);
    if (!match) return false;

    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const ano = match[3] ? Number(match[3]) : new Date().getFullYear();
    const data = new Date(ano, mes - 1, dia);

    return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
};

export const validarValor = (valor: string | number) => {
    const num = parseMoeda(valor);
    return !isNaN(num) && num >= 0;
};

export const mostrarErro = (mensagem: string) => {
    mostrarNotificacao(mensagem, 'erro', 'ERRO');
};

export const mostrarSucesso = (mensagem: string) => {
    mostrarNotificacao(mensagem, 'sucesso', 'SUCESSO');
};

export const mostrarAviso = (mensagem: string) => {
    mostrarNotificacao(mensagem, 'aviso', 'AVISO');
};

export const mostrarNotificacao = (mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso' = 'sucesso', titulo = '', duracao = 8000) => {
    const container = document.getElementById('notificacaoContainer');
    if (!container) return;

    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;

    let icone = '✓';
    if (tipo === 'erro') icone = '✕';
    if (tipo === 'aviso') icone = '⚠';

    const tituloHtml = titulo ? `<div class="notificacao-titulo">${titulo}</div>` : '';

    notificacao.innerHTML = `
        <div class="notificacao-icone">${icone}</div>
        <div class="notificacao-conteudo">
            ${tituloHtml}
            <div class="notificacao-mensagem">${mensagem}</div>
        </div>
        <button class="notificacao-fechar">×</button>
    `;

    container.appendChild(notificacao);

    notificacao.querySelector('.notificacao-fechar')?.addEventListener('click', () => {
        fecharNotificacao(notificacao);
    });

    if (duracao > 0) {
        setTimeout(() => {
            fecharNotificacao(notificacao);
        }, duracao);
    }
};

const fecharNotificacao = (notificacao: HTMLElement) => {
    notificacao.classList.add('saindo');
    setTimeout(() => {
        notificacao.remove();
    }, 300);
};

export type CSVRow = Record<string, string>;

export const parseCSV = (csvText: string): CSVRow[] => {
    const linhas = csvText.split(/\r?\n/).filter(l => l.trim());
    if (linhas.length < 2) return [];

    const cabecalhos = linhas[0].split(';').map(h =>
        h.trim().replace(/\ufeff/g, '').replace(/^"|"$/g, '')
    );

    const dados: CSVRow[] = linhas.slice(1).map(linha => {
        const valores: string[] = [];
        let valor = '';
        let dentroAspas = false;

        for (let i = 0; i < linha.length; i++) {
            const char = linha[i];

            if (char === '"') {
                dentroAspas = !dentroAspas;
            } else if (char === ';' && !dentroAspas) {
                valores.push(valor.trim().replace(/^"|"$/g, ''));
                valor = '';
            } else {
                valor += char;
            }
        }

        valores.push(valor.trim().replace(/^"|"$/g, ''));

        const obj: CSVRow = {};
        cabecalhos.forEach((h, i) => {
            obj[h] = valores[i] || '';
        });
        return obj;
    });

    return dados;
};
