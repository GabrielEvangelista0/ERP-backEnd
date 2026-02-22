require('dotenv').config();
const express = require('express');
const app = express();

const clientesRouter = require('./routes/clientes');
const produtosRouter = require('./routes/produtos');
const usuariosRouter = require('./routes/usuarios');
const vendasRouter = require('./routes/vendas');
const comprasRouter = require('./routes/compras');
const fornecedoresRouter = require('./routes/fornecedores');
const financeiroRouter = require('./routes/financeiro');

app.use(express.json());

app.use('/api/clientes', clientesRouter);
app.use('/api/produtos', produtosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/vendas', vendasRouter);
app.use('/api/compras', comprasRouter);
app.use('/api/fornecedores', fornecedoresRouter);
app.use('/api/financeiro', financeiroRouter);

app.get('/', (req, res) => res.json({ ok: true, version: '0.1.0' }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));
