import { Contract, ContractProvider, Sender, Address, Cell, toNano, contractAddress, beginCell, TupleBuilder } from "@ton/core";

export default class Counter implements Contract {

  static createForDeploy(code: Cell, initialCounterValue: number): Counter {
    const data = beginCell()
      .storeUint(initialCounterValue, 64)
      .storeUint(initialCounterValue, 64)
      .endCell();
    const workchain = 0; // deploy to workchain 0
    const address = contractAddress(workchain, { code, data });
    return new Counter(address, { code, data });
  }
  // export default class Counter implements Contract {

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: "0.01", // send 0.01 TON to contract for rent
      bounce: false
    });
  }
  // export default class Counter implements Contract {
  async getwalletbalance(provider: ContractProvider){
    const { stack } = await provider.get("getBalance", []);
    

    return stack.readBigNumber();
  }
  
  

  //8009D477667046E67CD6C1013F80948E0165147F8806BE08D452AC77872D62586E1_




async sendMoney(provider: ContractProvider, via: Sender, toAddress: string, amount: string) {
  const addr = Address.parse(toAddress);
  const messageBody = beginCell()
    .storeUint(2, 32)
    .storeAddress(addr)
    .storeCoins(toNano(amount)) 
    .storeUint(0, 64) 
    .endCell();
    
  await provider.internal(via, {
    value: "0.01", 
    body: messageBody
  });
}
async sendWithdrawlMoney(provider: ContractProvider, via: Sender, toAddress: string, amount: string) {
  const addr = Address.parse(toAddress);
  const messageBody = beginCell()
    .storeUint(3, 32)
    .storeAddress(addr)
    .storeCoins(toNano(amount)) 
    .storeUint(0, 64) 
    .endCell();
    
  await provider.internal(via, {
    value: "0.005", 
    body: messageBody
  });
}
async sendMoneyInContract(provider: ContractProvider, via: Sender, toAddress: string, amount: string){
  const addr = Address.parse(toAddress);
  const messageBody = beginCell()
    .storeUint(1, 32)
    .storeAddress(addr)
    .storeUint(0, 64) 
    .endCell();
    
  await provider.internal(via, {
    value: toNano(amount), 
    body: messageBody,
    bounce: true
  });
}

async getAddr(provider: ContractProvider, address: string) {
  const addr = Address.parse(address)
  const builder = new TupleBuilder(); 
  builder.writeAddress(addr);
  const tuple = builder.build();
  
  const { stack } = await provider.get("get_key_value_int", [tuple[0]]);

  return stack.readBigNumber();
}
  constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}
}
