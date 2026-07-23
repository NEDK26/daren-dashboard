const Database = require('better-sqlite3');

function createMemoryDatabase() {
  const db = new Database(':memory:');
  db.run = (sql, params = []) => {
    const values = Array.isArray(params) ? params : [params];
    return db.prepare(sql).run(...values);
  };
  return db;
}

module.exports = { createMemoryDatabase };
