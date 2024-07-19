import { useEffect, useState, useRef } from 'react';
import Counter from '../contracts/counter';
import { useTonClient } from './useTonClient';
import { useAsyncInitialize } from './useAsyncInitialize';
import { useTonConnect } from './useTonConnect';
import { Address, OpenedContract } from '@ton/core';
import { useTonAddress } from '@tonconnect/ui-react';

export function useCounterContract() {
  const rawAddress = useTonAddress();
  const client = useTonClient();
  const [val, setVal] = useState<null | string>(null);
  const { sender } = useTonConnect();
  const prevValRef = useRef<string | null>(null);

  const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

  const counterContract = useAsyncInitialize(async () => {
    if (!client) return;
    const contract = new Counter(
      Address.parse('EQAunf-Pn16zTTLildDPDoZpxilpTLYPqatVrTWM8a6K7IE8') // replace with your address from tutorial 2 step 8
    );
    return client.open(contract) as OpenedContract<Counter>;
  }, [client]);
 
  
  useEffect(() => {
    async function getValue() {
      if (!counterContract) return;
      const val = await counterContract.getAddr(rawAddress);

      // Only update state if the value has changed
      if (prevValRef.current !== val.toString()) {
        prevValRef.current = val.toString();
        setVal(val.toString());
      }

      await sleep(5000); // sleep 5 seconds and poll value again
      getValue();
    }
    getValue();
  }, [counterContract, rawAddress]);

  return {
    value: (Number(val) / 10 ** 9).toString(),
    sendMoneyInContract: (amount: any) => {
      
      return counterContract?.sendMoneyInContract(sender, rawAddress, amount.toString());
    },
    addr: counterContract?.address.toString()
  };
}



