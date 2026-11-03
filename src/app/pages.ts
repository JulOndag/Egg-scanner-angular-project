import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { DataService, pct, total, TARGET, DEAD_LIMIT, Scan } from './data.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => inject(AuthService).user() ? true : inject(Router).parseUrl('/login');
export const adminGuard: CanActivateFn = () => inject(AuthService).user()?.role === 'admin' ? true : inject(Router).parseUrl('/');

@Component({ standalone: true, imports: [FormsModule], template: `
<main class="login"><h1>Smart Egg Board</h1><p>Sign in to see hatching results.</p>
<form (ngSubmit)="go()"><input [(ngModel)]="u" name="u" placeholder="Username" autocomplete="username">
<input [(ngModel)]="p" name="p" type="password" placeholder="Password" autocomplete="current-password">
<button class="btn">Sign in</button></form>
@if (err()) { <p class="err">{{ err() }}</p> }
<div class="demo">@for (d of demos; track d[0]) { <button class="btn ghost" (click)="u=d[0];p=d[1]">{{ d[0] }}</button> }</div></main>` })
export class LoginPage {
  a = inject(AuthService); r = inject(Router); u = ''; p = ''; err = signal('');
  demos = [['operator', 'scan2026'], ['breeder', 'cross2026'], ['admin', 'admin2026']];
  async go() { const e = await this.a.login(this.u, this.p); this.err.set(e); if (!e) this.r.navigateByUrl('/'); }
}

@Component({ standalone: true, imports: [FormsModule, DecimalPipe], template: `
<h2>Dashboard</h2>
@if (d.latest(); as s) {
<section class="card hero">
  <div class="gauge" [style.--p]="surv(s)"><b>{{ surv(s) | number:'1.0-1' }}%</b><span>survival</span></div>
  <div><h3>Board {{ s.board }} · {{ s.cross }} <span class="pill" [class]="cls(s)">{{ label(s) }}</span></h3>
  <p class="counts"><span>Hatched <b>{{ s.hatched }}</b> ({{ p(s.hatched, s) | number:'1.0-1' }}%)</span>
  <span>Unhatched <b>{{ s.unhatched }}</b> ({{ p(s.unhatched, s) | number:'1.0-1' }}%)</span>
  <span>Dead <b>{{ s.dead }}</b> ({{ p(s.dead, s) | number:'1.0-1' }}%)</span></p>
  <p>{{ t(s) }} eggs · {{ s.lux }} lux · scan {{ s.status }}</p></div>
</section>}
<section class="card"><label>Survival per board for cross
<select [ngModel]="cur()" (ngModelChange)="cross=$event">@for (c of d.crosses(); track c) { <option>{{ c }}</option> }</select></label>
<svg viewBox="0 0 600 180" class="chart"><line x1="0" x2="600" [attr.y1]="y(85)" [attr.y2]="y(85)" class="target"/>
<text x="4" [attr.y]="y(85)-4" class="tl">85% target</text><polyline [attr.points]="pts()" class="line"/></svg></section>
<section class="stats"><div class="card">Boards <b>{{ d.scans().length }}</b></div><div class="card">Eggs <b>{{ eggs() }}</b></div>
<div class="card">Best cross <b>{{ d.ranking()[0]?.cross }}</b></div><div class="card">Open alerts <b>{{ d.alerts().length }}</b></div></section>` })
export class DashboardPage {
  d = inject(DataService); cross = ''; cur = () => this.cross || this.d.crosses()[0]; p = pct; t = total;
  surv = (s: Scan) => pct(s.hatched, s);
  label = (s: Scan) => pct(s.dead, s) > DEAD_LIMIT ? 'High dead %' : this.surv(s) >= TARGET ? 'Good cross' : 'Watch';
  cls = (s: Scan) => ({ 'High dead %': 'bad', 'Good cross': 'good', Watch: 'mid' } as any)[this.label(s)];
  eggs = computed(() => this.d.scans().reduce((a, s) => a + total(s), 0));
  y = (v: number) => 170 - (v - 50) * 3.2;
  pts() { const l = this.d.scans().filter(s => s.cross === this.cur()); return l.map((s, i) => `${20 + i * (560 / Math.max(l.length - 1, 1))},${this.y(this.surv(s))}`).join(' '); }
}

