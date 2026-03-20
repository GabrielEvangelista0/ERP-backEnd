const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/compras - Lista todas as compras com total de itens
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.id, c.fornecedor_id, c.usuario_id, c.total, c.data, c.observacoes,
             f.nome as fornecedor_nome, u.nome as usuario_nome,
             COUNT(ic.id) as quantidade_itens
      FROM compras c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN itens_compra ic ON c.id = ic.compra_id
      GROUP BY c.id, c.fornecedor_id, c.usuario_id, c.total, c.data, c.observacoes, f.nome, u.nome
      ORDER BY c.data DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compras/:id - Com detalhes dos itens
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const compraResult = await db.query(
      `SELECT c.id, c.fornecedor_id, c.usuario_id, c.total, c.data, c.observacoes,
              f.nome as fornecedor_nome, u.nome as usuario_nome,
              COUNT(ic.id) as quantidade_itens
       FROM compras c
       JOIN fornecedores f ON c.fornecedor_id = f.id
       JOIN usuarios u ON c.usuario_id = u.id
       LEFT JOIN itens_compra ic ON c.id = ic.compra_id
       WHERE c.id = $1
       GROUP BY c.id, c.fornecedor_id, c.usuario_id, c.total, c.data, c.observacoes, f.nome, u.nome`,
      [id]
    );

    if (compraResult.rowCount === 0) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    const itensResult = await db.query(
      `SELECT ic.id, ic.produto_id, ic.quantidade, ic.preco_unitario, ic.subtotal,
              p.nome as produto_nome, p.codigo
       FROM itens_compra ic
       JOIN produtos p ON ic.produto_id = p.id
       WHERE ic.compra_id = $1`,
      [id]
    );

    const compra = compraResult.rows[0];
    compra.itens = itensResult.rows;

    res.json(compra);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compras/:id/itens - Apenas os itens de uma compra
router.get('/:id/itens', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a compra existe
    const compraCheck = await db.query('SELECT id FROM compras WHERE id = $1', [id]);
    if (compraCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    const itensResult = await db.query(
      `SELECT ic.id, ic.compra_id, ic.produto_id, ic.quantidade, ic.preco_unitario, ic.subtotal,
              p.nome as produto_nome, p.codigo
       FROM itens_compra ic
       JOIN produtos p ON ic.produto_id = p.id
       WHERE ic.compra_id = $1
       ORDER BY ic.id`,
      [id]
    );

    res.json(itensResult.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compras - Criar compra com itens (RF07)
router.post('/', async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { fornecedor_id, itens, observacoes } = req.body;

    if (!fornecedor_id || !itens || itens.length === 0) {
      return res.status(400).json({ error: 'fornecedor_id e itens são obrigatórios' });
    }

    await client.query('BEGIN');

    // Verificar fornecedor
    const fornecedorCheck = await client.query('SELECT id FROM fornecedores WHERE id = $1', [fornecedor_id]);
    if (fornecedorCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    let total = 0;
    const itensValidados = [];

    // Validar e calcular total
    for (const item of itens) {
      const produtoResult = await client.query(
        'SELECT id, preco FROM produtos WHERE id = $1',
        [item.produto_id]
      );

      if (produtoResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Produto ${item.produto_id} não encontrado` });
      }

      const produto = produtoResult.rows[0];
      const subtotal = produto.preco * item.quantidade;
      total += subtotal;

      itensValidados.push({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: produto.preco,
        subtotal
      });
    }

    // Criar compra
    const compraResult = await client.query(
      `INSERT INTO compras (fornecedor_id, usuario_id, total, observacoes)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [fornecedor_id, req.user.id, total, observacoes || null]
    );

    const compraId = compraResult.rows[0].id;

    // Inserir itens e atualizar estoque (RF05 - Controle de estoque)
    for (const item of itensValidados) {
      await client.query(
        `INSERT INTO itens_compra (compra_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [compraId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
      );

      // Atualizar estoque
      await client.query(
        'UPDATE produtos SET quantidade = quantidade + $1, updated_at = now() WHERE id = $2',
        [item.quantidade, item.produto_id]
      );
    }

    // Criar conta a pagar (RF10)
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 30); // 30 dias

    await client.query(
      `INSERT INTO contas_pagar (compra_id, fornecedor_id, valor, tipo, data_vencimento)
       VALUES ($1, $2, $3, $4, $5)`,
      [compraId, fornecedor_id, total, 'compra', dataVencimento.toISOString().split('T')[0]]
    );

    // Registrar log (RF14)
    await client.query(
      `INSERT INTO logs (usuario_id, acao, tabela, registro_id, detalhes)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'CREATE', 'compras', compraId, JSON.stringify({ fornecedor_id, total, itens: itensValidados })]
    );

    await client.query('COMMIT');

    const novaCompra = await db.query(
      `SELECT c.id, c.fornecedor_id, c.usuario_id, c.total, c.data, c.observacoes,
              f.nome as fornecedor_nome, u.nome as usuario_nome
       FROM compras c
       JOIN fornecedores f ON c.fornecedor_id = f.id
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = $1`,
      [compraId]
    );

    res.status(201).json(novaCompra.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/compras/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;

    const result = await db.query(
      'UPDATE compras SET observacoes = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [observacoes || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/compras/:id - Cancelar compra (reverter estoque)
router.delete('/:id', requireRole(['admin', 'gerente']), async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const itensResult = await client.query(
      'SELECT produto_id, quantidade FROM itens_compra WHERE compra_id = $1',
      [id]
    );

    // Reverter estoque
    for (const item of itensResult.rows) {
      await client.query(
        'UPDATE produtos SET quantidade = quantidade - $1, updated_at = now() WHERE id = $2',
        [item.quantidade, item.produto_id]
      );
    }

    await client.query('DELETE FROM itens_compra WHERE compra_id = $1', [id]);
    await client.query('DELETE FROM contas_pagar WHERE compra_id = $1', [id]);

    const result = await client.query('DELETE FROM compras WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    await client.query(
      `INSERT INTO logs (usuario_id, acao, tabela, registro_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'DELETE', 'compras', id]
    );

    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
