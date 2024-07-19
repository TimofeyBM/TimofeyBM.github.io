import { useState, useEffect } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonConnect } from './hooks/useTonConnect';
import { useCounterContract } from './hooks/useCounterContract';
import { useTonAddress } from '@tonconnect/ui-react';
import { useTonClient } from './hooks/useTonClient';
import '@twa-dev/sdk';
import { useWithdrawl } from './hooks/useWithdrawl';
import axios from 'axios';
import { Address } from '@ton/core';

function App() {
  const { connected } = useTonConnect();
  const [amount, setAmount] = useState(() => {
    const savedAmount = localStorage.getItem('amount');
    return savedAmount !== null ? savedAmount : '0';
  });
  const { value, sendMoneyInContract, addr } = useCounterContract();
  const { sendMoney, flag } = useWithdrawl();
  const rawAddress = useTonAddress();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceChanges, setBalanceChanges] = useState<string[]>([]);
  const [timer, setTimer] = useState<number | null>(null);
  const [totalBalanceBet, setTotalBalanceBet] = useState<number | null>(null);
  const [lastBetter, setLastBetter] = useState<string | null>(null);
  const client = useTonClient()

  useEffect(() => {
      if(flag == false){
          fetchBalanceFromDB(Address.parse(rawAddress).toString()).then((dbBalance) => {
            if(dbBalance != null){
              handleSendMoneyDB(dbBalance, parseFloat(amount) * 1_000_000_000);
            }      
        }
      )}
  });

  useEffect(() => {
    if (rawAddress) {
      handleCheckOrCreateAccount();
    }
  }, [rawAddress]);
  useEffect(() => {
    const interval = setInterval(() => {
      checkTransactionOut();
      checkTransactionIn();
     
    }, 1000);

    return () => clearInterval(interval);
  }, [value]);
  
  const checkTransactionOut = async () => {
    try{
      const addressFrom = Address.parse(rawAddress);
    
      if(addr != undefined && addressFrom != undefined){
        const addressTo = Address.parse(addr)
        const lt = await client?.getTransactions(addressTo, {
          limit: 10
        })
     
        const responseOut = await axios.get(`http://localhost:4000/last-transaction/${addressFrom}/${100}`);
        const lastTransactionOut = responseOut.data;
        
        if(lt !== undefined && responseOut != undefined){

        for(let i =0; i < lt.length; i++){
          for(let j = 0; j < lastTransactionOut.length; j++){
            
              const code = lt[i].description.computePhase.exitCode;
              const codelt = lt[i].lt;
              const srcAddr = lt[i].inMessage?.info.src 
              const destAddr = lt[i].inMessage?.info.dest
              let valueout = -10000;
              try{
                valueout = lt[i].outMessages.get(0)?.info.value.coins;
              }catch{
                valueout = -10000;
              }
              
              const findLt = await axios.get(`http://localhost:4000/get-transaction-by-lt/${addressFrom}/${Number(codelt)}`);

              
              if(srcAddr == lastTransactionOut[j].account && destAddr?.toString() == lastTransactionOut[j].contractaddr && lastTransactionOut[j].status == 100 && Number(valueout) == lastTransactionOut[j].amountbalance && findLt.data.exists == false){

                
                if(code == 0){  
                  await axios.post('http://localhost:4000/update-transaction-status', {id: lastTransactionOut[j].id,  account: lastTransactionOut[j].account, lt: Number(codelt),  newStatus: code})
                  .then(() => {
                  console.log("new status");
                  })
                  .catch(error => console.error('Error', error));
                  const responseBalance = await fetchBalanceFromDB(addressFrom.toString());
                  console.log("TRANSACTION OUT!!!!!!!!!!", responseBalance, lastTransactionOut[j].amountbalance); 
                }else{
                  await axios.post('http://localhost:4000/update-transaction-status', {id: lastTransactionOut[j].id,  account: lastTransactionOut[j].account, lt: Number(codelt),  newStatus: code})
                  .then(() => {
                  console.log("new status");
                  })  
                  .catch(error => console.error('Error', error));
                  const responseBalance = await fetchBalanceFromDB(addressFrom.toString());
                  if(responseBalance != null){
                    handleSendMoneyDB(responseBalance , lastTransactionOut[j].amountbalance)
                  }             
                }  
              }
              else{
                continue
              }  
            }
          }
          
        }
      } 
    }catch{
      
        
    }
    
  }
  

