const path=require('node:path'),sharp=require('sharp');
const source=path.resolve(__dirname,'../../asset-sources/art-1.34.0');
const images=['club-marina','club-highland-chase','club-desert-pursuit','club-winter-duel','club-harbor-meet'];
(async()=>{for(const id of images)await sharp(path.join(source,id+'.png')).resize({width:1440,withoutEnlargement:true}).webp({quality:86}).toFile(path.resolve(__dirname,'../public/images/aeroline',id+'.webp'));
await sharp(path.join(source,'club-marina.png')).resize({width:960,withoutEnlargement:true}).webp({quality:86}).toFile(path.resolve(__dirname,'../public/images/stages/harbor-ring.webp'));
console.log('Imported five gallery scenes and Harbor Ring thumbnail from preserved source artwork.');
})().catch(error=>{console.error(error);process.exitCode=1;});

