# IoT-4G Smart Vehicle — Command Center System

Part of the final-year project **"AI-Enabled 4G LTE-IoT Based Autonomous Smart Utility Vehicle with Hybrid Network Communication."**
This repo covers the connectivity + command-center software layer: WiFi/4G failover firmware, a Firebase backend, and three web apps (command center, per-vehicle control, hospital staff requests) built around a demo hospital delivery use case.

**Live site:** `https://1adarshgajagotra.github.io/IoT-GSM-based-smart-Vehicle/`

---

## What's in this repo

| File | What it is |
|---|---|
| `index.html` | Login page (Firebase Auth). Redirects to `dashboard.html` (operator/admin) or `staff-app.html` (hospital staff) based on role. |
| `dashboard.html` | Command center: live fleet map, status charts, device list, incoming staff requests, notifications, staff-account creation, and full admin user management. |
| `device-detail.html` | Per-vehicle control screen: live video panel (placeholder), mini position map, 4G/WiFi/battery meters, manual D-pad, autonomous toggle, emergency stop, route planning, two-way messaging, admin override. |
| `staff-app.html` | Mobile-first app for hospital staff to submit "deliver X from room A to room B" requests and track their status. |
| `floor-plan.js` | Shared hospital floor-plan renderer (rooms, corridors, doors, icons) used by all three pages above. |
| `finalYearProjectESP32.ino` | ESP32-S3 + Quectel EC200U firmware: WiFi-primary/LTE-backup failover, Firebase REST telemetry push, control polling, fail-safe watchdog. *(The two earlier draft .ino files have been merged into this single file.)* |

There is no build step — every `.html` file is self-contained and loads Firebase + Chart.js from CDNs. Deployment is just pushing files to this repo with GitHub Pages enabled.

---

## Architecture

```
Hospital Staff phone ──▶ staff-app.html ──┐
                                           ├──▶ Firebase Realtime Database ◀── ESP32-S3 + EC200U
Operator/Admin browser ──▶ dashboard.html ─┤        (Auth + RTDB, free                  │ (WiFi/4G failover,
                       └─▶ device-detail.html   Spark plan)                              telemetry push)
```

- **Auth:** Firebase Authentication (email/password). Roles (`admin` / `operator` / `staff`) are stored per-user in the database, not in Firebase Auth itself. The vehicle firmware uses a dedicated device service account (see Setup step 5b).
- **Data:** Firebase Realtime Database. The vehicle authenticates with a device service account and appends `?auth=<token>` to all REST calls; command writes require an authenticated, role-checked human user.
- **Hosting:** GitHub Pages (free, static).

### ESP32-S3 Pin Assignment

| ESP32-S3 GPIO | L298N pin | Notes |
|---|---|---|
| GPIO 6 | ENA | Remove ENA jumper cap before use |
| GPIO 4 | IN1 | |
| GPIO 5 | IN2 | |
| GPIO 7 | IN3 | |
| GPIO 8 | IN4 | |
| GPIO 15 | ENB | Remove ENB jumper cap before use |
| GPIO 17 | (Modem TX) | Internal to board — do NOT wire externally |
| GPIO 18 | (Modem RX) | Internal to board — do NOT wire externally |
| GPIO 10 | (Modem PWRKEY) | Internal to board — do NOT wire externally |

> **Important hardware notes:**
> - **Remove the ENA and ENB jumper caps** from the L298N. Leaving them in ties those pins to 5 V and will fight the 3.3 V PWM output, potentially damaging the ESP32-S3 GPIOs and disabling speed control.
> - **Power the ESP32 board from its own 5 V buck converter**, not from the L298N's 5 V terminal. The EC200U modem draws ~2 A spikes and the L298N's on-board regulator cannot supply that.
> - Expect ~2 V drop across the L298N, so a 12 V battery delivers roughly 10 V to the motors.
> - Join all grounds: L298N GND, buck GND, battery −, and ESP32 GND.

### Data model (Realtime Database)

```
/users/{uid}                = { email, role: "admin"|"operator"|"staff", disabled, createdBy, createdAt }

/devices/{deviceId}/status    = { online, link: "wifi"|"lte", lastSeen }
/devices/{deviceId}/telemetry = { speed, battery, signalWifi, signal4g, mapX, mapY, task }
/devices/{deviceId}/control/operator        = { pickup, destination, mode, manualDir, issuedBy, ts }
/devices/{deviceId}/control/admin           = (same shape as operator's)
/devices/{deviceId}/control/activeSource    = "operator" | "admin"
/devices/{deviceId}/control/emergencyStopGlobal = { active, by, role, ts }
/devices/{deviceId}/messages/{pushId}       = { from, role, text, ts }

/requests/{pushId} = { item, fromRoom, toRoom, requestedBy, requestedByUid,
                        status: "pending"|"assigned", assignedDeviceId, assignedBy, ts }

/notifications/{pushId} = { message, severity, ts }
```

