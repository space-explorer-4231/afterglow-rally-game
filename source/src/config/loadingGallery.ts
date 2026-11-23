/** Original Road Club illustrations, including the first coastal artwork. */
export const LOADING_GALLERY = [
  {file:'coastal-drive.webp',name:'The original coast'},
  {file:'club-coast.webp',name:'Golden coast'},
  {file:'club-alpine.webp',name:'Alpine pass'},
  {file:'club-harbor.webp',name:'Harbor nights'},
  {file:'club-canyon.webp',name:'Canyon run'},
  {file:'club-snow.webp',name:'Snowline'},
  {file:'club-forest.webp',name:'Autumn tour'},
  {file:'club-night.webp',name:'Blue hour'},
  {file:'club-storm.webp',name:'After the storm'},
  {file:'club-sunrise.webp',name:'First light'},
  {file:'club-marina.webp',name:'Marina boulevard'},
  {file:'club-highland-chase.webp',name:'Castle chase'},
  {file:'club-desert-pursuit.webp',name:'Canyon pursuit'},
  {file:'club-winter-duel.webp',name:'Winter duel'},
  {file:'club-harbor-meet.webp',name:'Harbor meet'},
] as const;
/** Indexed lookup for all fifteen locally served scenes; never downloads a whole slideshow. */
export function loadingArtwork(index:number):typeof LOADING_GALLERY[number] {
  const safe=Number.isFinite(index)?Math.max(0,Math.floor(index)):0;
  return LOADING_GALLERY[safe%LOADING_GALLERY.length];
}

export const LOADING_SLIDE_MS=7700;
/** Fisher-Yates deck visits all fifteen once; successive decks cannot repeat at the seam. */
export function shuffleLoadingGallery(previous=-1,random:()=>number=Math.random):number[]{
 const deck=LOADING_GALLERY.map((_,i)=>i);
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999999,random()))*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 if(deck[0]===previous)[deck[0],deck[1]]=[deck[1],deck[0]];return deck;
}
