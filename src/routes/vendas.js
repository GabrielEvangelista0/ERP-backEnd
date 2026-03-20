const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/vendas - Lista todas as vendas com total de itens
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.id, v.cliente_id, v.usuario_id, v.total, v.data, v.observacoes,
             c.nome as cliente_nome, u.nome as usuario_nome,
             COUNT(iv.id) as quantidade_itens
      FROM vendas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN itens_venda iv ON v.id = iv.venda_id
      GROUP BY v.id, v.cliente_id, v.usuario_id, v.total, v.data, v.observacoes, c.nome, u.nome
      ORDER BY v.data DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendas/:id - Com detalhes dos itens
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vendaResult = await db.query(
      `SELECT v.id, v.cliente_id, v.usuario_id, v.total, v.data, v.observacoes,
              c.nome as cliente_nome, u.nome as usuario_nome,
              COUNT(iv.id) as quantidade_itens
       FROM vendas v
       JOIN clientes c ON v.cliente_id = c.id
       JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN itens_venda iv ON v.id = iv.venda_id
       WHERE v.id = $1
       GROUP BY v.id, v.cliente_id, v.usuario_id, v.total, v.data, v.observacoes, c.nome, u.nome`,
      [id]
    );

    if (vendaResult.rowCount === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const itensResult = await db.query(
      `SELECT iv.id, iv.produto_id, iv.quantidade, iv.preco_unitario, iv.subtotal,
              p.nome as produto_nome, p.codigo
       FROM itens_venda iv
       JOIN produtos p ON iv.produto_id = p.id
       WHERE iv.venda_id = $1`,
      [id]
    );

    const venda = vendaResult.rows[0];
    venda.itens = itensResult.rows;

    res.json(venda);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendas/:id/itens - Apenas os itens de uma venda
router.get('/:id/itens', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a venda existe
    const vendaCheck = await db.query('SELECT id FROM vendas WHERE id = $1', [id]);
    if (vendaCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const itensResult = await db.query(
      `SELECT iv.id, iv.venda_id, iv.produto_id, iv.quantidade, iv.preco_unitario, iv.subtotal,
              p.nome as produto_nome, p.codigo
       FROM itens_venda iv
       JOIN produtos p ON iv.produto_id = p.id
       WHERE iv.venda_id = $1
       ORDER BY iv.id`,
      [id]
    );

    res.json(itensResult.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendas - Criar venda com itens
// Body: { cliente_id, itens: [{produto_id, quantidade}], observacoes }
router.post('/', async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { cliente_id, itens, observacoes } = req.body;

    if (!cliente_id || !itens || itens.length === 0) {
      return res.status(400).json({ error: 'cliente_id e itens são obrigatórios' });
    }

    await client.query('BEGIN');

    // Verificar se cliente existe
    const clienteCheck = await client.query('SELECT id FROM clientes WHERE id = $1', [cliente_id]);
    if (clienteCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Calcular total e validar produtos
    let total = 0;
    const itensValidados = [];

    for (const item of itens) {
      const produtoResult = await client.query(
        'SELECT id, preco, quantidade FROM produtos WHERE id = $1',
        [item.produto_id]
      );

      if (produtoResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Produto ${item.produto_id} não encontrado` });
      }

      const produto = produtoResult.rows[0];

      if (produto.quantidade < item.quantidade) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Estoque insuficiente para produto ${item.produto_id}` });
      }

      const subtotal = produto.preco * item.quantidade;
      total += subtotal;

      itensValidados.push({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: produto.preco,
        subtotal
      });
    }

    // Criar venda
    const vendaResult = await client.query(
      `INSERT INTO vendas (cliente_id, usuario_id, total, observacoes)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [cliente_id, req.user.id, total, observacoes || null]
    );

    const vendaId = vendaResult.rows[0].id;

    // Inserir itens e atualizar estoque (RF05)
    for (const item of itensValidados) {
      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
      );

      // Atualizar estoque (RF05 - Controle de estoque)
      await client.query(
        'UPDATE produtos SET quantidade = quantidade - $1, updated_at = now() WHERE id = $2',
        [item.quantidade, item.produto_id]
      );
    }

    // Criar conta a receber (RF11)
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 30); // 30 dias

    await client.query(
      `INSERT INTO contas_receber (venda_id, cliente_id, valor, data_vencimento)
       VALUES ($1, $2, $3, $4)`,
      [vendaId, cliente_id, total, dataVencimento.toISOString().split('T')[0]]
    );

    // Registrar log (RF14)
    await client.query(
      `INSERT INTO logs (usuario_id, acao, tabela, registro_id, detalhes)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'CREATE', 'vendas', vendaId, JSON.stringify({ cliente_id, total, itens: itensValidados })]
    );

    await client.query('COMMIT');

    // Retornar venda criada
    const novaVenda = await db.query(
      `SELECT v.id, v.cliente_id, v.usuario_id, v.total, v.data, v.observacoes,
              c.nome as cliente_nome, u.nome as usuario_nome
       FROM vendas v
       JOIN clientes c ON v.cliente_id = c.id
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = $1`,
      [vendaId]
    );

    res.status(201).json(novaVenda.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/vendas/:id - Editar venda (simples, sem alterar itens)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;

    const result = await db.query(
      'UPDATE vendas SET observacoes = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [observacoes || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vendas/:id - Cancelar venda (reverter estoque)
router.delete('/:id', requireRole(['admin', 'gerente']), async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Buscar venda e itens
    const itensResult = await client.query(
      'SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = $1',
      [id]
    );

    // Reverter estoque
    for (const item of itensResult.rows) {
      await client.query(
        'UPDATE produtos SET quantidade = quantidade + $1, updated_at = now() WHERE id = $2',
        [item.quantidade, item.produto_id]
      );
    }

    // Deletar itens
    await client.query('DELETE FROM itens_venda WHERE venda_id = $1', [id]);

    // Deletar contas a receber
    await client.query('DELETE FROM contas_receber WHERE venda_id = $1', [id]);

    // Deletar venda
    const result = await client.query('DELETE FROM vendas WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    // Registrar log
    await client.query(
      `INSERT INTO logs (usuario_id, acao, tabela, registro_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'DELETE', 'vendas', id]
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
