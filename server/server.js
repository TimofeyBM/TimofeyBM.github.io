import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';
import { WebSocketServer } from 'ws';

const { Pool } = pkg;

const app = express();
const port = 3001;

// Настройки подключения к PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',  // Измените на IP-адрес вашего PostgreSQL сервера
  database: 'mydatabase',
  password: 'mysecretpassword',
  port: 5432,
});

app.use(cors());
app.use(bodyParser.json());

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
});

// Функция для отправки сообщения всем подключенным клиентам
const broadcastToClients = (message) => {
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

// Маршрут для получения текущего значения баланса из таблицы accounts
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

// Маршрут для увеличения значения баланса в таблице accounts
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

// Маршрут для уменьшения значения баланса в таблице accounts
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

// Маршрут для создания аккаунта в таблице accounts
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

// Маршрут для увеличения ставки в таблице accountsbet
app.post('/set-balance-bet', async (req, res) => {
  const { account, amountbet, lastbet } = req.body;
  try {
    const result = await pool.query('SELECT amountbet FROM accountsbet WHERE account = $1', [account]);
    if (result.rows.length > 0) {
      // Аккаунт существует, обновляем ставку
      await pool.query('UPDATE accountsbet SET amountbet = amountbet + $1, lastbet = $2 WHERE account = $3', [amountbet, lastbet, account]);
      res.json({ success: true });
     
      broadcastToClients({ type: 'historyUpdate', account, amountbet });
    } else {
      // Аккаунт не существует, создаем новый и устанавливаем ставки
      await pool.query('INSERT INTO accountsbet (account, amountbet, lastbet) VALUES ($1, $2, $3)', [account, amountbet, lastbet]);
      res.json({ success: true });
    ;
      broadcastToClients({ type: 'historyUpdate', account, amountbet });
    }
  } catch (err) {
    console.error('Error setting balance bet:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/balance-bet', async (req, res) => {
  const { account } = req.query;
  try {
    const result = await pool.query('SELECT amountbet, lastbet FROM accountsbet WHERE account = $1', [account]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  } catch (err) {
    console.error('Error fetching balance from accountsbet:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
