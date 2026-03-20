const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_key_aqui_mudar_em_producao';

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// Middleware para verificar permissões por role
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.tipo)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
};

// Gerar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, login: user.login, tipo: user.tipo },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = { verifyToken, requireRole, generateToken, JWT_SECRET };
