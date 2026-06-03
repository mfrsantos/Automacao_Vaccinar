const API_BASE = '/api';
let authToken = localStorage.getItem('authToken') || '';

type AuthCallback = () => Promise<void> | void;

const getAuthHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    return headers;
};

const saveAuthToken = (token: string | null) => {
    authToken = token || '';
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
};

export const initAuth = async (onLogin: AuthCallback, onLogout: AuthCallback) => {
    if (!authToken) {
        onLogout();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/me`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Sessão inválida');
        }

        onLogin();
    } catch {
        saveAuthToken(null);
        onLogout();
    }
};

export const login = async (email: string, senha: string) => {
    const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, senha })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
    }

    saveAuthToken(data.idToken);
};

export const logout = async () => {
    saveAuthToken(null);
};
