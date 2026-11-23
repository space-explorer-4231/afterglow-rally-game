import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {LOADING_GALLERY,loadingArtwork,shuffleLoadingGallery,LOADING_SLIDE_MS} from '../loadingGallery';
it('rotates fifteen distinct locally served illustrations including the original',()=>{
  expect(LOADING_GALLERY).toHaveLength(15);expect(new Set(LOADING_GALLERY.map(a=>a.file)).size).toBe(15);
  expect(LOADING_GALLERY.some(a=>a.file==='coastal-drive.webp')).toBe(true);
  for(let i=0;i<15;i++){expect(loadingArtwork(i)).toBe(LOADING_GALLERY[i]);expect(readFileSync('public/images/aeroline/'+loadingArtwork(i).file).length).toBeGreaterThan(50000);}
  expect(loadingArtwork(15)).toBe(loadingArtwork(0));expect(loadingArtwork(NaN)).toBe(loadingArtwork(0));
});

it('shuffles complete decks without repeating at the seam and uses a 7.7-second interval',()=>{
 let previous=-1;for(let run=0;run<20;run++){const deck=shuffleLoadingGallery(previous,()=>run%2?.2:.8);expect(deck).toHaveLength(15);expect(new Set(deck).size).toBe(15);expect(deck[0]).not.toBe(previous);previous=deck[14];}expect(LOADING_SLIDE_MS).toBe(7700);
});
