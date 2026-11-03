# SmartEggBoard Dashboard (Angular 18 + ThingSpeak)
1. Node 20+. `npm install`, `npm start`, open http://localhost:4200 (starts in sample mode). `npm run build` -> dist/ for hosting.
2. Live data: sign in as admin > Settings > channel ID (+ read key if private) > Save and load.
3. Demo logins: operator/scan2026, breeder/cross2026, admin/admin2026 (not real security).
4. No hardware yet: Device and alerts > Simulate a scan, or run `python tools/send_scan.py`.
5. ThingSpeak fields: see Settings. Free plan: 1 update per 15 s, 8 fields, so the cross name goes in `status`.
