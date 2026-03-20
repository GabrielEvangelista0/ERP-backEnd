const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Hash de senha
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// Comparar senha
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = { hashPassword, comparePassword };