A vehicle's *effective* command source is `control/activeSource`: normally `"operator"`, but an admin can flip it to `"admin"` to take over.

---

## Roles & permissions

| | Operator | Admin | Hospital Staff |
|---|---|---|---|
| View dashboard, devices, map | ✅ | ✅ | ❌ |
| Send routes, manual control, emergency stop | ✅ | ✅ | ❌ |
| Override another role's command | ❌ | ✅ | ❌ |
| Create Hospital Staff accounts | ✅ | ✅ | ❌ |
| Create/manage Operator & Admin accounts | ❌ | ✅ | ❌ |
| Submit material requests | ❌ | ❌ | ✅ |
| Assign a request to a vehicle | ✅ | ✅ | ❌ |

---

## Setup

1. **Firebase project** — create one free (Spark plan) at [console.firebase.google.com](https://console.firebase.google.com).
2. **Enable Authentication** — Authentication → Sign-in method → Email/Password.
3. **Enable Realtime Database** — create it, then set the rules below.
4. **Get your web app config** — Project settings → General → Your apps → copy `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId` into the `FIREBASE_CONFIG` object at the top of the `<script>` in `index.html`, `dashboard.html`, `device-detail.html`, and `staff-app.html`.
5. **Bootstrap the first admin** — Create one user manually in Authentication → Add user, then add a matching node under `users/<that UID>` with `{ "email": "...", "role": "admin", "disabled": false }` via the Realtime Database console.
6. **Create the device service account** — In Authentication → Add user, create an account for the vehicle (e.g. `device-vehicle01@iot4g.local` with a strong password). In the firmware, fill in `DEVICE_EMAIL` and `DEVICE_PASS` with those credentials. **Do not** assign this account a role in `/users` — it only needs to authenticate to read `/control`.
7. **Security rules** — paste this into Realtime Database → Rules:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin' || (root.child('users').child(auth.uid).child('role').val() === 'operator' && newData.child('role').val() === 'staff'))"
      }
    },
    "devices": {
      ".read": "auth != null",
      "$deviceId": {
        "status":    { ".write": "auth != null" },
        "telemetry": { ".write": "auth != null" },
        "messages":  { ".write": "auth != null" },
        "control": {
          ".read": "auth != null",
          "operator": { ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() != 'staff'" },
          "admin":    { ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'" },
          "activeSource": { ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() != 'staff'" },
          "emergencyStopGlobal": { ".write": "auth != null" }
        }
      }
    },
    "requests": {
      ".read": "auth != null",
      ".indexOn": ["requestedByUid"],
      "$requestId": {
        ".write": "auth != null && (!data.exists() || root.child('users').child(auth.uid).child('role').val() != 'staff')"
      }
    },
    "notifications": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

> **Note vs the original rules:** `status` and `telemetry` now require `auth != null` (device service account) instead of being fully open. `control` now has `.read: auth != null` so the device can poll it.

8. **Deploy** — push all files to this repo, enable GitHub Pages (Settings → Pages → deploy from `main` / root).
9. **Flash the firmware** — fill in `WIFI_SSID`, `WIFI_PASS`, `MODEM_APN`, `DEVICE_EMAIL`, `DEVICE_PASS`, and `FIREBASE_API_KEY` in `finalYearProjectESP32.ino`, then upload via Arduino IDE (requires Arduino-ESP32 core 3.x for `ledcAttach()`).
10. **Seed demo data** — log in as admin → Admin tab → "Seed / refresh simulated demo devices" to populate the fleet map and charts for a demo without needing the real vehicle present.

---

## Known limitations (be upfront about these in a demo/viva)

- **No ultrasonic / obstacle stop.** The safety spec calls for it but it is not yet implemented in firmware. Add an HC-SR04 on two GPIOs and call `stopMotors()` when distance < threshold.
- **Battery reading is a placeholder (85%).** A real reading needs a voltage-divider into an ADC pin and a calibration curve for your battery chemistry.
- **Two-way "call" is text messaging, not voice.** Real audio calling over cellular is a separate audio-streaming project not built here.
- **Live video feed is a placeholder.** Needs a camera stream source wired into `device-detail.html`.
- **Indoor position is set manually**, not tracked automatically. Real indoor positioning (BLE beacons, UWB, etc.) isn't implemented.
- **Desktop notifications only fire while a browser tab is open** — there's no backend push (Firebase Cloud Messaging requires the Blaze plan).
- **"Disable" user, not "delete."** Permanently deleting a Firebase Auth account needs the Admin SDK (a backend).
- **LTE HTTPS uses `seclevel 0`** (no server certificate verification). Acceptable for a university demo; for production add certificate pinning.
- **`activeSource` admin override** is enforced in the firmware (polls `control/activeSource` and dispatches to the correct sub-node).
