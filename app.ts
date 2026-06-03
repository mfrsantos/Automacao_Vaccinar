import { initAuth } from './auth.ts';
import { carregarDados } from './data.ts';
import { initUI, onLogin, onLogout, setDados } from './ui.ts';

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
