const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/fornecedores
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.id, f.nome, f.contato, f.email, f.telefone, f.endereco, f.usuario_id,
              u.nome as usuario_nome
       FROM fornecedores f
       LEFT JOIN usuarios u ON f.usuario_id = u.id
       ORDER BY f.id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fornecedores/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT f.id, f.nome, f.contato, f.email, f.telefone, f.endereco, f.usuario_id,
              u.nome as usuario_nome
       FROM fornecedores f
       LEFT JOIN usuarios u ON f.usuario_id = u.id
       WHERE f.id = $1`,
      [id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fornecedores
router.post('/', async (req, res) => {
  try {
    const { nome, contato, email, telefone, endereco } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await db.query(
      'INSERT INTO fornecedores (nome, contato, email, telefone, endereco, usuario_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nome, contato || null, email || null, telefone || null, endereco || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/fornecedores/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, contato, email, telefone, endereco } = req.body;

    const result = await db.query(
      `UPDATE fornecedores SET nome=$1, contato=$2, email=$3, telefone=$4, endereco=$5, updated_at=now()
       WHERE id=$6 RETURNING *`,
      [nome, contato || null, email || null, telefone || null, endereco || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fornecedores/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // check for related purchases
    const comprasRes = await db.query('SELECT COUNT(*) FROM compras WHERE fornecedor_id = $1', [id]);
    if (parseInt(comprasRes.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Não é possível excluir: existem compras vinculadas ao fornecedor' });
    }

    // check for related accounts payable
    const contasRes = await db.query('SELECT COUNT(*) FROM contas_pagar WHERE fornecedor_id = $1', [id]);
    if (parseInt(contasRes.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Não é possível excluir: existem contas a pagar vinculadas ao fornecedor' });
    }

    const result = await db.query('DELETE FROM fornecedores WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
