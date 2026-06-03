const API_BASE = '/api';

export interface ContaItem {
    tipo: string;
    local: string;
    pedido: string;
    codFor: string;
    fornecedor: string;
    cc: string;
    valor: number;
    vencimento: string;
    pagamento: string;
    status: string;
    mes: string;
    dataImportacao?: string;
}

export type ContasData = Record<string, ContaItem>;

const getAuthToken = () => localStorage.getItem('authToken') || '';

const apiFetch = async (url: string, init: RequestInit = {}) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...init, headers });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        throw new Error(data?.error || `Erro na requisição: ${response.status}`);
    }

    return data;
};

export const carregarDados = async (callback: (dados: ContasData | null) => void) => {
    const data = await apiFetch(`${API_BASE}/contas`);
    callback(data as ContasData);
};

export const salvarItem = async (item: ContaItem) => {
    try {
        await apiFetch(`${API_BASE}/contas`, {
            method: 'POST',
            body: JSON.stringify(item)
        });
    } catch (error) {
        throw new Error((error as Error).message || 'Erro ao salvar item');
    }
};

export const atualizarItem = async (id: string, campo: string | Record<string, unknown>, valor?: unknown) => {
    try {
        const dados = (typeof campo === 'object' && campo !== null) ? campo : { [campo]: valor };
        await apiFetch(`${API_BASE}/contas/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(dados)
        });
    } catch (error) {
        throw new Error((error as Error).message || 'Erro ao atualizar item');
    }
};

export const removerItem = async (id: string) => {
    try {
        await apiFetch(`${API_BASE}/contas/${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        throw new Error((error as Error).message || 'Erro ao remover item');
    }
};

export const obterItem = async (id: string) => {
    try {
        const data = await apiFetch(`${API_BASE}/contas/${id}`);
        return data as ContaItem;
    } catch (error) {
        throw new Error((error as Error).message || 'Erro ao obter item');
    }
};

export const verificarPedidoExistente = async (pedido: string, mes: string) => {
    try {
        const data = await apiFetch(`${API_BASE}/contas/check-pedido?pedido=${encodeURIComponent(pedido)}&mes=${encodeURIComponent(mes)}`);
        return data as ContaItem | null;
    } catch (error) {
        throw new Error((error as Error).message || 'Erro ao verificar pedido existente');
    }
};
