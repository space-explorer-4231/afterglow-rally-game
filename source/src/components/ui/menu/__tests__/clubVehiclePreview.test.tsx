import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ClubVehiclePreview} from '../ClubVehiclePreview';
import {getAvailableVehicles} from '@/config/vehicleRegistry';
describe('real-model car preview and accessible inspection',()=>{
  it.each(getAvailableVehicles())('labels the actual $id choice and its inspection controls',vehicle=>{
    const html=renderToStaticMarkup(<ClubVehiclePreview vehicle={vehicle}/>);
    expect(html).toContain(vehicle.name.replaceAll('&','&amp;'));expect(html).toContain('actual 3D vehicle preview');
    expect(html).toContain('tabindex="0"');expect(html).toContain('Alt + arrows');expect(html).toContain(vehicle.stats.driveType);
  });
});
