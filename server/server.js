import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';

const { Pool } = pkg;

const app = express();
const port = 3001;

// Настройки подключения к PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: '192.168.3.22',  // Измените на IP-адрес вашего PostgreSQL сервера
  database: 'mydatabase',
  password: 'mysecretpassword',
  port: 5432,
});

app.use(cors());
app.use(bodyParser.json());

// Маршрут для получения текущего значения баланса
app.get('/balance', async (req, res) => {
  const { account } = req.query;
  try {
    const result = await pool.query('SELECT balance FROM accounts WHERE account = $1', [account]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching balance:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Маршрут для увеличения значения баланса
app.post('/increment', async (req, res) => {
  const { account, amount } = req.body;
  try {
    await pool.query('UPDATE accounts SET balance = balance + $1 WHERE account = $2', [amount, account]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error incrementing balance:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Маршрут для уменьшения значения баланса
app.post('/decrement', async (req, res) => {
  const { account, amount } = req.body;
  try {
    await pool.query('UPDATE accounts SET balance = balance - $1 WHERE account = $2', [amount, account]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error decrementing balance:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Маршрут для создания аккаунта
app.post('/create-account', async (req, res) => {
  const { account } = req.body;
  try {
    const result = await pool.query('SELECT balance FROM accounts WHERE account = $1', [account]);
    if (result.rows.length > 0) {
      // Аккаунт существует, возвращаем текущий баланс
      res.json({ success: true, balance: result.rows[0].balance });
    } else {
      // Аккаунт не существует, создаем новый и устанавливаем баланс на 0
      await pool.query('INSERT INTO accounts (account, balance) VALUES ($1, 0)', [account]);
      res.json({ success: true, balance: 0 });
    }
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
