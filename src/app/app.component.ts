import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

@Component({ selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive], template: `
@if (a.user(); as u) {
<header><b class="brand">SmartEggBoard</b>
<nav><a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{exact:true}">Dashboard</a><a routerLink="/compare" routerLinkActive="on">Compare crosses</a>
<a routerLink="/log" routerLinkActive="on">Scan log</a><a routerLink="/device" routerLinkActive="on">Device and alerts</a>
@if (u.role === 'admin') { <a routerLink="/settings" routerLinkActive="on">Settings</a> }</nav>
<span>{{ u.role }} <button class="btn ghost" (click)="toggle()">Theme</button> <button class="btn ghost" (click)="out()">Sign out</button></span></header>
<div class="banner">{{ d.mode() === 'live' ? 'Live data from ThingSpeak' : 'Sample data' }}</div>
@if (d.error()) { <div class="banner warn">{{ d.error() }}</div> } }
<router-outlet />` })
export class AppComponent {
  a = inject(AuthService); d = inject(DataService); r = inject(Router);
  out() { this.a.logout(); this.r.navigateByUrl('/login'); }
  toggle() { const el = document.documentElement; el.dataset['theme'] = el.dataset['theme'] === 'dark' ? 'light' : 'dark'; }
}
