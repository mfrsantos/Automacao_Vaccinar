import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDist = path.basename(__dirname) === 'dist';
const publicRoot = isDist ? path.join(__dirname, '..') : __dirname;

const firebaseDatabaseURL = process.env.FIREBASE_DATABASE_URL || '';
const firebaseApiKey = process.env.FIREBASE_API_KEY || '';

const serviceAccount = getServiceAccount();

if (!firebaseDatabaseURL) {
    console.warn('FIREBASE_DATABASE_URL não definido. Defina esta variável de ambiente para conectar ao Firebase.');
}

function getServiceAccount() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        } catch (error) {
            console.warn('FIREBASE_SERVICE_ACCOUNT_JSON inválido:', error);
        }
    }

    const serviceAccountPath = path.join(publicRoot, 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
        return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    }

    return null;
}

const credential = serviceAccount
    ? admin.credential.cert(serviceAccount)
    : admin.credential.applicationDefault();

admin.initializeApp({
    credential,
    databaseURL: firebaseDatabaseURL
});

const db = admin.database();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(publicRoot));

const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.replace('Bearer ', '');
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        (req as any).user = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    if (!firebaseApiKey) {
        return res.status(500).json({ error: 'FIREBASE_API_KEY não está configurada' });
    }

    try {
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: senha, returnSecureToken: true })
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(401).json({ error: data.error?.message || 'Credenciais inválidas' });
        }

        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao autenticar usuário' });
    }
});

app.get('/api/me', authenticate, (_req, res) => {
    return res.json({ ok: true });
});

app.get('/api/contas', authenticate, async (_req, res) => {
    try {
        const snapshot = await db.ref('contas').get();
        return res.json(snapshot.val() || {});
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao carregar lançamentos' });
    }
});

app.get('/api/contas/:id', authenticate, async (req, res) => {
    try {
        const snapshot = await db.ref(`contas/${req.params.id}`).get();
        return res.json(snapshot.val() || null);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao obter item' });
    }
});

app.post('/api/contas', authenticate, async (req, res) => {
    try {
        const newItemRef = await db.ref('contas').push(req.body);
        return res.json({ id: newItemRef.key });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao salvar item' });
    }
});

app.patch('/api/contas/:id', authenticate, async (req, res) => {
    try {
        await db.ref(`contas/${req.params.id}`).update(req.body);
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar item' });
    }
});

app.delete('/api/contas/:id', authenticate, async (req, res) => {
    try {
        await db.ref(`contas/${req.params.id}`).remove();
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao remover item' });
    }
});

app.get('/api/contas/check-pedido', authenticate, async (req, res) => {
    const pedido = String(req.query.pedido || '').trim();
    const mes = String(req.query.mes || '').trim();

    if (!pedido || !mes) {
        return res.status(400).json({ error: 'Pedido e mês são obrigatórios' });
    }

    try {
        const snapshot = await db.ref('contas').get();
        const dados = snapshot.val() || {};

        for (const item of Object.values(dados)) {
            if ((item as any).pedido === pedido && (item as any).mes === mes) {
                return res.json(item);
            }
        }

        return res.json(null);
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar pedido existente' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
