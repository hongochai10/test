import { JsonRpcProvider, WebSocketProvider } from '@ethersproject/providers';
import networks from '@/helpers/networks.json';

export class Providers {
  public rpc?: JsonRpcProvider;
  public ws?: WebSocketProvider;

  async setNetwork() {

    this.rpc = new JsonRpcProvider('https://rpc.kardiachain.io');

    
    // const rpcUrl: any = networks[chainId].rpcUrl;
    
    // const rpcUrl: any = networks[chainId].rpcUrl;
    // this.rpc = new JsonRpcProvider(rpcUrl);
    // const wsUrl: any = networks[chainId].wsUrl;
    // this.ws = wsUrl ? new WebSocketProvider(wsUrl) : undefined;
  }
}

export default new Providers();
