const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Todas as rotas de produtos requerem autenticação
router.use(verifyToken);

// GET /api/produtos - Listar todos os produtos
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.codigo, p.nome, p.descricao, p.categoria, p.preco, p.quantidade,
             p.fornecedor_id, f.nome as fornecedor_nome
      FROM produtos p
      LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
      ORDER BY p.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/produtos/:id - Obter detalhes do produto
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT p.id, p.codigo, p.nome, p.descricao, p.categoria, p.preco, p.quantidade,
              p.fornecedor_id, f.nome as fornecedor_nome
       FROM produtos p
       LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
       WHERE p.id = $1`,
      [id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/produtos - Criar novo produto
router.post('/', requireRole(['admin', 'gerente']), async (req, res) => {
  try {
    const { codigo, nome, descricao, categoria, preco, quantidade, fornecedor_id } = req.body;

    if (!codigo || !nome) {
      return res.status(400).json({ error: 'Código e nome são obrigatórios' });
    }

    const result = await db.query(
      `INSERT INTO produtos (codigo, nome, descricao, categoria, preco, quantidade, fornecedor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, codigo, nome, descricao, categoria, preco, quantidade, fornecedor_id`,
      [codigo, nome, descricao || null, categoria || null, preco || 0, quantidade || 0, fornecedor_id || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/produtos/:id - Editar produto
router.put('/:id', requireRole(['admin', 'gerente']), async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nome, descricao, categoria, preco, quantidade, fornecedor_id } = req.body;

    const result = await db.query(
      `UPDATE produtos
       SET codigo=$1, nome=$2, descricao=$3, categoria=$4, preco=$5, quantidade=$6,
           fornecedor_id=$7, updated_at=now()
       WHERE id=$8
       RETURNING id, codigo, nome, descricao, categoria, preco, quantidade, fornecedor_id`,
      [codigo, nome, descricao || null, categoria || null, preco || 0, quantidade || 0, fornecedor_id || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/produtos/:id - Deletar produto
router.delete('/:id', requireRole(['admin', 'gerente']), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se há itens de venda relacionados
    const itensVenda = await db.query(
      'SELECT COUNT(*) as count FROM itens_venda WHERE produto_id = $1',
      [id]
    );

    if (parseInt(itensVenda.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar este produto. Existem vendas que utilizam este produto.' 
      });
    }

    // Verificar se há itens de compra relacionados
    const itensCompra = await db.query(
      'SELECT COUNT(*) as count FROM itens_compra WHERE produto_id = $1',
      [id]
    );

    if (parseInt(itensCompra.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar este produto. Existem compras que utilizam este produto.' 
      });
    }

    const result = await db.query('DELETE FROM produtos WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
