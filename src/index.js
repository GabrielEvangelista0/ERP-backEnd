require('dotenv').config();
const express = require('express');
const app = express();

const authRouter = require('./routes/auth');
const clientesRouter = require('./routes/clientes');
const produtosRouter = require('./routes/produtos');
const usuariosRouter = require('./routes/usuarios');
const vendasRouter = require('./routes/vendas');
const comprasRouter = require('./routes/compras');
const fornecedoresRouter = require('./routes/fornecedores');
const financeiroRouter = require('./routes/financeiro');
const relatoriosRouter = require('./routes/relatorios');

app.use(express.json());

// CORS - Permite requisiçõess do frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rotas públicas
app.use('/api/auth', authRouter);

// Rotas protegidas  
app.use('/api/clientes', clientesRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/vendas', vendasRouter);
app.use('/api/compras', comprasRouter);
app.use('/api/fornecedores', fornecedoresRouter);
app.use('/api/financeiro', financeiroRouter);
app.use('/api/relatorios', relatoriosRouter);

// Health check
app.get('/', (req, res) => res.json({ 
  ok: true, 
  version: '1.0.0',
  message: 'ERP Backend API',
  endpoints: {
    auth: '/api/auth',
    clientes: '/api/clientes',
    produtos: '/api/produtos',
    usuarios: '/api/usuarios',
    vendas: '/api/vendas',
    compras: '/api/compras',
    fornecedores: '/api/fornecedores',
    financeiro: '/api/financeiro',
    relatorios: '/api/relatorios'
  }
}));

// Erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`\n✓ Servidor ERP rodando na porta ${port}\n`));
