import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Application {
  id?: number;
  name: string;
  theme: string;
  performance: string;
  department: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApplicationService {
  private apiUrl = '/api/applications';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('token')
        : null;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  getAll(): Observable<{ data: Application[]; success: boolean }> {
    console.log('Calling API:', this.apiUrl);
    console.log(
      'Token:',
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('token')
        : 'N/A (SSR)'
    );
    return this.http.get<{ data: Application[]; success: boolean }>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  create(
    application: Omit<Application, 'id' | 'created_at'>
  ): Observable<Application> {
    return this.http.post<Application>(this.apiUrl, application, {
      headers: this.getHeaders(),
    });
  }

  update(
    id: number,
    application: Omit<Application, 'id' | 'created_at'>
  ): Observable<Application> {
    return this.http.put<Application>(`${this.apiUrl}/${id}`, application, {
      headers: this.getHeaders(),
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  updatePartial(
    id: number,
    patch: Partial<Omit<Application, 'id' | 'created_at'>>
  ): Observable<Application> {
    return this.http.put<Application>(`${this.apiUrl}/${id}`, patch, {
      headers: this.getHeaders(),
    });
  }

  toggleStatus(
    id: number,
    next: 'active' | 'inactive'
  ): Observable<Application> {
    return this.updatePartial(id, { status: next });
  }

  // Déclenche une relance côté backend (endpoint optionnel)
  // Si votre backend expose une autre route, adaptez l'URL ci-dessous.
  relance(summary: {
    reason: string;
    pending?: boolean;
    timestamp?: string;
  }): Observable<{ status: string }> {
    const url = `/api/relance`;
    const body = {
      ...summary,
      timestamp: summary.timestamp || new Date().toISOString(),
    };
    return this.http.post<{ status: string }>(url, body, {
      headers: this.getHeaders(),
    });
  }
}
