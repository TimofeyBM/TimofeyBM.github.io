import './App.css';
import { useState, useEffect } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonConnect } from './hooks/useTonConnect';
import { useCounterContract } from './hooks/useCounterContract';
import { useTonAddress } from '@tonconnect/ui-react';
import '@twa-dev/sdk';
import { useWithdrawl } from './hooks/useWithdrawl';
import axios from 'axios';

function App() {
  const { connected } = useTonConnect();
  const [amount, setAmount] = useState(() => {
    const savedAmount = localStorage.getItem('amount');
    return savedAmount !== null ? savedAmount : '0';
  });
  const { value, sendMoneyInContract } = useCounterContract();
  const { sendMoney } = useWithdrawl();
  const rawAddress = useTonAddress();
  const [balance, setBalance] = useState<number | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [balanceChanges, setBalanceChanges] = useState<string[]>([]); // Новое состояние для отслеживания изменений баланса

  useEffect(() => {
    if (rawAddress) {
      handleCheckOrCreateAccount();
    }
  }, [rawAddress]);

  useEffect(() => {
    const interval = setInterval(() => {
      const savedValue = localStorage.getItem('value');
      if (savedValue !== value && (value !== "0" || value !== undefined)) {
        if (rawAddress && value != undefined) {
          fetchBalanceFromDB(rawAddress).then((dbBalance) => {
            const savedAmount = localStorage.getItem('amount');
            const newBalance = savedAmount !== null ? parseFloat(savedAmount) * 1_000_000_000 : 0;
            if (dbBalance != null && newBalance != 0) {
              if (newBalance + dbBalance > dbBalance) {
                console.log("SEND MONEY IN DB");
                handleSendMoneyDB(dbBalance, newBalance);
              } else if (newBalance + dbBalance < dbBalance) {
                console.log("SEND MONEY OUT DB", newBalance);
                handleSendMoneyOutDB(dbBalance, newBalance);
              }
              localStorage.setItem('amount', '0');
            }
          });
        }
        localStorage.setItem('value', value);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [value]);

  const fetchBalanceFromDB = async (account: string): Promise<number | null> => {
    try {
      const response = await axios.get('https://subgameserf.ru/balance', { params: { account } });
      console.log("CURRENT BALANCE", response.data.balance);
      return response.data.balance;
    } catch (error) {
      console.error('Error fetching balance from DB:', error);
      return null;
    }
  };

  const handleCheckOrCreateAccount = () => {
    axios.post('https://subgameserf.ru/create-account', { account: rawAddress })
      .then(response => {
        setCurrentAccount(rawAddress);
        setBalance(response.data.balance / 1_000_000_000);
        console.log(response.data.balance, "RELOAD ACCOUNT");
      })
      .catch(error => console.error('Error checking or creating account:', error));
  };

  const handleSendMoneyDB = (dbBalance: number, newBalance: number) => {
    if (rawAddress) {
      const amountToSend = newBalance;
      axios.post('https://subgameserf.ru/increment', { account: rawAddress, amount: amountToSend })
        .then(() => {
          setBalance((dbBalance + newBalance) / 1_000_000_000);
          localStorage.setItem('amount', '0');
        })
        .catch(error => console.error('Error incrementing balance:', error));
    } else {
      console.error('No account selected');
    }
  };

  const handleSendMoneyOutDB = (dbBalance: number, newBalance: number) => {
    if (rawAddress) {
      console.log("SEND HANDLE ", newBalance);
      const amountToSend = newBalance;
      axios.post('https://subgameserf.ru/decrement', { account: rawAddress, amount: amountToSend })
        .then(() => {
          setBalance((dbBalance - newBalance) / 1_000_000_000);
          localStorage.setItem('amount', '0');
        })
        .catch(error => console.error('Error decrementing balance:', error));
    } else {
      console.error('No account selected');
    }
  };

  const handleAmountChange = (event: any) => {
    const newAmount = event.target.value;
    setAmount(newAmount);
  };

  const handleSendMoney = () => {
    sendMoneyInContract(amount);
    localStorage.setItem('amount', amount);
  };

  const handleSendOutMoney = () => {
    const negativeAmount = (parseFloat(amount) * -1).toString();
    sendMoney(negativeAmount);
    localStorage.setItem('amount', negativeAmount);
  };

  const handleDecreaseBalance = async () => {
    if (rawAddress) {
      let savedBalance = localStorage.getItem('savedBalance');
      if (savedBalance) {
        let newBalance = Number(savedBalance) - 1000000;
        axios.post('https://subgameserf.ru/decrement', { account: rawAddress, amount: (parseFloat(savedBalance) - newBalance) })
          .then(() => {
            setBalance(newBalance / 1_000_000_000);
            setBalanceChanges(prevChanges => [...prevChanges, `Decremented by ${(parseFloat(savedBalance) - newBalance) / 1_000_000_000} TONs`]); // Добавляем запись об изменении баланса
            localStorage.setItem('savedBalance', newBalance.toString());
            console.log(`Decreased balance to: ${newBalance}`);
          })
          .catch(error => console.error('Error decrementing balance:', error));
      }
    }
  };

  return (
    <div className='App'>
      <div className='Container'> 
        <TonConnectButton />
        <div>
          <b>Raw Address</b>
          <div>{currentAccount?.slice(0, 30) + '...'}</div>
        </div>
        <div className='Card'>
          <b>Balance</b>
          <div>{balance !== null ? balance.toString() : 'Loading...'}</div>
        </div>
        <div className='Card'>
          <b>Current Amount</b>
          <div>{amount} TONs</div>
        </div>

        <input
          type="text"
          value={amount}
          onChange={handleAmountChange}
          className="AmountInput"
        />

        <a className={`Button ${connected ? 'Active' : 'Disabled'}`} onClick={handleSendMoney}>
          Deposit
        </a>
        <a className={`Button ${connected ? 'Active' : 'Disabled'}`} onClick={handleSendOutMoney}>
          Withdrawl
        </a>
        
        <a className={`Button ${connected ? 'Active' : 'Disabled'}`} onClick={handleDecreaseBalance}>
          BET
        </a>
        
        <div className='Card'>
          <b>Balance Changes</b>
          <ul>
            {balanceChanges.map((change, index) => (
              <li key={index}>{change}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
