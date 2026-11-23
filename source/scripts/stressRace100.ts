/** Real Rapier/contact-traction drivers plus the compiled multiplayer relay. No browser/GPU emulation. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { VEHICLE_REGISTRY } from '../src/config/vehicleRegistry';
import { createRoadVehicleConfig } from '../src/utils/physics/roadVehicle';
import { applyContactTraction, configureContactSuspension, createContactTractionState } from '../src/utils/physics/contactTraction';
import { updateGearbox } from '../src/utils/physics/powertrain';
import { parseServerMessage } from '../src/network/packetValidator';
import type { ClientMessage, ServerMessage, RaceStartState, VehicleTelemetryPayload } from '../src/types/network';
import type { DrivetrainMode } from '../src/types/settings';
import type { InputState } from '../src/types/game';
import type { SurfaceType, TireType } from '../src/types/vehicle';
import type WebSocketType from 'ws';

const WebSocket: typeof WebSocketType = createRequire(new URL('../server/package.json', import.meta.url))('ws');
const base = process.env.TEST_GAME_URL || 'http://127.0.0.1:8791';
const version: string = createRequire(import.meta.url)('../package.json').version;
const rounds = Number(process.env.STRESS_ROUNDS || 100);
assert.ok(Number.isInteger(rounds) && rounds > 0 && rounds <= 100);
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const peers: Peer[] = [];
type RaceMessage = Extract<ServerMessage, { type: 'race_state' }>;
interface Peer {
  ws: WebSocketType; id: string; queue: ServerMessage[]; race: RaceMessage | null;
  snapshots: number; fullSnapshots: number; bytes: number; invalid: number;
  lastSnapshot: Extract<ServerMessage, { type: 'world_snapshot' }> | null;
  intervals: number[]; previous: number;
}
const send = (p: Peer, m: ClientMessage) => p.ws.send(JSON.stringify(m));
async function until(check: () => boolean, label: string, timeout = 10000) {
  const start = Date.now();
  while (!check()) { assert.ok(Date.now() - start < timeout, label); await delay(10); }
}
async function take<T extends ServerMessage['type']>(p: Peer, type: T): Promise<Extract<ServerMessage, { type: T }>> {
  await until(() => p.queue.some(m => m.type === type), `Missing ${type}`);
  const index = p.queue.findIndex(m => m.type === type);
  return p.queue.splice(index, 1)[0] as Extract<ServerMessage, { type: T }>;
}
async function connect(): Promise<Peer> {
  const ws = new WebSocket(base.replace(/^http/, 'ws') + '/ws?v=' + version);
  const p: Peer = { ws, id: '', queue: [], race: null, snapshots: 0, fullSnapshots: 0,
    bytes: 0, invalid: 0, lastSnapshot: null, intervals: [], previous: 0 };
  peers.push(p);
  ws.on('message', bytes => {
    p.bytes += bytes.length;
    const m = parseServerMessage(JSON.parse(bytes.toString()));
    if (!m) { p.invalid++; return; }
    if (m.type === 'race_state') p.race = m;
    else if (m.type === 'world_snapshot') {
      const now = performance.now();
      if (p.previous) p.intervals.push(now - p.previous);
      p.previous = now; p.snapshots++; p.lastSnapshot = m;
      if (Object.keys(m.entities).length === 10) p.fullSnapshots++;
    } else {
      p.queue.push(m);
      // Keep control queues bounded across 100 sessions, without losing errors or join acknowledgments.
      if (p.queue.length > 100) p.queue.splice(0, p.queue.length - 100);
    }
  });
  await new Promise<void>((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  return p;
}

/** Same fixture as the game's existing contact-traction integration suite, at 60 Hz. */
function simulate(round: number, driver: number) {
  const presets = Object.values(VEHICLE_REGISTRY);
  const preset = presets[(round + driver) % presets.length];
  const config = createRoadVehicleConfig(preset.config);
  const mode: DrivetrainMode = (['FWD', 'RWD', 'AWD'] as const)[(round + driver) % 3];
  const surfaces: SurfaceType[] = ['tarmac', 'gravel', 'snow', 'mud'];
  const surface = surfaces[Math.floor(round / 8) % surfaces.length];
  const tire: TireType = surface === 'tarmac' ? 'asphalt' : surface === 'snow' ? 'snow' : 'gravel';
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const dt = 1 / 60; world.timestep = dt;
  world.createCollider(RAPIER.ColliderDesc.cuboid(1000, .1, 1000).setTranslation(0, -.1, 0));
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, .85, 0)
    .setLinearDamping(.08).setAngularDamping(.18));
  world.createCollider(RAPIER.ColliderDesc.cuboid(.85, .2, 1.8).setTranslation(0, -.14, 0).setMass(config.chassisMass), body);
  const controller = world.createVehicleController(body);
  config.wheels.forEach((w, i) => {
    controller.addWheel({ x: w.position[0], y: w.position[1], z: w.position[2] },
      { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, w.suspensionRestLength, w.radius);
    controller.setWheelSuspensionStiffness(i, w.suspensionStiffness);
    controller.setWheelSuspensionCompression(i, w.suspensionDamping * .75);
    controller.setWheelSuspensionRelaxation(i, w.suspensionDamping * 1.15);
    controller.setWheelMaxSuspensionTravel(i, w.suspensionTravel);
  });
  configureContactSuspension(controller, config);
  const state = createContactTractionState();
  const input: InputState = { throttle: 0, brake: 0, steering: 0, handbrake: false, reset: false, cameraToggle: false };
  for (let i = 0; i < 120; i++) { controller.updateVehicle(dt); world.step(); }
  const task = driver % 5; // launch, left slide, right slide, burnout/release, emergency stop
  body.setLinvel({ x: 0, y: 0, z: task === 4 ? 80 / 3.6 : task === 1 || task === 2 ? 50 / 3.6 : 0 }, true);
  const initial = body.translation();
  const inverse = new Quaternion(), local = new Vector3();
  const samples: VehicleTelemetryPayload[] = [];
  let gear = 1, peakYaw = 0, maxSpeed = 0, burnoutFrames = 0, minHeight = Infinity, peakSlip = 0;
  let burnoutTravel = 0, stopped = false;
  try {
    for (let frame = 0; frame < 600; frame++) {
      const time = frame * dt, rot = body.rotation(), v = body.linvel();
      inverse.set(rot.x, rot.y, rot.z, rot.w).invert(); local.set(v.x, v.y, v.z).applyQuaternion(inverse);
      const speed = Math.hypot(local.x, local.z);
      const slip = Math.atan2(local.x, Math.max(.2, Math.abs(local.z)));
      input.throttle = task === 4 ? 0 : task === 1 || task === 2 ? .65 : 1;
      // S is brake/reverse in automatic: release it at rest, as a human stopping rather than reversing would.
      if (task === 4 && speed < .3) stopped = true;
      input.brake = task === 4 && !stopped ? 1 : 0;
      input.steering = time < 2 && (task === 1 || task === 2) ? (task === 1 ? .75 : -.75) : 0;
      input.handbrake = time < 2 && task >= 1 && task <= 3;
      gear = updateGearbox(speed * 3.6, local.z, input, gear, false, { slipAngle: slip });
      controller.updateVehicle(dt);
      applyContactTraction(body, controller, config, state, input, mode, gear, false, surface, tire, dt, true, false, true);
      world.step();
      const p = body.translation(), r = body.rotation(), velocity = body.linvel(), a = body.angvel();
      for (const value of [p.x, p.y, p.z, r.x, r.y, r.z, r.w, velocity.x, velocity.y, velocity.z, a.y, ...state.wheelSpeeds]) {
        assert.ok(Number.isFinite(value), `Nonfinite physics round ${round} driver ${driver}`);
      }
      assert.ok(Math.abs(p.x) < 900 && Math.abs(p.z) < 900 && p.y > .1 && p.y < 2, 'Chassis escaped ground fixture');
      assert.ok(Math.abs(Math.hypot(r.x, r.y, r.z, r.w) - 1) < .01, 'Rotation lost normalization');
      peakYaw = Math.max(peakYaw, Math.abs(a.y)); maxSpeed = Math.max(maxSpeed, speed * 3.6);
      minHeight = Math.min(minHeight, p.y); peakSlip = Math.max(peakSlip, Math.abs(slip));
      if (state.burnout) { burnoutFrames++; burnoutTravel = Math.max(burnoutTravel, Math.hypot(p.x - initial.x, p.z - initial.z)); }
      if (frame % 2 === 0) samples.push({ seq: frame + 1, time: Date.now(), pos: [p.x + driver * 10, p.y, p.z],
        rot: [r.x, r.y, r.z, r.w], linVel: [velocity.x, velocity.y, velocity.z], angVel: [a.x, a.y, a.z],
        steer: state.steering, wheelRots: [0, 1, 2, 3].map(i => state.wheelSpeeds[i] * time / config.wheels[i].radius) as [number, number, number, number],
        wheelY: config.wheels.map((w, i) => w.position[1] - controller.wheelSuspensionLength(i)) as [number, number, number, number],
        rpm: state.burnout ? 6500 : Math.min(7500, 1000 + speed * 130), gear, isDrifting: speed > 3 && Math.abs(slip) > .12,
        burnout: state.burnout, drivetrain: mode, surface });
    }
    if (task === 3) { assert.ok(burnoutFrames > 50); assert.ok(burnoutTravel < .5, 'Burnout line-lock moved chassis'); }
    assert.ok(peakYaw < 3, 'Uncontrolled angular spin');
    const p = body.translation(), v = body.linvel();
    if (task === 4) assert.ok(Math.hypot(v.x, v.z) < .5, 'Emergency stop did not settle');
    return { samples, result: { driver, nickname: driver === 0 ? 'Blaze_Wolf_34' : `Test_Driver_${driver + 1}`,
      vehicle: preset.id, mode, surface, task, peakYaw, maxSpeed, peakSlip, minHeight, burnoutFrames, burnoutTravel,
      distance: Math.hypot(p.x - initial.x, p.z - initial.z) } };
  } finally { world.free(); }
}

