import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    this.http
      .post<any>('/api/user/signin', {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (data) => {
          console.log('data', data);
          localStorage.setItem('token', data.token);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.log('error', err);
          alert(err?.error?.message || 'Erreur de connexion');
        },
      });
  }
}
