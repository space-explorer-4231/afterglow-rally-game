import {Float32BufferAttribute,type BufferGeometry,type Matrix4} from 'three';

/** Decode quantized vertex attributes before baking a glTF node's world transform.
 * Writing world-space metres into normalized integer attributes would clamp or wrap
 * them. Cached loader geometry stays untouched; the caller owns the returned copy.
 */
export function bakeStaticGeometry(source:BufferGeometry,matrix:Matrix4):BufferGeometry{
  const geometry=source.clone();
  for(const name of ['position','normal','tangent']){
    const attribute=source.getAttribute(name);
    if(!attribute)continue;
    const values=new Float32Array(attribute.count*attribute.itemSize);
    for(let i=0;i<attribute.count;i++){
      const offset=i*attribute.itemSize;
      values[offset]=attribute.getX(i);values[offset+1]=attribute.getY(i);
      values[offset+2]=attribute.getZ(i);
      if(attribute.itemSize===4)values[offset+3]=attribute.getW(i);
    }
    geometry.setAttribute(name,new Float32BufferAttribute(values,attribute.itemSize));
  }
  geometry.applyMatrix4(matrix);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}
