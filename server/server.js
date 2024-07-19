import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';
import { WebSocketServer } from 'ws';

const { Pool } = pkg;

const app = express();
const port = 4000;
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

const server = app.listen(port, '0.0.0.0', () => {
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

let timerInterval;
let timerRunning = false;
let lastBetter = null;
const adminAccount = 'UQCUs2k9DWlrpMmPHxroiMdpc96DCvAcsut0Nd5T6mL3b1Dp'; // Замените на реальный адрес администратора

// Функция для генерации случайного числа в диапазоне [min, max]
const getRandomTime = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const startTimer = async () => {
  if (timerRunning) {
    return;
  }
  timerRunning = true;
  let remainingTime = getRandomTime(10, 120);
  console.log(remainingTime); // Случайное число от 10 секунд до 2 минут
  broadcastToClients({ type: 'timerUpdate', time: remainingTime });

  timerInterval = setInterval(async () => {
    remainingTime -= 1;
    broadcastToClients({ type: 'timerUpdate', time: remainingTime });

    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      
      // Подсчет общего balancebet и удаление всех записей из accountsbet
      try {
        const result = await pool.query('SELECT SUM(amountbet) as totalbalancebet FROM accountsbet');
        const totalBalanceBet = result.rows[0].totalbalancebet || 0;
        const adminShare = totalBalanceBet * 0.1; // 10% на другой адрес
        const userShare = totalBalanceBet * 0.9; // 90% на последнего пользователя

        // Добавление общей доли к аккаунту администратора
        if (adminAccount) {
          await pool.query('UPDATE accounts SET balance = balance + $1 WHERE account = $2', [adminShare, adminAccount]);
        }

        // Добавление общей доли к последнему пользователю, сделавшему ставку
        if (lastBetter) {
          await pool.query('UPDATE accounts SET balance = balance + $1 WHERE account = $2', [userShare, lastBetter]);
          await pool.query('INSERT INTO balancewinhistory (account, balancewin) VALUES ($1, $2)', [lastBetter, totalBalanceBet]);

        }

        await pool.query('DELETE FROM accountsbet');
        await pool.query('DELETE FROM bethistory');
        broadcastToClients({ type: 'resetHistory', totalBalanceBet, lastBetter });
        lastBetter = null; // Сбрасываем последнего игрока после завершения таймера
      } catch (err) {
        console.error('Error resetting history:', err);
      }
    }
  }, 1000);
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

      // Создаем таблицу transactionHistory для нового аккаунта
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS transactionHistory_${account} (
          id SERIAL PRIMARY KEY,
          account VARCHAR(255) NOT NULL,
          contractAddr VARCHAR(255) NOT NULL,
          lt BIGINT NOT NULL,
          status INT NOT NULL,
          amountBalance INT NOT NULL,
          transactionDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await pool.query(createTableQuery);

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
    } else {
      // Аккаунт не существует, создаем новый и устанавливаем ставки
      await pool.query('INSERT INTO accountsbet (account, amountbet, lastbet) VALUES ($1, $2, $3)', [account, amountbet, lastbet]);
    }
    
    // Сохранение ставки в таблице bethistory
    await pool.query('INSERT INTO bethistory (account, balancebet) VALUES ($1, $2)', [account, amountbet]);
    res.json({ success: true });

    broadcastToClients({ type: 'historyUpdate', account, amountbet });
    lastBetter = account; // Обновляем последнего игрока
    startTimer();
  } catch (err) {
    console.error('Error setting balance bet:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/recent-bets', async (req, res) => {
  try {
    
    const result = await pool.query('SELECT * FROM bethistory ORDER BY id DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recent bets:', err);
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

app.get('/winner', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM balancewinhistory ORDER BY id DESC LIMIT 1');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recent bets:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// Маршрут для получения последней строки из таблицы transactionHistory_<account>
app.get('/last-transaction/:account/:status', async (req, res) => {
  const { account, status } = req.params;
  const parsedStatus = parseInt(status);

  if (isNaN(parsedStatus) || ![-100, 100].includes(parsedStatus)) {
    return res.status(400).json({ error: 'Invalid status code. Only -100 and 100 are allowed.' });
  }

  try {
    const updateStatus = parsedStatus === -100 ? -200 : 200;

    // Обновляем все записи, которые старше 24 часов, устанавливая им новый статус
    const updateQuery = `
      UPDATE transactionHistory_${account}
      SET status = ${updateStatus}
      WHERE status = ${parsedStatus} AND transactionDate <= NOW() - INTERVAL '24 hours'
    `;
    await pool.query(updateQuery);

    // Извлекаем все записи с указанным статусом и датой транзакции в пределах последних 24 часов
    const selectQuery = `
      SELECT * FROM transactionHistory_${account}
      WHERE status = ${parsedStatus} AND transactionDate > NOW() - INTERVAL '24 hours'
    `;
    const result = await pool.query(selectQuery);

    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.status(404).json({ error: `No transactions with status ${parsedStatus} found within the last 24 hours` });
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});




// Маршрут для добавления информации о новой транзакции
app.post('/new-transaction', async (req, res) => {
  const { account, contractAddr, lt, status, amountBalance } = req.body;
  try {
    // Создаем запрос для добавления новой транзакции в таблицу transactionHistory_<account>
    const insertQuery = `
      INSERT INTO transactionHistory_${account} (account, contractAddr, lt, status, amountBalance)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(insertQuery, [account, contractAddr, lt, status, amountBalance]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding new transaction:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


// Маршрут для обновления статуса транзакции в таблице transactionHistory_<account>
app.post('/update-transaction-status', async (req, res) => {
  const { id, account, lt, newStatus } = req.body;
  try {
    // Создаем запрос для обновления lt и status по id
    const updateQuery = `
      UPDATE transactionHistory_${account}
      SET lt = $1, 
      status = $2
      WHERE id = $3
    `;
    const result = await pool.query(updateQuery, [lt, newStatus, id]);

    if (result.rowCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Transaction not found' });
    }
  } catch (err) {
    console.error('Error updating transaction status:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/get-transaction-by-lt/:account/:lt', async (req, res) => {
  const { account, lt } = req.params;
  try {
    // Создаем запрос для получения записи по lt
    const selectQuery = `
      SELECT 1 FROM transactionHistory_${account}
      WHERE lt = $1
    `;
    const result = await pool.query(selectQuery, [lt]);

    if (result.rows.length > 0) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error('Error fetching transaction by lt:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.post('/start-timer', (req, res) => {
  if (!timerRunning) {
    startTimer();
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Timer is already running' });
  }
});
