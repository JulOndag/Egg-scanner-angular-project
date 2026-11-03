import { ApplicationConfig } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { authGuard, adminGuard, LoginPage, DashboardPage, ComparePage, LogPage, DevicePage, SettingsPage } from './pages';

export const appConfig: ApplicationConfig = { providers: [provideRouter([
  { path: 'login', component: LoginPage },
  { path: '', component: DashboardPage, canActivate: [authGuard] },
  { path: 'compare', component: ComparePage, canActivate: [authGuard] },
  { path: 'log', component: LogPage, canActivate: [authGuard] },
  { path: 'device', component: DevicePage, canActivate: [authGuard] },
  { path: 'settings', component: SettingsPage, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }], withHashLocation())] };
