# ERP Backend (Express + Postgres)

Estrutura inicial do backend para a aplicação front-end do projeto.

Passos rápidos:

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`.
2. Instale dependências:

```bash
cd backEnd
npm install
```

3. Crie o banco de dados Postgres (ex: `erp_db`) e rode o script SQL:

```bash
# se você tiver o `psql` disponível:
# psql -d erp_db -f scripts/init_db.sql

# se não tiver `psql` (Windows) use os scripts Node auxiliares abaixo:

# 1) defina `DATABASE_URL` apontando para o banco desejado (ex: postgres://postgres:senha@localhost:5432/erp_db)
# 2) crie o banco (se não existir):
npm run create-db
# 3) aplique o schema:
npm run init-db
```

4. Rode o servidor em modo de desenvolvimento:

```bash
npm run dev
```

APIs expostas em `/api/*` (ex: `/api/clientes`, `/api/produtos`, `/api/usuarios`, `/api/vendas`, `/api/compras`, `/api/fornecedores`, `/api/financeiro`).
