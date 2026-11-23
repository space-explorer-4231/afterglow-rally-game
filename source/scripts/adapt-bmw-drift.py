"""Fit the attributed BMW source to the simulator; split wheel geometry from the chassis."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'asset-sources/bmw-m3-gtr.glb'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
seen=set();removed=[]
for obj in objects:
 obj.data=obj.data.copy()
 for v in obj.data.vertices:v.co=obj.matrix_world@v.co
 obj.parent=None;obj.matrix_world.identity()
 materials=[m.name for m in obj.data.materials]
 # Wheels are separate animated models in the game. Keep brake calipers on the chassis.
 if any('RIM' in m or 'RUBBER_TREAD' in m or 'BRAKEDISC' in m or 'CALIPERDECAL' in m for m in materials):
  removed.append(obj.name);bpy.data.objects.remove(obj,do_unlink=True);continue
 fingerprint=hashlib.sha256(str(materials).encode()+b''.join(float(c).hex().encode() for v in obj.data.vertices for c in v.co)).hexdigest()
 if fingerprint in seen:bpy.data.objects.remove(obj,do_unlink=True);continue
 seen.add(fingerprint)
 # Source is Blender Z-up, nose toward -Y. Export converts back to game Y-up, +Z forward.
 for v in obj.data.vertices:
  v.co.y+=.2515;v.co.z-=.615
 if 'CARSKIN_LOGO' in materials:obj.data.materials[0].name='Body_Color'
 if any('WINDSHIELD' in m for m in materials):
  material=obj.data.materials[0]
  if material.use_nodes:
   bsdf=material.node_tree.nodes.get('Principled BSDF')
   if bsdf:bsdf.inputs['Roughness'].default_value=.14
 # Preserve authored normals and UVs; remove only duplicated passes and wheel meshes.
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
 if obj.type=='MESH':obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/vehicles/bmw_m3_drift.glb'),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_normals=True,export_texcoords=True,export_extras=True)
print('REMOVED ANIMATED WHEEL NODES',removed)