const report: Record<string, unknown> = { version, base, requestedRounds: rounds, drivers: 10,
  method: 'Real Rapier 60 Hz flat-ground fixtures, production contact-traction solver, 10 persistent WebSocket clients; 10 physics seconds per driver per round, sampled replay over real relay. Does not measure browser/GPU FPS, collision pileups or whole-track driving skill.',
  rounds: [], completedRounds: 0, passed: false };
const results: unknown[] = [];
async function main() {
  const health = await (await fetch(base + '/health')).json(); assert.equal(health.version, version);
  await RAPIER.init();
  const host = await connect();
  send(host, { type: 'create_room', name: '100 Session Verification', nickname: 'Blaze_Wolf_34',
    vehicleId: 'stradale_gt', levelId: 'level6_gymkhana_harbor', gameMode: 'timeattack' });
  const joined = await take(host, 'room_joined'); host.id = joined.selfId; const roomId = joined.room.id;
  send(host, { type: 'client_ready' });
  for (let i = 1; i < 10; i++) {
    const p = await connect();
    send(p, { type: 'join_room', roomId, nickname: `Test_Driver_${i + 1}`, vehicleId: 'stradale_gt' });
    p.id = (await take(p, 'room_joined')).selfId; send(p, { type: 'client_ready' });
  }
  await until(() => peers.every(p => p.race?.state.readyIds.length === 10), 'Ten clients not ready');
  let seq = 0;
  for (let round = 1; round <= rounds; round++) {
    if (round > 1) send(host, { type: 'race_reset' });
    await until(() => peers.every(p => p.race?.state.phase === 'waiting' && p.race.state.round === round), 'Grid reset diverged');
    await delay(80);
    assert.ok(peers.every(p => p.race?.state.phase === 'waiting'), 'Unexpected automatic countdown');
    const simulations = peers.map((_, i) => simulate(round, i));
    if (round % 2 === 0) {
      for (let i = 0; i < 5; i++) send(peers[i], { type: 'race_vote', voted: true });
      await until(() => host.race?.state.votedIds.length === 5, 'Ballots not counted');
      for (let i = 0; i < 10; i++) send(peers[0], { type: 'race_vote', voted: true });
      await delay(60); assert.equal(host.race?.state.phase, 'waiting');
      send(peers[5], { type: 'race_vote', voted: true });
    } else {
      send(peers[1], { type: 'race_start' });
      const denied = await take(peers[1], 'error'); assert.equal(denied.code, 'HOST_ONLY');
      assert.equal(host.race?.state.phase, 'waiting');
      send(host, { type: 'race_start' });
    }
    await until(() => peers.every(p => p.race?.state.phase === 'countdown'), 'Countdown missing');
    const gate: RaceStartState = host.race!.state;
    assert.equal(gate.racerIds.length, 10); assert.equal(gate.requiredVotes, 6);
    assert.ok(peers.every(p => p.race?.state.startAt === gate.startAt), 'Starting clocks diverged');
    await until(() => peers.every(p => p.race?.state.phase === 'racing'), 'Shared GO did not arrive');
    const before = peers.map(p => p.fullSnapshots);
    // Ten seconds of actual fixed-step motion; relay all 300 physics samples at a bounded accelerated 100 Hz.
    const relayStart = performance.now();
    for (let sample = 0; sample < 300; sample++) {
      seq++;
      for (let i = 0; i < 10; i++) send(peers[i], { type: 'telemetry', payload: { ...simulations[i].samples[sample], seq, time: Date.now() } });
      await delay(10);
    }
    await until(() => peers.every(p => p.fullSnapshots > before[peers.indexOf(p)] + 40), 'Full-room snapshot throughput fell');
    for (const p of peers) {
      assert.equal(p.invalid, 0, 'Client rejected server message');
      for (let i = 0; i < 10; i++) {
        const entity = p.lastSnapshot?.entities[peers[i].id];
        assert.ok(entity, 'Driver missing in final snapshot');
        assert.equal(entity.drivetrain, simulations[i].result.mode);
        assert.ok(entity.wheelY?.every(Number.isFinite), 'Wheel hub poses missing');
      }
    }
    results.push({ round, startMethod: round % 2 ? 'host' : 'strict-majority-6-of-10', startAt: gate.startAt,
      relayMs: Math.round(performance.now() - relayStart), fullSnapshots: peers.map((p, i) => p.fullSnapshots - before[i]),
      drivers: simulations.map(s => s.result) });
    report.completedRounds = round;
    report.rounds = results;
    if (round % 10 === 0 || round === rounds) console.log(`PASS ${round}/${rounds} rounds; ${round * 10} real-physics driver runs`);
  }
  const intervals = peers.flatMap(p => p.intervals).sort((a, b) => a - b);
  Object.assign(report, { passed: true, physicsSteps: rounds * 10 * 600, telemetryPackets: rounds * 10 * 300,
    snapshots: peers.map(p => p.snapshots), invalidMessages: peers.map(p => p.invalid), receivedBytes: peers.reduce((n, p) => n + p.bytes, 0),
    snapshotMedianMs: intervals[Math.floor(intervals.length * .5)], snapshotP95Ms: intervals[Math.floor(intervals.length * .95)] });
}
main().catch(error => { report.failure = String(error.stack || error); console.error(error); process.exitCode = 1; })
  .finally(() => {
    peers.forEach(p => p.ws.close());
    writeFileSync(new URL('../../research/stress-100x10-' + version + '.json', import.meta.url), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, completedRounds: report.completedRounds, drivers: 10, snapshotP95Ms: report.snapshotP95Ms }));
  });
