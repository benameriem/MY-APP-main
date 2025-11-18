import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  department: 'Transport' | 'Logistique' | 'Global' | 'All';
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Charger l'utilisateur depuis le localStorage au démarrage
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
      } catch (e) {
        console.error('Erreur lors du parsing des données utilisateur:', e);
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/user/signin', {
      email,
      password,
    });
  }

  setCurrentUser(user: User, token: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isEmployee(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'employee';
  }

  canAccessDepartment(department: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Admin peut accéder à tous les départements
    if (user.role === 'admin') return true;

    // Employé ne peut accéder qu'à son département
    return user.department === department || user.department === 'All';
  }

  getUserDepartments(): string[] {
    const user = this.getCurrentUser();
    if (!user) return [];

    if (user.role === 'admin' || user.department === 'All') {
      return ['Transport', 'Logistique', 'Global'];
    }

    return [user.department];
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token') && !!this.getCurrentUser();
  }
}
