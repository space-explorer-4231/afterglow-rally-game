import {parseLapGhost,serializeLapGhost,type LapGhostRecord} from './lapGhost';
const PREFIX='aeroline_ghost_124:';
const INDEX=PREFIX+'index';
const MAX_RECORDS=6;
/** Scoped replay key includes car, track, tires, drivetrain, transmission and assists. */
export function lapGhostKey(map:string,car:string,tire:string,drive:string,transmission:string,abs:boolean,tcs:boolean,esp:boolean):string {
  return PREFIX+[map,car,tire,drive,transmission,Number(abs),Number(tcs),Number(esp)].join(':');
}
function catalog():string[]{
  try{
    const raw:unknown=JSON.parse(localStorage.getItem(INDEX)??'[]');
    return Array.isArray(raw)?raw.filter((key):key is string=>typeof key==='string'&&key.startsWith(PREFIX)&&key!==INDEX&&key.length<220).slice(-MAX_RECORDS):[];
  }catch{return [];}
}
/** Storage denial or a damaged replay never prevents driving. */
export function loadLapGhost(key:string,checkpoints:number):LapGhostRecord|null {
  try{return parseLapGhost(localStorage.getItem(key),checkpoints);}catch{return null;}
}
/** Retain at most six recent setup records to bound browser storage usage. */
export function saveLapGhost(key:string,record:LapGhostRecord):boolean {
  try{
    const keys=catalog().filter(item=>item!==key);
    // Repair an incomplete catalog without inspecting or evicting unrelated game data.
    for(let i=0;i<localStorage.length;i++){
      const owned=localStorage.key(i);
      if(owned&&owned.startsWith(PREFIX)&&owned!==INDEX&&owned!==key&&!keys.includes(owned))keys.unshift(owned);
    }
    const encoded=serializeLapGhost(record);if(encoded.length>700000)return false;
    while(keys.length>=MAX_RECORDS){const oldest=keys.shift();if(oldest)localStorage.removeItem(oldest);}
    localStorage.setItem(key,encoded);keys.push(key);localStorage.setItem(INDEX,JSON.stringify(keys));return true;
  }catch{return false;}
}
/** Clear only owned replay entries when the user resets track records. */
export function clearLapGhosts():void {
  try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith(PREFIX))localStorage.removeItem(key);}}catch{/* Optional storage. */}
}
