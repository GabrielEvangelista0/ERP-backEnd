const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// =================== RELATÓRIOS (RF13) ===================

// GET /api/relatorios/vendas?inicial=2024-01-01&final=2024-12-31
router.get('/vendas/', async (req, res) => {
  try {
    const { inicial, final } = req.query;
    const dataInicial = inicial || '2024-01-01';
    const dataFinal = final || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT 
        DATE(v.data) as data,
        COUNT(v.id) as quantidade_vendas,
        SUM(v.total) as total_vendido,
        AVG(v.total) as media_venda,
        COUNT(DISTINCT v.cliente_id) as clientes_unicos
      FROM vendas v
      WHERE v.data >= $1 AND v.data <= $2
      GROUP BY DATE(v.data)
      ORDER BY data DESC
    `, [dataInicial, dataFinal]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/vendas-por-cliente?inicial=2024-01-01&final=2024-12-31
router.get('/vendas-por-cliente/', async (req, res) => {
  try {
    const { inicial, final } = req.query;
    const dataInicial = inicial || '2024-01-01';
    const dataFinal = final || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT 
        c.id,
        c.nome,
        COUNT(v.id) as total_vendas,
        SUM(v.total) as total_gasto,
        AVG(v.total) as media_gasto
      FROM clientes c
      LEFT JOIN vendas v ON c.id = v.cliente_id AND v.data >= $1 AND v.data <= $2
      GROUP BY c.id, c.nome
      ORDER BY total_gasto DESC
    `, [dataInicial, dataFinal]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/estoque
router.get('/estoque/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id,
        p.codigo,
        p.nome,
        p.descricao,
        p.categoria,
        p.preco,
        p.quantidade,
        (p.quantidade * p.preco) as valor_total_estoque,
        f.nome as fornecedor_nome
      FROM produtos p
      LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
      ORDER BY p.categoria, p.nome
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/estoque-baixo?quantidade=10
router.get('/estoque-baixo/', async (req, res) => {
  try {
    const { quantidade } = req.query;
    const limiteEstoque = parseInt(quantidade) || 10;

    const result = await db.query(`
      SELECT 
        p.id,
        p.codigo,
        p.nome,
        p.quantidade,
        p.preco,
        f.nome as fornecedor_nome
      FROM produtos p
      LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
      WHERE p.quantidade <= $1
      ORDER BY p.quantidade ASC
    `, [limiteEstoque]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/financeiro?inicial=2024-01-01&final=2024-12-31
router.get('/financeiro/', async (req, res) => {
  try {
    const { inicial, final } = req.query;
    const dataInicial = inicial || '2024-01-01';
    const dataFinal = final || new Date().toISOString().split('T')[0];

    const crsResult = await db.query(`
      SELECT 
        SUM(valor) as total_a_receber,
        SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as total_recebido,
        SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente,
        SUM(CASE WHEN status = 'atrasado' THEN valor ELSE 0 END) as total_atrasado
      FROM contas_receber
      WHERE data_vencimento >= $1 AND data_vencimento <= $2
    `, [dataInicial, dataFinal]);

    const cpsResult = await db.query(`
      SELECT 
        SUM(valor) as total_a_pagar,
        SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as total_pagado,
        SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente,
        SUM(CASE WHEN status = 'atrasado' THEN valor ELSE 0 END) as total_atrasado
      FROM contas_pagar
      WHERE data_vencimento >= $1 AND data_vencimento <= $2
    `, [dataInicial, dataFinal]);

    res.json({
      contas_receber: crsResult.rows[0],
      contas_pagar: cpsResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =================== LOGS (RF14) ===================

// GET /api/relatorios/logs
router.get('/logs/', requireRole(['admin', 'gerente']), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        l.id,
        l.usuario_id,
        l.acao,
        l.tabela,
        l.registro_id,
        l.detalhes,
        l.ip_address,
        l.created_at,
        u.nome as usuario_nome
      FROM logs l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 500
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/logs/:usuario_id - Logs de um usuário específico
router.get('/logs/:usuario_id', requireRole(['admin', 'gerente']), async (req, res) => {
  try {
    const { usuario_id } = req.params;

    const result = await db.query(`
      SELECT 
        l.id,
        l.usuario_id,
        l.acao,
        l.tabela,
        l.registro_id,
        l.detalhes,
        l.ip_address,
        l.created_at,
        u.nome as usuario_nome
      FROM logs l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      WHERE l.usuario_id = $1
      ORDER BY l.created_at DESC
      LIMIT 500
    `, [usuario_id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
