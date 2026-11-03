import { Injectable, signal, computed } from '@angular/core';

export interface Scan { id?: string; board: number; cross: string; hatched: number; unhatched: number; dead: number; lux: number; status: 'OK' | 'Rescanned' | 'Recount'; time: number; source: string; }
export const TARGET = 85, DEAD_LIMIT = 15, LUX_MIN = 300, LUX_MAX = 1000;
export const total = (s: Scan) => s.hatched + s.unhatched + s.dead;
export const pct = (n: number, s: Scan) => (total(s) ? (n / total(s)) * 100 : 0);
const KEY = 'tsConfig', SAMPLE_CROSSES = ['A x B', 'C x D', 'A x D', 'B x C'];

@Injectable({ providedIn: 'root' })
export class DataService {
  cfg = signal<{ channel: string; readKey: string; writeKey: string }>(JSON.parse(localStorage.getItem(KEY) || '{"channel":"","readKey":"","writeKey":""}'));
  scans = signal<Scan[]>([]);
  mode = signal<'sample' | 'live'>('sample');
  error = signal('');
  latest = computed(() => this.scans().at(-1));
  crosses = computed(() => [...new Set(this.scans().map(s => s.cross))].sort());
  alerts = computed(() => this.scans().filter(s => s.status !== 'OK' || pct(s.dead, s) > DEAD_LIMIT).reverse());
  ranking = computed(() => this.crosses().map(c => {
    const l = this.scans().filter(s => s.cross === c);
    const sum = (k: 'hatched' | 'unhatched' | 'dead') => l.reduce((a, s) => a + s[k], 0);
    const t = sum('hatched') + sum('unhatched') + sum('dead') || 1;
    const surv = (sum('hatched') / t) * 100, dead = (sum('dead') / t) * 100;
    return { cross: c, boards: l.length, eggs: t, hatched: sum('hatched'), unhatched: sum('unhatched'), dead: sum('dead'), surv, unh: (sum('unhatched') / t) * 100, deadPct: dead,
      advice: dead > DEAD_LIMIT ? 'High dead %' : surv >= TARGET ? 'Pair again' : 'Review' };
  }).sort((a, b) => b.surv - a.surv));

  constructor() {
    if (this.cfg().channel) this.load(); else this.useSample();
    setInterval(() => { if (this.mode() === 'live') this.load(); }, 20000);
  }

  save(channel: string, readKey: string, writeKey: string) {
    const c = { channel: channel.trim(), readKey: readKey.trim(), writeKey: writeKey.trim() };
    this.cfg.set(c); localStorage.setItem(KEY, JSON.stringify(c));
    return c.channel ? this.load() : this.useSample();
  }
  useSample() { this.error.set(''); this.mode.set('sample'); this.scans.set(Array.from({ length: 20 }, (_, i) => this.make(i + 1, i))); }

  /** Reads the ThingSpeak channel. Fields: 1 hatched, 2 unhatched, 3 dead, 4 survival %, 5 dead %, 6 unhatched %, 7 lux, 8 cross code, status = cross name. */
  async load() {
    const c = this.cfg();
    try {
      const r = await fetch(`https://api.thingspeak.com/channels/${c.channel}/feeds.json?results=100` + (c.readKey ? `&api_key=${c.readKey}` : ''));
      if (!r.ok) throw new Error(r.status === 400 || r.status === 404 ? 'channel not found or read key wrong.' : 'HTTP ' + r.status);
      const feeds: any[] = (await r.json()).feeds ?? [];
      this.scans.set(feeds.map(f => this.fromFeed(f)));
      this.mode.set('live');
      this.error.set(feeds.length ? '' : 'The channel has no scans yet. Send one scan to see data.');
    } catch (e: any) { this.error.set('ThingSpeak: ' + (e.message || 'network error') + ' Showing sample data.'); this.useSample(); this.error.update(m => m || ''); }
  }
  private fromFeed(f: any): Scan {
    const n = (k: string) => Number(f[k]) || 0;
    const s: Scan = { id: String(f.entry_id), board: n('entry_id'), cross: f.status || 'Cross ' + f.field8, hatched: n('field1'), unhatched: n('field2'), dead: n('field3'),
      lux: n('field7'), status: 'OK', time: Date.parse(f.created_at), source: 'ThingSpeak' };
    if (f.field4 != null && Math.abs(n('field4') - pct(s.hatched, s)) > 1) s.status = 'Recount';
    else if (s.lux < LUX_MIN || s.lux > LUX_MAX) s.status = 'Rescanned';
    return s;
  }

  /** Fake scan with the same numbers the real scanner will send (no hardware needed). */
  make(board: number, seed = Math.random() * 100): Scan {
    const r = (n: number) => { const x = Math.sin(seed * 9301 + n * 49297) * 233280; return x - Math.floor(x); };
    const cross = SAMPLE_CROSSES[Math.floor(r(1) * 4)];
    const base = { 'A x B': 0.9, 'C x D': 0.8, 'A x D': 0.86, 'B x C': 0.7 }[cross]!;
    const n = 400 + Math.floor(r(2) * 200), hatched = Math.round(n * (base + (r(3) - 0.5) * 0.08));
    const dead = Math.round((n - hatched) * (0.2 + r(4) * 0.6) * (cross === 'B x C' ? 1.4 : 1));
    const lux = Math.round(250 + r(5) * 800), s: Scan = { board, cross, hatched, unhatched: Math.max(0, n - hatched - dead), dead, lux, status: 'OK', time: Date.now() - (30 - board) * 3600e3, source: 'sample' };
    s.status = r(6) > 0.9 ? 'Recount' : lux < LUX_MIN || lux > LUX_MAX ? 'Rescanned' : 'OK';
    return s;
  }
  async simulateScan() {
    const w = this.cfg().writeKey, s = { ...this.make((this.latest()?.board ?? 0) + 1), time: Date.now(), source: 'simulator' };
    if (!w || this.mode() !== 'live') { this.scans.update(l => [...l, s]); return; }
    const q = new URLSearchParams({ api_key: w, field1: '' + s.hatched, field2: '' + s.unhatched, field3: '' + s.dead, field4: pct(s.hatched, s).toFixed(1), field5: pct(s.dead, s).toFixed(1),
      field6: pct(s.unhatched, s).toFixed(1), field7: '' + s.lux, field8: '' + (this.crosses().indexOf(s.cross) + 1), status: s.cross });
    try { const t = await (await fetch('https://api.thingspeak.com/update.json?' + q)).text(); if (t.trim() === '0') this.error.set('ThingSpeak accepts one update every 15 seconds. Wait and try again.'); else { this.error.set(''); this.load(); } }
    catch { this.error.set('Could not reach ThingSpeak. Check the internet and the write key.'); }
  }
  csv() {
    const h = 'board,cross,hatched,unhatched,dead,survival%,lux,status,time';
    const rows = this.scans().map(s => [s.board, s.cross, s.hatched, s.unhatched, s.dead, pct(s.hatched, s).toFixed(1), s.lux, s.status, new Date(s.time).toISOString()].join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[h, ...rows].join('\n')], { type: 'text/csv' }));
    a.download = 'scan-log.csv'; a.click();
  }
}
