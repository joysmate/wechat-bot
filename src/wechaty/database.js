import sqlite3 from 'sqlite3'

// 初始化数据库连接
let dbFile = './budda.db'
let db;

// 初始化数据库连接
export async function initDatabase() {
  db = new sqlite3.Database(dbFile);
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS user_texts (
          datetime DATETIME,
          user_id TEXT,
          text_content TEXT,
          role TEXT
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
  console.log(`Connected to the SQLite database at ${dbFile}`);
}

// 插入数据函数
export async function insertData(datetime, userId, textContent, role) {
  let insertSql = 'INSERT INTO user_texts (datetime, user_id, text_content, role) VALUES (?, ?, ?, ?)';
  await new Promise((resolve, reject) => {
    db.run(insertSql, [datetime, userId, textContent, role], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
  console.log(`Inserted data for user ${userId} at ${datetime}.`);
}

// 查询数据并生成带有角色的消息列表
export async function queryRecentTexts(userId, currentTime) {
  let fourHoursAgo = new Date(currentTime.getTime() - 4 * 60 * 60 * 1000);
  let fourHoursAgoSqlFormat = fourHoursAgo.toISOString().replace(/\.\d{3}Z$/, 'Z');

  let selectSql = `
    SELECT datetime, text_content, role, ROW_NUMBER() OVER (ORDER BY datetime) as row_num
    FROM user_texts 
    WHERE user_id = ? AND datetime >= ?
  `;

  let rows = await new Promise((resolve, reject) => {
    db.all(selectSql, [userId, fourHoursAgoSqlFormat], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

  let msgs = [];

  rows.forEach((row, index) => {
    console.log('index:', index)
    msgs.push({role: row.role, content: row.text_content});
  });

  return msgs;
}
