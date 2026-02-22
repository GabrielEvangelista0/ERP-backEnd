const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM fornecedores ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM fornecedores WHERE id = $1', [id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, contato, email, endereco } = req.body;
    const result = await db.query(
      'INSERT INTO fornecedores (nome, contato, email, endereco) VALUES ($1,$2,$3,$4) RETURNING *',
      [nome, contato || null, email || null, endereco || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, contato, email, endereco } = req.body;
    const result = await db.query(
      'UPDATE fornecedores SET nome=$1, contato=$2, email=$3, endereco=$4 WHERE id=$5 RETURNING *',
      [nome, contato || null, email || null, endereco || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM fornecedores WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
