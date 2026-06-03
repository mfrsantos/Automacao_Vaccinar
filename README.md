# ERP Vaccinar TI

Sistema de controle de contas a pagar para a empresa Vaccinar, focado no departamento de TI.

## Migração para Node.js + TypeScript

A aplicação foi completamente migrada de um SPA (Single Page Application) com Firebase Client SDK para uma arquitetura moderna com:
- **Frontend**: TypeScript compilado com esbuild
- **Backend**: Express.js com Firebase Admin SDK
- **API REST**: Autenticação JWT e acesso centralizado aos dados
- **Banco**: Firebase Realtime Database

## Funcionalidades

- ✅ **Autenticação**: Login com Firebase Auth (via API backend segura)
- ✅ **Gestão de Contas**: Adicionar, editar, remover notas de serviço e produto
- ✅ **Filtros**: Por mês, filial e busca por texto
- ✅ **Ações**: Enviar e-mails para processamento, aprovação de valores altos
- ✅ **Importação CSV**: Importar dados de notas via arquivo CSV
- ✅ **Relatórios**: Totais pendentes e enviados
- ✅ **Limpeza**: Deletar todos os lançamentos de um mês

## Arquitetura

### Backend (Node.js + Express)
```
server.ts
├─ POST /api/login          → Firebase Auth
├─ GET /api/me              → Validação JWT
├─ GET /api/contas          → Listar todos (requer auth)
├─ GET /api/contas/:id      → Obter um (requer auth)
├─ POST /api/contas         → Criar (requer auth)
├─ PATCH /api/contas/:id    → Atualizar (requer auth)
├─ DELETE /api/contas/:id   → Deletar (requer auth)
└─ GET /api/contas/check-pedido → Verificar duplicata (requer auth)
```

### Frontend (TypeScript)
```
app.ts
├─ auth.ts      → Login com JWT (localStorage)
├─ data.ts      → Fetch para API backend
├─ ui.ts        → Interface e eventos
├─ utils.ts     → Formatação, validação
└─ config.ts    → Constantes e configurações

index.html      → Interface principal
style.css       → Estilos
```

### Banco de Dados (Firebase Realtime Database)
```
contas/
├─ id1: { tipo, local, pedido, codFor, fornecedor, cc, valor, ... }
├─ id2: { ... }
└─ id3: { ... }
```

## Pré-requisitos

- **Node.js** 16+ 
- **npm** 8+
- **Conta Firebase** com:
  - Authentication (Email/Password)
  - Realtime Database
  - Web API Key
  - Service Account credentials

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie arquivo `.env` baseado em `.env.example`:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais Firebase:

```env
FIREBASE_API_KEY=AIzaSyD-mBgupzksWj93Jpu1itwBKky27Rzi-wU
FIREBASE_DATABASE_URL=https://seu-projeto.firebaseio.com
# Opção A: Arquivo serviceAccountKey.json
# Opção B: Variável FIREBASE_SERVICE_ACCOUNT_JSON={json}
```

### 3. Adicionar Credenciais do Firebase Admin

**Opção A: Via arquivo (recomendado)**

1. Firebase Console → Configurações do Projeto → Contas de Serviço
2. Clique em "Gerar nova chave privada"
3. Salve como `serviceAccountKey.json` na raiz do projeto

```bash
# Nunca comite este arquivo!
echo "serviceAccountKey.json" >> .gitignore
```

**Opção B: Via variável de ambiente**

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

### 4. Construir e Rodar

```bash
npm run build
npm start
```

Acesse: **http://localhost:3000**

## 📋 Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `PORT` | Não | Porta do servidor (padrão: 3000) |
| `FIREBASE_API_KEY` | **Sim** | Chave de API Web do Firebase |
| `FIREBASE_DATABASE_URL` | **Sim** | URL do Realtime Database |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Sim* | JSON credenciais Admin (ou arquivo) |

*Pode ser arquivo `serviceAccountKey.json` OU variável

## 🛠️ Scripts

```bash
npm install          # Instalar dependências
npm run build        # Compilar frontend + backend
npm run build:client # Compilar apenas frontend (app.js)
npm run build:server # Compilar apenas backend (dist/server.js)
npm start            # Iniciar em produção (porta 3000)
npm run dev          # Iniciar em desenvolvimento (auto-reload)
```

## 📡 Rotas da API

### Autenticação (sem requerimento de token)

**POST /api/login**
```json
{
  "email": "user@example.com",
  "senha": "senha123"
}
```
Retorna:
```json
{
  "idToken": "eyJhbGc...",
  "localId": "...",
  "email": "user@example.com",
  "expiresIn": "3600"
}
```

**GET /api/me**
- Valida token JWT na sessão
- Retorna: `{ ok: true }`

### Lançamentos (requerem `Authorization: Bearer {idToken}`)

