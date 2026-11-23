/** Static street blocks in metres; the road corridor remains unobstructed. */
export const HARBOR_BUILDINGS = [
  {x:-22,z:-100,width:20,depth:24,height:15},
  {x:-137,z:-100,width:24,depth:28,height:23},
  {x:-22,z:-22,width:20,depth:24,height:17},
  {x:-137,z:-22,width:24,depth:28,height:16},
  {x:-22,z:65,width:20,depth:24,height:23},
  {x:-137,z:65,width:24,depth:28,height:17},
  {x:-66,z:-115,width:24,depth:26,height:20},
  {x:-76,z:-40,width:26,depth:28,height:23},
  {x:-68,z:55,width:22,depth:26,height:17},
  {x:-174,z:-100,width:16,depth:22,height:18},
  {x:-174,z:-24,width:16,depth:28,height:23},
  {x:-171,z:63,width:18,depth:26,height:17},
  {x:113,z:-108,width:30,depth:32,height:34},
  {x:117,z:-27,width:30,depth:34,height:38},
  {x:120,z:62,width:32,depth:32,height:36},
  {x:176,z:-104,width:30,depth:34,height:30},
  {x:180,z:-21,width:32,depth:36,height:34},
  {x:182,z:67,width:30,depth:34,height:38},
  {x:248,z:-91,width:38,depth:34,height:42},
  {x:251,z:4,width:36,depth:40,height:30},
  {x:249,z:95,width:36,depth:32,height:34},
  {x:-331,z:-105,width:34,depth:32,height:38},
  {x:-334,z:-18,width:38,depth:36,height:42},
  {x:-326,z:80,width:32,depth:34,height:30},
] as const;
/** Planted boulevards outside the driving loop [x,z,width,depth]. */
export const HARBOR_GARDENS = [[61,20,44,240],[-275,20,28,240],[-3,20,14,225]] as const;

/** Original roadside parking pockets, outside the racing ribbon and launch grid. */
export const HARBOR_PARKING = [
  {x:-2,z:-78,y:8.315,yaw:0,color:'#d8e4e8'},
  {x:-2,z:5,y:8.315,yaw:Math.PI,color:'#2f82bd'},
  {x:-2,z:90,y:8.315,yaw:0,color:'#ba664e'},
  {x:40,z:-90,y:8.315,yaw:Math.PI,color:'#9bb8bc'},
  {x:40,z:-10,y:8.315,yaw:0,color:'#e9e5da'},
  {x:40,z:72,y:8.315,yaw:Math.PI,color:'#506276'},
  {x:-255,z:-65,y:8.315,yaw:0,color:'#688a87'},
  {x:-255,z:60,y:8.315,yaw:Math.PI,color:'#cfc6ac'},
] as const;

