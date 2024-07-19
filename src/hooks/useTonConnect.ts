import { useState, useEffect } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Sender, SenderArguments } from '@ton/core';

export function useTonConnect(): { sender: Sender; connected: boolean; sended: boolean;  } {
  const [tonConnectUI] = useTonConnectUI();
  const [sendTx, setSendTx] = useState(true);
 

  const sendTransaction = async (args: SenderArguments) => {
    try {
      const result = await tonConnectUI.sendTransaction(
        {
          messages: [
            {
              address: args.to.toString(),
              amount: args.value.toString(),
              payload: args.body?.toBoc().toString('base64'),
            },
          ],
          validUntil: Date.now() + 5 * 60 * 1000,
        },
        {
          modals: ['before'],
          notifications: ['before', 'success', 'error'],
        }
      );
      
      console.log('Transaction sent successfully', result);
      setSendTx(true); // Transaction successful
     // Clear any previous error messages
    } catch (e) {
      const error = e as Error;
      if (error.message.includes('Transaction was rejected')) {
        console.error('Transaction was rejected:', error);
       
      } else if (error.message.includes('Transaction was not sent')) {
        console.error('Tpuss:',);
        setSendTx(false);
      } else {
        console.error('An unexpected error occurred:', error);
        
      }
    }
  };

  useEffect(() => {
    if (!sendTx) {
      const timer = setTimeout(() => {
        setSendTx(true);
      }, 100); // Adjust the delay as needed

      return () => clearTimeout(timer);
    }
  }, [sendTx]);

  return {
    sender: {
      send: sendTransaction,
    },
    connected: tonConnectUI.connected,
    sended: sendTx,
  };
}
