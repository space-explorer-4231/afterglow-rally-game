import {BufferAttribute,BufferGeometry,Mesh,MeshBasicMaterial,Vector3,type Object3D} from 'three';

/** Batch static cached geometry into one owned draw call without altering the live car. */
export function createGhostVisual(scene:Object3D):{model:Object3D;material:MeshBasicMaterial;dispose:()=>void} {
  const clone=scene.clone(true);clone.updateMatrixWorld(true);
  let count=0;
  clone.traverse(object=>{if(object instanceof Mesh){const positions=object.geometry.getAttribute('position');if(positions)count+=object.geometry.index?.count??positions.count;}});
  const vertices=new Float32Array(count*3),point=new Vector3();let cursor=0;
  clone.traverse(object=>{
    if(!(object instanceof Mesh))return;
    const positions=object.geometry.getAttribute('position');if(!positions)return;
    const index=object.geometry.index,total=index?.count??positions.count;
    for(let i=0;i<total;i++){
      const vertex=index?index.getX(i):i;
      point.set(positions.getX(vertex),positions.getY(vertex),positions.getZ(vertex)).applyMatrix4(object.matrixWorld);
      vertices[cursor++]=point.x;vertices[cursor++]=point.y;vertices[cursor++]=point.z;
    }
  });
  const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(vertices,3));geometry.computeBoundingSphere();
  const material=new MeshBasicMaterial({color:'#71e8ff',transparent:true,opacity:0.28,depthWrite:false,toneMapped:false});
  const model=new Mesh(geometry,material);model.castShadow=false;model.receiveShadow=false;
  return {model,material,dispose:()=>{geometry.dispose();material.dispose();}};
}
