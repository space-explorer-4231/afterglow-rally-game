import {describe,it,expect} from 'vitest';
import {ShaderLib,Texture,UniformsUtils} from 'three';
import {createFoliageDepthMaterial,patchFoliageDepthShader} from '../foliageShadow';
describe('Photographic foliage shadows',()=>{
  it('patches the real Three depth shader before alpha testing and preserves depth packing',()=>{
    const shader={vertexShader:ShaderLib.depth.vertexShader,fragmentShader:ShaderLib.depth.fragmentShader,uniforms:UniformsUtils.clone(ShaderLib.depth.uniforms)};
    const texture=new Texture();patchFoliageDepthShader(shader,texture,true);
    expect(shader.fragmentShader.indexOf('diffuseColor.a=max')).toBeLessThan(shader.fragmentShader.indexOf('#include <alphatest_fragment>'));
    expect(shader.fragmentShader).toContain('packDepthToRGBA');
    expect(shader.vertexShader).toContain('instanceMatrix*vec4(displaced,1.)');
    expect(shader.uniforms.u_tex.value).toBe(texture);
    expect(shader.uniforms.u_time.value).toBe(0);
  });
  it('owns a separate shadow material and leaves the cached texture intact',()=>{
    const texture=new Texture();let textureDisposed=false;
    texture.addEventListener('dispose',()=>{textureDisposed=true;});
    const material=createFoliageDepthMaterial(texture,false,()=>{});
    material.dispose();expect(textureDisposed).toBe(false);
    expect(material.alphaTest).toBe(.12);texture.dispose();
  });
});
