import Counter from '../contracts/counter';
import { useTonClient } from './useTonClient';
import { useAsyncInitialize } from './useAsyncInitialize';
import { useTonConnect } from './useTonConnect';
import { Address, OpenedContract } from '@ton/core';
import { useTonAddress } from '@tonconnect/ui-react';

export function useWithdrawl() {
  const rawAddress = useTonAddress();
  const client = useTonClient();
  const { sender, sended } = useTonConnect();

 

  const counterContract = useAsyncInitialize(async () => {
    if (!client) return;
    const contract = new Counter(
      Address.parse('EQAunf-Pn16zTTLildDPDoZpxilpTLYPqatVrTWM8a6K7IE8') // replace with your address from tutorial 2 step 8
    );
    return client.open(contract) as OpenedContract<Counter>;
  }, [client]);
 
  return {
    sendMoney: (amount: any) => {
      return counterContract?.sendMoney(sender, rawAddress, amount.toString());
    },
    flag: sended
  };
}
