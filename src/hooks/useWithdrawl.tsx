
import Counter from '../contracts/counter';
import { useTonClient } from './useTonClient';
import { useAsyncInitialize } from './useAsyncInitialize';
import { useTonConnect } from './useTonConnect';
import { Address, OpenedContract } from '@ton/core';
import { useTonAddress } from '@tonconnect/ui-react';

export function useWithdrawl() {
  const rawAddress = useTonAddress();
  const client = useTonClient();
  const { sender } = useTonConnect();

  const counterContract = useAsyncInitialize(async () => {
    if (!client) return;
    const contract = new Counter(
      Address.parse('EQCZZf-tYwUOzP_F7WD_j6bs8-jfqUzJZtIyLOFIozh5iLOR') // replace with your address from tutorial 2 step 8
    );
    return client.open(contract) as OpenedContract<Counter>;
  }, [client]);

  
  return {
    sendMoney: (amount: any) => {
      return counterContract?.sendMoney(sender, rawAddress, amount.toString());
    },
  };
}
