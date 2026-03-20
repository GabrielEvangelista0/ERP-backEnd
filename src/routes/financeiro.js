const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// =================== CONTAS A RECEBER (RF11) ===================

// GET /api/financeiro/contas-receber
router.get('/contas-receber/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT cr.id, cr.venda_id, cr.cliente_id, cr.valor, cr.data_vencimento, 
             cr.data_pagamento, cr.status, cr.observacoes,
             c.nome as cliente_nome
      FROM contas_receber cr
      JOIN clientes c ON cr.cliente_id = c.id
      ORDER BY cr.data_vencimento
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/financeiro/contas-receber/:id
router.get('/contas-receber/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT cr.id, cr.venda_id, cr.cliente_id, cr.valor, cr.data_vencimento,
              cr.data_pagamento, cr.status, cr.observacoes, c.nome as cliente_nome
       FROM contas_receber cr
       JOIN clientes c ON cr.cliente_id = c.id
       WHERE cr.id = $1`,
      [id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/financeiro/contas-receber - Criar conta a receber manual
router.post('/contas-receber/', async (req, res) => {
  try {
    const { cliente_id, valor, data_vencimento, observacoes } = req.body;

    if (!cliente_id || !valor || !data_vencimento) {
      return res.status(400).json({ error: 'cliente_id, valor e data_vencimento são obrigatórios' });
    }

    const result = await db.query(
      `INSERT INTO contas_receber (cliente_id, valor, data_vencimento, observacoes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cliente_id, valor, data_vencimento, observacoes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/financeiro/contas-receber/:id - Registrar pagamento
router.put('/contas-receber/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data_pagamento, status } = req.body;

    const result = await db.query(
      `UPDATE contas_receber 
       SET data_pagamento = $1, status = $2, updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [data_pagamento || null, status || 'pago', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Conta a receber não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/financeiro/contas-receber/:id
router.delete('/contas-receber/:id', requireRole(['admin', 'gerente']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM contas_receber WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== CONTAS A PAGAR (RF10) ===================

// GET /api/financeiro/contas-pagar
router.get('/contas-pagar/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT cp.id, cp.compra_id, cp.fornecedor_id, cp.valor, cp.tipo, 
             cp.data_vencimento, cp.data_pagamento, cp.status, cp.observacoes,
             f.nome as fornecedor_nome
      FROM contas_pagar cp
      JOIN fornecedores f ON cp.fornecedor_id = f.id
      ORDER BY cp.data_vencimento
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/financeiro/contas-pagar/:id
router.get('/contas-pagar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT cp.id, cp.compra_id, cp.fornecedor_id, cp.valor, cp.tipo, 
              cp.data_vencimento, cp.data_pagamento, cp.status, cp.observacoes,
              f.nome as fornecedor_nome
       FROM contas_pagar cp
       JOIN fornecedores f ON cp.fornecedor_id = f.id
       WHERE cp.id = $1`,
      [id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/financeiro/contas-pagar - Criar conta a pagar manual
router.post('/contas-pagar/', async (req, res) => {
  try {
    const { fornecedor_id, valor, tipo, data_vencimento, observacoes } = req.body;

    if (!fornecedor_id || !valor || !tipo || !data_vencimento) {
      return res.status(400).json({ error: 'fornecedor_id, valor, tipo e data_vencimento são obrigatórios' });
    }

    const result = await db.query(
      `INSERT INTO contas_pagar (fornecedor_id, valor, tipo, data_vencimento, observacoes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fornecedor_id, valor, tipo, data_vencimento, observacoes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/financeiro/contas-pagar/:id - Registrar pagamento
router.put('/contas-pagar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data_pagamento, status } = req.body;

    const result = await db.query(
      `UPDATE contas_pagar 
       SET data_pagamento = $1, status = $2, updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [data_pagamento || null, status || 'pago', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Conta a pagar não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/financeiro/contas-pagar/:id
router.delete('/contas-pagar/:id', requireRole(['admin', 'gerente']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM contas_pagar WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== FLUXO DE CAIXA (RF12) ===================

// GET /api/financeiro/fluxo-caixa?inicial=2024-01-01&final=2024-12-31
router.get('/fluxo-caixa/', async (req, res) => {
  try {
    const { inicial, final } = req.query;
    const dataInicial = inicial || '2024-01-01';
    const dataFinal = final || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT 
        DATE(cr.data_vencimento) as data,
        SUM(CASE WHEN cr.status = 'pago' THEN cr.valor ELSE 0 END) as recebido,
        SUM(CASE WHEN cp.status = 'pago' THEN cp.valor ELSE 0 END) as pagado
      FROM contas_receber cr
      FULL OUTER JOIN contas_pagar cp ON DATE(cr.data_vencimento) = DATE(cp.data_vencimento)
      WHERE (cr.data_vencimento >= $1 AND cr.data_vencimento <= $2)
        OR (cp.data_vencimento >= $1 AND cp.data_vencimento <= $2)
      GROUP BY DATE(cr.data_vencimento)
      ORDER BY data
    `, [dataInicial, dataFinal]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