@Component({ standalone: true, imports: [DecimalPipe], template: `
<h2>Compare crosses</h2>
@for (r of d.ranking(); track r.cross) { <div class="row"><span>{{ r.cross }}</span>
<div class="bar"><i class="h" [style.width.%]="r.hatched/r.eggs*100"></i><i class="u" [style.width.%]="r.unhatched/r.eggs*100"></i><i class="x" [style.width.%]="r.dead/r.eggs*100"></i></div>
<b>{{ r.surv | number:'1.0-1' }}%</b></div> }
<div class="legend"><i class="h"></i>Hatched <i class="u"></i>Unhatched <i class="x"></i>Dead</div>
<div class="scroll"><table><tr><th>Cross<th>Boards<th>Eggs<th>Survival<th>Unhatched<th>Dead<th>Advice</tr>
@for (r of d.ranking(); track r.cross) { <tr><td>{{ r.cross }}<td>{{ r.boards }}<td>{{ r.eggs }}<td>{{ r.surv | number:'1.1-1' }}%<td>{{ r.unh | number:'1.1-1' }}%<td>{{ r.deadPct | number:'1.1-1' }}%<td>{{ r.advice }}</tr> }</table></div>` })
export class ComparePage { d = inject(DataService); }

@Component({ standalone: true, imports: [FormsModule, DatePipe, DecimalPipe], template: `
<h2>Scan log</h2>
<label>Cross <select [(ngModel)]="f"><option value="">All</option>@for (c of d.crosses(); track c) { <option>{{ c }}</option> }</select></label>
@if (a.user()?.role !== 'breeder') { <button class="btn" (click)="d.csv()">Download CSV</button> }
<div class="scroll"><table><tr><th>Board<th>Cross<th>H<th>U<th>D<th>Survival<th>Lux<th>Status<th>Time<th>Source</tr>
@for (s of rows(); track s.id ?? s.board) { <tr><td>{{ s.board }}<td>{{ s.cross }}<td>{{ s.hatched }}<td>{{ s.unhatched }}<td>{{ s.dead }}<td>{{ p(s.hatched, s) | number:'1.1-1' }}%<td>{{ s.lux }}<td>{{ s.status }}<td>{{ s.time | date:'MMM d, HH:mm' }}<td>{{ s.source }}</tr> }</table></div>` })
export class LogPage {
  d = inject(DataService); a = inject(AuthService); f = ''; p = pct;
  rows = () => this.d.scans().filter(s => !this.f || s.cross === this.f).slice().reverse();
}

@Component({ standalone: true, imports: [DatePipe], template: `
<h2>Device and alerts</h2>
<section class="card"><p>Scanner: <b>{{ d.mode() === 'live' ? 'ThingSpeak' : 'Simulated' }}</b> · Last scan: {{ d.latest()?.time | date:'medium' }}</p>
<p>No hardware connected yet. This button adds a fake scan like the real scanner will. In live mode it needs the write key (Settings).</p>
<button class="btn" (click)="d.simulateScan()">Simulate a scan</button></section>
@for (s of d.alerts().slice(0, 15); track s.id ?? s.board) { <div class="alert">Board {{ s.board }} ({{ s.cross }}):
{{ s.status === 'Recount' ? 'counts do not add up, count by hand' : s.status === 'Rescanned' ? 'light out of range, rescanned' : 'high dead %' }}</div> }
@empty { <p>No alerts.</p> }` })
export class DevicePage { d = inject(DataService); }

@Component({ standalone: true, imports: [FormsModule], template: `
<h2>Settings</h2>
<section class="card"><h3>ThingSpeak channel</h3>
<form class="grid" (ngSubmit)="save()"><input [(ngModel)]="ch" name="ch" placeholder="Channel ID" inputmode="numeric">
<input [(ngModel)]="rk" name="rk" placeholder="Read key (only if the channel is private)">
<input [(ngModel)]="wk" name="wk" placeholder="Write key (only for the Simulate button)">
<button class="btn">Save and load</button></form>
<button class="btn ghost" (click)="clear()">Use sample data</button>
<p class="note">Keys are saved in this browser only.</p></section>
<section class="card"><h3>Channel field map</h3><code>field1 hatched · field2 unhatched · field3 dead · field4 survival % · field5 dead % · field6 unhatched % · field7 lux · field8 cross code · status = cross name (for example A x B)</code></section>
<section class="card"><h3>Scan rules (prototype values)</h3><p>Valid light 300 to 1000 lux · up to 3 rescans · 5% count error target · pair again at 85% survival or higher · poor board above 15% dead.</p></section>` })
export class SettingsPage {
  d = inject(DataService); ch = this.d.cfg().channel; rk = this.d.cfg().readKey; wk = this.d.cfg().writeKey;
  save() { this.d.save(this.ch, this.rk, this.wk); }
  clear() { this.ch = this.rk = this.wk = ''; this.d.save('', '', ''); }
}
