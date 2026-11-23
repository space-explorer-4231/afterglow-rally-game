import {describe,expect,it} from 'vitest';
import {Texture} from 'three';
import {applyBiomeDetail} from '../biomeDetail';

describe('Photographed biome material detail',()=>{
  const createShader=()=>({uniforms:{},vertexShader:'',fragmentShader:'#include <common>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>'});
  it('binds all maps and blends slope normals on desktop without replacing base shader chunks',()=>{
    const shader=createShader(),ground=new Texture(),roughness=new Texture(),rock=new Texture();
    applyBiomeDetail(shader,ground,roughness,rock,false,false);
    expect(shader.uniforms).toEqual({u_groundDetailNormal:{value:ground},u_groundDetailRoughness:{value:roughness},u_rockDetailNormal:{value:rock}});
    expect(shader.fragmentShader).toContain('detailSlope');
    expect(shader.fragmentShader).toContain('roughnessFactor=clamp');
    expect(shader.fragmentShader).toContain('#include <normal_fragment_maps>');
    expect(shader.fragmentShader).toContain('abs(vWorldNormal.y)>0.9');
    ground.dispose();roughness.dispose();rock.dispose();
  });
  it('keeps asphalt roughness and avoids additional normal texture reads on mobile',()=>{
    const shader=createShader(),texture=new Texture();
    applyBiomeDetail(shader,texture,texture,texture,true,true);
    expect(shader.fragmentShader).not.toContain('roughnessFactor=clamp');
    expect(shader.fragmentShader).not.toContain('texture2D(u_groundDetailNormal');
    expect(shader.fragmentShader).not.toContain('texture2D(u_rockDetailNormal');
    texture.dispose();
  });
});
