/** All three independent startup barriers must settle before a player drives or reports READY. */
export function isDriveReady(state:{isSceneReady:boolean;isVehicleVisualReady:boolean;isRenderReady:boolean}):boolean {
 return state.isSceneReady&&state.isVehicleVisualReady&&state.isRenderReady;
}