**GET /api/contas**
- Retorna: `{ id1: {...}, id2: {...}, ... }`

**GET /api/contas/:id**
- Retorna: `{ tipo, local, pedido, ... }`

**POST /api/contas**
```json
{
  "tipo": "SERVICO",
  "local": "MATRIZ",
  "pedido": "123456",
  "codFor": "001",
  "fornecedor": "EMPRESA XYZ",
  "cc": "1001",
  "valor": 5000,
  "vencimento": "30/06",
  "pagamento": "BOLETO",
  "status": "Pendente",
  "mes": "JUNHO"
}
```
Retorna: `{ id: "nova-chave" }`

**PATCH /api/contas/:id**
```json
{
  "status": "Enviado ao CSC",
  "valor": 5500
}
```
Retorna: `{ ok: true }`

**DELETE /api/contas/:id**
- Remove o lançamento
- Retorna: `{ ok: true }`

**GET /api/contas/check-pedido?pedido=123456&mes=JUNHO**
- Verifica se pedido já existe neste mês
- Retorna: `{ ...item }` ou `null`

## 🔐 Segurança

- ⚠️ **Nunca comite** `serviceAccountKey.json`
- ⚠️ **Nunca comite** `.env` com credenciais reais
- ✅ Use `.gitignore` para proteger credenciais
- ✅ Credenciais Admin não são expostas ao cliente
- ✅ JWT expira automaticamente
- ✅ Todas as operações requerem autenticação

## 🔄 Fluxo de Autenticação

1. Usuário acessa `http://localhost:3000`
2. Frontend verifica token no `localStorage`
3. Se não há token, exibe tela de login
4. Usuário digita email e senha
5. Cliente envia para `POST /api/login`
6. Servidor valida com Firebase Auth
7. Retorna JWT (`idToken`)
8. Cliente armazena em `localStorage`
9. Todas as requisições enviam: `Authorization: Bearer {token}`
10. Servidor valida token em cada chamada

## 📝 Estrutura do Banco de Dados

```json
{
  "contas": {
    "key1": {
      "tipo": "SERVICO",
      "local": "MATRIZ",
      "pedido": "123456",
      "codFor": "001",
      "fornecedor": "EMPRESA XYZ",
      "cc": "1001",
      "valor": 5000.00,
      "vencimento": "30/06",
      "pagamento": "BOLETO",
      "status": "Pendente",
      "mes": "JUNHO",
      "dataImportacao": "2026-06-03T12:00:00.000Z"
    },
    "key2": { ... }
  }
}
```

## 🐛 Troubleshooting

### Erro: "FIREBASE_API_KEY não está configurada"
```bash
# Verifique .env
cat .env

# Confirme chave em Firebase Console
# Configurações do Projeto → Chaves de API → Web Key
```

### Erro: "Credenciais do Firebase Admin inválidas"
```bash
# Opção 1: Verifique serviceAccountKey.json
ls -la serviceAccountKey.json

# Opção 2: Verifique FIREBASE_SERVICE_ACCOUNT_JSON em .env
echo $FIREBASE_SERVICE_ACCOUNT_JSON

# Opção 3: Gere nova chave em Firebase Console
# Configurações → Contas de Serviço → Gerar chave
```

### Erro: "Unauthorized" na API
```bash
# Limpe localStorage
# DevTools → Application → Local Storage → Limpar

# Ou faça login novamente
```

### Porta 3000 já em uso
```bash
# Use outra porta
PORT=3001 npm start

# Ou mate o processo
# Windows: netstat -ano | findstr :3000
# Linux: lsof -i :3000
```

### Arquivo `.map` muito grande
- Ignorar em produção (remover após build)
- Útil apenas para debug local
- Define `sourcemap: false` em esbuild se necessário

## 📚 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | TypeScript, esbuild, Express (static) |
| Backend | Express.js, Firebase Admin SDK |
| Banco | Firebase Realtime Database |
| Autenticação | Firebase Authentication (JWT) |
| Compilação | TypeScript Compiler, esbuild |
| Runtime | Node.js |

## 📦 Dependências Principais

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "firebase-admin": "^13.10.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "ts-node-dev": "^2.0.0",
    "esbuild": "^0.19.4",
    "@types/node": "^20.14.2",
    "@types/express": "^4.17.17"
  }
}
```

## 🎓 Exemplo de Uso (cURL)

### Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","senha":"senha123"}'
```

### Listar Contas
```bash
curl -X GET http://localhost:3000/api/contas \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

### Criar Conta
```bash
curl -X POST http://localhost:3000/api/contas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"tipo":"SERVICO","local":"MATRIZ",...}'
```

## 📞 Suporte

- [Firebase Docs](https://firebase.google.com/docs)
- [Express.js Docs](https://expressjs.com/)
- [TypeScript Docs](https://www.typescriptlang.org/)

## 📄 Licença

Propriedade da Empresa Vaccinar
