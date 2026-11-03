import { Injectable, signal } from '@angular/core';
export type Role = 'operator' | 'breeder' | 'admin';
// Demo accounts only. Real logins need a server (see README).
const DEMO: Record<string, { pw: string; role: Role }> = {
  operator: { pw: 'scan2026', role: 'operator' }, breeder: { pw: 'cross2026', role: 'breeder' }, admin: { pw: 'admin2026', role: 'admin' } };

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<{ name: string; role: Role } | null>(JSON.parse(sessionStorage.getItem('u') || 'null'));
  async login(name: string, pw: string): Promise<string> {
    const d = DEMO[name.trim().toLowerCase()];
    if (!d || d.pw !== pw) return 'Wrong username or password.';
    const u = { name, role: d.role }; this.user.set(u); sessionStorage.setItem('u', JSON.stringify(u)); return '';
  }
  logout() { this.user.set(null); sessionStorage.removeItem('u'); }
}
