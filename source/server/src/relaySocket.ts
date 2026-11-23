/** Transport contract shared by the Node relay and edge WebSocket adapters. */
export interface RelaySocket {
  readonly readyState:number;
  readonly bufferedAmount?:number;
  send(serialized:string):void;
  close(code?:number,reason?:string):void;
}
