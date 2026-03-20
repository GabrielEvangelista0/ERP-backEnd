# ERP Backend (Express + PostgreSQL)

Backend robusto para sistema ERP com autenticação JWT, controle de estoque, contas a receber/pagar, relatórios e logs.

## 🚀 Instalação Rápida

### 1. Instalar dependências
```bash
cd backEnd
npm install
```

### 2. Configurar variáveis de ambiente
Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais Postgres:
```
DATABASE_URL=postgres://usuario:senha@localhost:5432/erp_db
JWT_SECRET=sua_chave_secreta_muito_longa
PORT=4000
```

### 3. Criar banco e aplicar schema
```bash
npm run create-db   # Cria o banco se não existir
npm run init-db     # Aplica o schema SQL
npm run seed        # Popula com dados de teste
```

### 4. Iniciar servidor
```bash
# Desenvolvimento (com auto-reload):
npm run dev

# Produção:
npm start
```

Servidor rodará em `http://localhost:4000`

---

## 📋 API Endpoints Principais

### 🔐 Autenticação (Pública)
```
POST   /api/auth/register        Registrar novo usuário
POST   /api/auth/login           Fazer login (retorna JWT)
```

### 👥 Usuários (Requer JWT)
```
GET    /api/usuarios             Listar (admin/gerente)
GET    /api/usuarios/:id         Obter detalhes
PUT    /api/usuarios/:id         Editar perfil
DELETE /api/usuarios/:id         Deletar (admin)
```

### 📦 Produtos
```
GET    /api/produtos             Listar todos
GET    /api/produtos/:id         Obter detalhes
POST   /api/produtos             Criar (admin/gerente)
PUT    /api/produtos/:id         Editar (admin/gerente)
DELETE /api/produtos/:id         Deletar (admin/gerente)
```

### 💳 Vendas (com controle de estoque automático)
```
GET    /api/vendas               Listar vendas
GET    /api/vendas/:id           Obter venda com itens
POST   /api/vendas               Criar venda
DELETE /api/vendas/:id           Cancelar venda (reverter estoque)
```

**POST /api/vendas** - Criar venda com itens:
```json
{
  "cliente_id": 1,
  "observacoes": "Nota opcional",
  "itens": [
    {"produto_id": 1, "quantidade": 2},
    {"produto_id": 2, "quantidade": 5}
  ]
}
```

### 📥 Compras (com controle de estoque automático)
```
GET    /api/compras              Listar compras
GET    /api/compras/:id          Obter compra com itens
POST   /api/compras              Criar compra
DELETE /api/compras/:id          Cancelar compra (reverter estoque)
```

### 💰 Financeiro

#### Contas a Receber
```
GET    /api/financeiro/contas-receber/          Listar
POST   /api/financeiro/contas-receber/          Criar manual
PUT    /api/financeiro/contas-receber/:id       Registrar pagamento
```

#### Contas a Pagar
```
GET    /api/financeiro/contas-pagar/            Listar
POST   /api/financeiro/contas-pagar/            Criar manual
PUT    /api/financeiro/contas-pagar/:id         Registrar pagamento
```

#### Fluxo de Caixa
```
GET    /api/financeiro/fluxo-caixa?inicial=2024-01-01&final=2024-12-31
```

### 📊 Relatórios
```
GET    /api/relatorios/vendas                   Relatório de vendas
GET    /api/relatorios/vendas-por-cliente       Vendas por cliente
GET    /api/relatorios/estoque                  Relatório de estoque
GET    /api/relatorios/estoque-baixo            Produtos com baixo estoque
GET    /api/relatorios/financeiro               Resumo financeiro
GET    /api/relatorios/logs                     Logs de auditoria (admin/gerente)
GET    /api/relatorios/logs/:usuario_id         Logs de usuário
```

---

## 🔑 Usuários Padrão (após npm run seed)

| Login | Senha | Tipo |
|-------|-------|------|
| admin | admin123 | admin |
| operador | operador123 | operador |

---

## 🔒 Autenticação com JWT

1. **Fazer login**:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","senha":"admin123"}'
```

2. **Usar token em requisições**:
```bash
curl -H "Authorization: Bearer seu_token_aqui" \
  http://localhost:4000/api/clientes
```

---

## 📁 Estrutura do Projeto

```
backEnd/
├── src/
│   ├── index.js                 # Entrada principal
│   ├── db.js                    # Pool de conexões Postgres
│   ├── middleware/
│   │   └── auth.js              # Autenticação JWT e roles
│   ├── routes/
│   │   ├── auth.js              # Login/Registro
│   │   ├── usuarios.js          # Gestão de usuários
│   │   ├── clientes.js          # Clientes
│   │   ├── produtos.js          # Produtos com FK fornecedor
│   │   ├── fornecedores.js      # Fornecedores
│   │   ├── vendas.js            # Vendas + itens + estoque
│   │   ├── compras.js           # Compras + itens + estoque
│   │   ├── financeiro.js        # Contas receber/pagar
│   │   └── relatorios.js        # Relatórios + logs
│   └── utils/
│       └── security.js          # Bcrypt hash/compare
├── scripts/
│   ├── init_db.sql              # Schema SQL completo
│   ├── create_db.js             # Criar banco via Node
│   ├── run_init_db.js           # Aplicar schema via Node
│   └── seed_db.js               # Popular dados
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ✨ Funcionalidades Implementadas

- ✅ **Autenticação JWT** - Login seguro com tokens
- ✅ **Bcrypt** - Senhas criptografadas (10 rounds)
- ✅ **Controle de Acesso** - Roles (admin, gerente, operador)
- ✅ **CRUD Completo** - Clientes, fornecedores, produtos, usuários
- ✅ **Vendas com Itens** - Múltiplos produtos por venda
- ✅ **Compras com Itens** - Múltiplos produtos por compra
- ✅ **Controle de Estoque** - Auto atualizado em vendas/compras
- ✅ **Contas a Receber** - Criadas automaticamente com vendas
- ✅ **Contas a Pagar** - Criadas automaticamente com compras
- ✅ **Fluxo de Caixa** - Cálculo automático de receitas/despesas
- ✅ **Relatórios** - Vendas, estoque, financeiro
- ✅ **Auditoria** - Logs de todas as operações
- ✅ **Transações ACID** - Integridade de dados garantida
- ✅ **Índices** - Performance otimizada

---

## 🛠️ Comandos Disponíveis

```bash
npm run dev          # Desenvolvimento com auto-reload (nodemon)
npm start            # Produção
npm run create-db    # Cria banco de dados
npm run init-db      # Aplica schema SQL
npm run seed         # Popula com dados de teste
```

---

## 📝 Notas Importantes

- **Senhas** são criptografadas com bcrypt (10 rounds)
- **JWTs** expiram em 24 horas
- **Estoque** é atualizado automaticamente quando vendas/compras são criadas
- **Contas** a receber/pagar são criadas automaticamente com vendas/compras
- **Deletar** venda/compra reverte estoque automaticamente
- Todas as operações são **registradas em logs** para auditoria
- Banco usa **transações** para garantir integridade de dados

---

## 🔧 Troubleshooting

**Erro: banco de dados não existe**
```bash
npm run create-db
```

**Erro: schema não aplicado**
```bash
npm run init-db
```

**Erro: sem dados de teste**
```bash
npm run seed
```

**Resetar banco completamente**
```bash
npm run create-db && npm run init-db && npm run seed
```

---

Desenvolvido com ❤️ para ERP | Express + PostgreSQL + JWT
