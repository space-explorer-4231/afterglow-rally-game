import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,Group} from 'three';
export function NitroFlames({length,width,active}:{length:number;width:number;active:()=>boolean}){
  const flame=useRef<Group>(null);
  useFrame(({clock})=>{if(!flame.current)return;flame.current.visible=active();if(flame.current.visible)flame.current.scale.z=.85+.15*Math.sin(clock.elapsedTime*37);});
  return <group ref={flame} visible={false} position={[0,-.07,-length/2+.03]}>
    {[-1,1].map(side=><group key={side} position={[side*width*.28,0,0]}>
      <mesh position={[0,0,-.32]} rotation={[-Math.PI/2,0,0]}><coneGeometry args={[.1,.65,8]}/><meshBasicMaterial color="#178aff" transparent opacity={.7} blending={AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
      <mesh position={[0,0,-.2]} rotation={[-Math.PI/2,0,0]}><coneGeometry args={[.05,.4,8]}/><meshBasicMaterial color="#c7f5ff" transparent opacity={.9} blending={AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
    </group>)}
  </group>;
}
