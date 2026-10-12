# Aeroline: Open Road Club

Version 1.20.0. Multiplayer driving game based on MIT-licensed OpenRally.

WASD or arrows to drive, Space for handbrake, press R twice within two seconds to recover, Esc to pause. Touch and gamepad controls are supported. Join Multiplayer with the same room code to play together without accounts.

This update adds five faster vehicles: Meridian RS wagon, Voltline XR electric SUV, Ironclad Sprint pickup, Parcel GT delivery van and Nightfall V8 muscle coupe. It includes improved desktop paint and terrain lighting, solid ramp supports and rails, gentler reverse power, reconnect feedback and bounded multiplayer telemetry queues.

## Hosting

Compiled client and relay server. Install Node 24+, then run npm ci --omit=dev --ignore-scripts, npm run build, npm start. Render deploys branch dev with those commands and health path /health. Free instances sleep and can take time to wake. Rooms reset on server restarts. Client protocol 1.20 requires this server. Archives are integrity checked before extraction.

## Validation

1,874 automated tests passed; ten inherited Android APK export tests fail. Production client and server builds passed. Local relay stress passed with 24 simulated players in two rooms, including a receiver paused for 45 seconds, plus reconnect and host handoff checks. These checks do not measure rendering performance on player devices.

## Licenses

OpenRally and supplied assets retain their MIT license. New Speed Fleet models are original MIT assets. Existing external asset attribution remains in ASSET-CREDITS.md and THIRD-PARTY-NOTICES.md. Complete editable source and verification records remain on the creator's desktop. Developed by Mateusz Zalewski with AI assistance.