const checkTransactionIn = async () => {
  try{
    const addressFrom = Address.parse(rawAddress);
  
  if(addr != undefined && addressFrom != undefined){
    const addressTo = Address.parse(addr)
    const lt = await client?.getTransactions(addressTo, {
      limit: 10
    })
    const response = await axios.get(`http://localhost:4000/last-transaction/${addressFrom}/${-100}`);
    const lastTransaction = response.data;


    if(lt !== undefined && response != undefined){
    for(let i =0; i < lt.length; i++){
      
      for(let j = 0; j < lastTransaction.length; j++){

          const code = lt[i].description.computePhase.exitCode;
          const codelt = lt[i].lt;
          const srcAddr = lt[i].inMessage?.info.src 
          const destAddr = lt[i].inMessage?.info.dest
          const value = lt[i].inMessage?.info.value.coins
          const findLt = await axios.get(`http://localhost:4000/get-transaction-by-lt/${addressFrom}/${Number(codelt)}`);

          if(srcAddr == lastTransaction[j].account && destAddr?.toString() == lastTransaction[j].contractaddr && lastTransaction[j].status == -100, Number(value) == lastTransaction[j].amountbalance && findLt.data.exists == false){
              if(code == 0){
                
                await axios.post('http://localhost:4000/update-transaction-status', {id: lastTransaction[j].id,  account: lastTransaction[j].account, lt: Number(codelt),  newStatus: code})
                .then(() => {
                console.log("new status");
          
                })
                .catch(error => console.error('Error', error));
                const responseBalance = await fetchBalanceFromDB(addressFrom.toString());
                console.log("TRANSACTION!!!!!!!!!!", responseBalance, lastTransaction[j].amountbalance);
                if(responseBalance != null){
                  handleSendMoneyDB(responseBalance , lastTransaction[j].amountbalance)
                }
                
              }
              else{
                await axios.post('http://localhost:4000/update-transaction-status', {id: lastTransaction[j].id,  account: lastTransaction[j].account, lt: Number(codelt),  newStatus: code})
                .then(() => {
                console.log("new status");
    
                })
                .catch(error => console.error('Error', error));
              }     
          } 
          else{
            continue
          }  
        }
      }
      
    }
  } 
  }catch{

  }
  
}

  // useEffect(() => {
  //   const interval = setInterval(() => {
     
      
  //     const savedValue = localStorage.getItem('value');
  //     if (savedValue !== value && (value !== "0" || value !== undefined)) {
  //       if (rawAddress && value != undefined) {
  //         fetchBalanceFromDB(rawAddress).then((dbBalance) => {
  //           const savedAmount = localStorage.getItem('amount');
  //           const newBalance = savedAmount !== null ? parseFloat(savedAmount) * 1_000_000_000 : 0;
  //           if (dbBalance != null && newBalance != 0) {
  //             if (newBalance + dbBalance > dbBalance) {
  //               console.log("SEND MONEY IN DB");
  //               setLastCallTime(0);
  //               handleSendMoneyDB(dbBalance, newBalance);
  //             } else if (newBalance + dbBalance < dbBalance) {
  //               setLastCallTime(0);
  //               console.log("SEND MONEY OUT DB", newBalance);
  //               handleSendMoneyOutDB(dbBalance, newBalance);
  //             }
  //             localStorage.setItem('amount', '0');
  //           }
  //         });
  //       }
  //       localStorage.setItem('value', value);
  //     }
  //   }, 100);

  //   return () => clearInterval(interval);
  // }, [value]);
  
  interface Bet {
    account: string;
    balancebet: number;
  }
  useEffect(() => {
    const fetchRecentBets = async () => {
      try {
      
        const response = await axios.get('http://localhost:4000/recent-bets');
        const bets: Bet[] = response.data;
       
        
        const formattedBets = bets.map((bet: Bet) => `${bet.account.slice(0, 15)}... +${bet.balancebet / 1_000_000_000} TONs`);
      console.log(formattedBets);
        
        setBalanceChanges(formattedBets);
      } catch (error) {
        console.error('Error fetching recent bets:', error);
      }
    };
  
    fetchRecentBets();
  }, []);
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000/');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'historyUpdate') {
        setBalanceChanges((prevChanges) => {
          const newChanges = [`${message.account.slice(0, 15)}... +${message.amountbet / 1_000_000_000} TONs`, ...prevChanges];
          return newChanges.slice(0, 10); // Оставляем только последние 10 изменений
        });
      } else if (message.type === 'timerUpdate') {
        setTimer(message.time);
      } else if (message.type === 'resetHistory') {
        setBalanceChanges([]);
        setTotalBalanceBet(message.totalBalanceBet);
        setLastBetter(message.lastBetter);
        fetchBalanceFromDB(Address.parse(rawAddress).toString()).then((dbBalance) => { 
          if (dbBalance != null ) {
            
            setBalance((dbBalance) / 1_000_000_000);
            }    
          
        });
      }
    };

    return () => {
      ws.close();
    };
  }, []);
  
  


  useEffect(() => {
    const fetchLastWinner = async () => {
      try {
        const response = await axios.get('http://localhost:4000/winner');
        const winner = response.data;
        console.log(winner[0].account);

        setTotalBalanceBet(winner[0].balancewin);
        setLastBetter(winner[0].account);
      } catch (error) {
        console.error('Error fetching last winner:', error);
      }
    };

    fetchLastWinner();
  }, []);
  useEffect(() => {
    if (timer !== null) {
      const countdown = setInterval(() => {
        setTimer((prevTime) => {
          if (prevTime !== null && prevTime > 0) {
            return prevTime - 1;
          } else {
            clearInterval(countdown);
            return null;
          }
        });
      }, 1000);
      return () => clearInterval(countdown);
    }
  }, [timer]);

  const fetchBalanceFromDB = async (account: string): Promise<number | null> => {
    try {
      const response = await axios.get('http://localhost:4000/balance', { params: { account } });
      console.log("CURRENT BALANCE", response.data.balance);
      return response.data.balance;
    } catch (error) {
      console.error('Error fetching balance from DB:', error);
      return null;
    }

  };

  const handleCheckOrCreateAccount = () => {
    axios.post('http://localhost:4000/create-account', { account: Address.parse(rawAddress).toString() })
      .then(response => {
       
        setBalance(response.data.balance / 1_000_000_000);
        console.log(response.data.balance, "RELOAD ACCOUNT");
      })
      .catch(error => console.error('Error checking or creating account:', error));
  };

  const handleSendMoneyDB = (dbBalance: number, newBalance: number) => {
    if (rawAddress) {
      const amountToSend = newBalance;
      axios.post('http://localhost:4000/increment', { account: Address.parse(rawAddress).toString(), amount: amountToSend })
        .then(() => {
          setBalance((dbBalance + newBalance) / 1_000_000_000);
        })
        .catch(error => console.error('Error incrementing balance:', error));
    } else {
      console.error('No account selected');
    }
    
  };

  // const handleSendMoneyOutDB = (dbBalance: number, newBalance: number) => {
  //   if (rawAddress) {
  //     console.log("SEND HANDLE ", newBalance);
  //     const amountToSend = newBalance;
  //     axios.post('http://localhost:4000/decrement', { account: Address.parse(rawAddress).toString(), amount: amountToSend })
  //       .then(() => {
  //         setBalance((dbBalance - newBalance) / 1_000_000_000);
  //         localStorage.setItem('amount', '0');
  //       })
  //       .catch(error => console.error('Error decrementing balance:', error));
  //   } else {
  //     console.error('No account selected');
  //   }
  // };

  const handleAmountChange = (event: any) => {
    const newAmount = event.target.value;
    setAmount(newAmount);
  };

  const [lastCallTime, setLastCallTime] = useState(0);
  const [message, setMessage] = useState('');
  const handleSendMoney = () => {
    const currentTime = Date.now();
    if (currentTime - lastCallTime >= 5000) { // 60000 миллисекунд = 1 минута
      sendMoneyInContract(amount);
      console.log(addr, "SENDE MOUNEW AAAADR");

      axios.post('http://localhost:4000/new-transaction', { account: Address.parse(rawAddress).toString(), contractAddr: addr, lt: 0, status: -100,  amountBalance: parseFloat(amount) * 1_000_000_000 })
      .then(() => {
        console.log("SEND RTSGVEVB");
       })
       .catch(error => console.error('Error decrementing balance:', error));
       
      setLastCallTime(currentTime);
    } else {
      setMessage('Пожалуйста, подождите выполнение предыдущей странзакции возбежании коллизий');
      setTimeout(() => {
        setMessage('');
      }, 2000);
    }
  };

  const handleSendOutMoney = async () => {
    const currentTime = Date.now();
    if (currentTime - lastCallTime >= 5000) { // 60000 миллисекунд = 1 минута
      
      console.log(amount);
    
      try {
        const balanceResponse = await axios.get('http://localhost:4000/balance', { params: { account: Address.parse(rawAddress).toString() } });
        const currentBalance = balanceResponse.data.balance;
        if (currentBalance != null) {
        
          if (currentBalance < parseFloat(amount) * 1_000_000_000) {
            console.log("insufficient balance");
          } else {
            axios.post('http://localhost:4000/decrement', { account: Address.parse(rawAddress).toString(), amount: parseFloat(amount) * 1_000_000_000 })
          .then(() => {
            setBalance((currentBalance - parseFloat(amount) * 1_000_000_000) / 1_000_000_000);
           })
           .catch(error => console.error('Error decrementing balance:', error));
            const tx =  sendMoney(amount);
            console.log(tx, "GEGERGER");
            
            axios.post('http://localhost:4000/new-transaction', { account: Address.parse(rawAddress).toString(), contractAddr: addr, lt: 0, status: 100,  amountBalance: parseFloat(amount) * 1_000_000_000 })
      .then(() => {
        console.log("SEND RTSGVEVB");
       })
       .catch(error => console.error('Error decrementing balance:', error));
       
          }
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      }

      setLastCallTime(currentTime);
    } else {
      setMessage('Пожалуйста, подождите выполнение предыдущей странзакции возбежании коллизий');
      setTimeout(() => {
        setMessage('');
      }, 2000);
    }
  };

  const handleDecreaseBalance = async () => {
    if (rawAddress) {
      try {
        // Сначала выполняем GET-запрос для получения текущего баланса
        const balanceResponse = await axios.get('http://localhost:4000/balance', { params: { account: Address.parse(rawAddress).toString() } });
  
        if (balanceResponse.status === 200) {
          const currentBalance = balanceResponse.data.balance;
  
          // Проверяем, достаточно ли баланса для ставки
          if (currentBalance ===  0 || currentBalance - 1000000 < 0) {
            console.error('Insufficient balance for placing bet');
            return; // Прекращаем выполнение функции
          }
  
          // Уменьшаем баланс через decrement
          const decrementResponse = await axios.post('http://localhost:4000/decrement', { account: Address.parse(rawAddress).toString(), amount: 1000000 });
  
          if (decrementResponse.status === 200) {
            // Выполняем POST-запрос для обновления ставки
            const postResponse = await axios.post('http://localhost:4000/set-balance-bet', { account: Address.parse(rawAddress).toString(), amountbet: 1000000, lastbet: 1 });
  
            if (postResponse.status === 200) {
              // Если POST-запрос успешен, выполняем GET-запрос для получения обновленного баланса
              const getResponse = await axios.get('http://localhost:4000/balance-bet', { params: { account: Address.parse(rawAddress).toString() } });
  
              if (getResponse.status === 200) {
                //const newBalance = getResponse.data.amountbet;
  
                // Обновляем баланс в состоянии
                setBalance((currentBalance - 1000000) / 1_000_000_000);
                //setBalanceChanges(prevChanges => [...prevChanges, `Bet placed: ${newBalance / 1_000_000_000} TONs`]);
                startTimer(); // Запускаем таймер при первой ставке
              }
            }
          } else {
            console.error('Error decrementing balance:', decrementResponse);
          }
        }
      } catch (error) {
        console.error('Error placing bet:', error);
      }
    }
  };
  
  
  

  const startTimer = () => {
    axios.post('http://localhost:4000/start-timer')
      .catch(error => console.error('Error starting timer:', error));
  };
 
  
  return ( <div className='App'>
  <div className='Container'>
    <TonConnectButton />
    
    

    
    <div className='ControlSection'>
      <input
        type="text"
        value={amount}
        onChange={handleAmountChange}
        className="AmountInput"
      />
     <div>
      
     
    </div>
      <button className={`Button ${connected ? 'Active' : 'Disabled'}`} onClick={handleSendMoney}>
        Deposit
      </button>
      <button className={`Button ${connected ? 'Active' : 'Disabled'}`} onClick={handleSendOutMoney}>
        Withdraw
      </button>
      <div className='BalanceSection'>
      <b>Balance</b>
      <div className='BalanceValue'>{balance !== null ? balance.toString() : 'Loading...'}</div>
    </div>
    
    </div>

    <div>
        {message}
      </div>

    <div className='BetSection'>
      <button className={`Button ${connected ? 'Active' : 'Disabled'}`} onClick={handleDecreaseBalance}>
        BET
      </button>
    </div>
    <div>
        <b>Total Bet Amount</b>
        <div>{totalBalanceBet !== null ? totalBalanceBet / 1_000_000_000 : 0} TONs</div>
      </div>
    <div className='InfoSection'>
      <div>
        <b>Last Better</b>
        <div>{lastBetter}</div>
      </div>
      
    </div>

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
