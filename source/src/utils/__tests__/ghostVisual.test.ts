import {describe,it,expect,vi} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial} from 'three';
import {createGhostVisual} from '../ghostVisual';
describe('ghost visual resource ownership',()=>{
  it('batches geometry without recoloring or disposing the live car',()=>{
    const scene=new Group(),geometry=new BoxGeometry(),material=new MeshStandardMaterial({color:'#ff0000'}),mesh=new Mesh(geometry,material);scene.add(mesh);
    const disposeGeometry=vi.spyOn(geometry,'dispose'),disposeOriginal=vi.spyOn(material,'dispose');
    const ghost=createGhostVisual(scene),clone=ghost.model as Mesh;
    expect(clone.geometry).not.toBe(geometry);expect(clone.material).toBe(ghost.material);expect(mesh.material).toBe(material);
    expect(clone.geometry.getAttribute('position').count).toBe(36);
    expect(ghost.material.transparent).toBe(true);expect(ghost.material.depthWrite).toBe(false);expect(clone.castShadow).toBe(false);
    const disposeGhost=vi.spyOn(ghost.material,'dispose'),disposeBatch=vi.spyOn(clone.geometry,'dispose');ghost.dispose();expect(disposeGhost).toHaveBeenCalledOnce();expect(disposeBatch).toHaveBeenCalledOnce();expect(disposeGeometry).not.toHaveBeenCalled();expect(disposeOriginal).not.toHaveBeenCalled();
    geometry.dispose();material.dispose();
  });
  it('bakes nested mesh transforms into the single draw call',()=>{
    const scene=new Group(),parent=new Group(),geometry=new BoxGeometry(),material=new MeshStandardMaterial();parent.position.set(10,2,3);parent.scale.set(2,2,2);parent.add(new Mesh(geometry,material));scene.add(parent);
    const ghost=createGhostVisual(scene),mesh=ghost.model as Mesh;mesh.geometry.computeBoundingBox();expect(mesh.geometry.boundingBox?.min.x).toBe(9);expect(mesh.geometry.boundingBox?.max.x).toBe(11);expect(mesh.geometry.boundingBox?.min.y).toBe(1);ghost.dispose();geometry.dispose();material.dispose();
  });
});
