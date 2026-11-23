import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{const audit=await server.ssrLoadModule('/scripts/fleetMapAudit.ts');await audit.auditFleetMaps(process.argv[2]||'../verification/fleet-map-baseline-1.33.1.json',60);}finally{await server.close();}
