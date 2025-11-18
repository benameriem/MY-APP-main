import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostBinding,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ApplicationService,
  Application,
} from '../services/application.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard-new.css'],
})
export class Dashboard implements OnInit {
  applications: Application[] = [];
  showCreateForm = false;
  editingApp: Application | null = null;
  // Filtres
  searchTerm = '';
  departmentFilter: 'all' | 'Transport' | 'Logistique' | 'Global' = 'all';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  // Section active
  activeSection: 'dashboard' | 'transport' | 'logistique' | 'global' =
    'dashboard';
  // Thème (minuit par défaut)
  theme: 'midnight' | 'light' = 'midnight';
  @HostBinding('class.theme-midnight') get isMidnight() {
    return this.theme === 'midnight';
  }
  @HostBinding('class.theme-light') get isLight() {
    return this.theme === 'light';
  }
  // Rôles et monitoring
  isAdmin = false;
  pendingChanges = false;
  isRefreshing = false;
  lastSyncTime = new Date();
  history: { time: string; action: string; detail?: string }[] = [];
  // Exposer Math pour le template
  Math = Math;

  newApp: Omit<Application, 'id' | 'created_at'> = {
    name: '',
    theme: '',
    performance: 'Bon',
    department: '',
    status: 'active',
  };

  constructor(
    private applicationService: ApplicationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as
        | 'midnight'
        | 'light'
        | null;
      if (savedTheme === 'midnight' || savedTheme === 'light') {
        this.theme = savedTheme;
      }
      const roleFromToken = this.parseRoleFromToken();
      const roleFromStorage = localStorage.getItem('role');
      this.isAdmin = roleFromToken === 'admin' || roleFromStorage === 'admin';
    }
    this.loadApplications();
  }

  loadApplications() {
    console.log('🔄 Chargement des applications...');
    this.applicationService.getAll().subscribe({
      next: (apps) => {
        console.log('✅ Applications reçues:', apps);
        this.applications = apps?.data || [];
        console.log("📦 Nombre d'applications:", this.applications.length);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des applications:', err);
      },
    });
  }

  loadApplicationsDirectly() {
    // Simulation des données en attendant la correction du problème de connexion
    this.applications = [
      {
        id: 1,
        name: 'Transport Manager',
        theme: 'Transport',
        performance: 'Bon',
        department: 'Logistique',
        status: 'active',
        created_at: '2025-10-21T08:03:48.000Z',
      },
      {
        id: 2,
        name: 'TrackIt',
        theme: 'Suivi',
        performance: 'Excellent',
        department: 'Global',
        status: 'active',
        created_at: '2025-10-21T08:03:48.000Z',
      },
    ];
    console.log(
      '✅ Applications chargées en mode fallback:',
      this.applications
    );
    this.cdr.detectChanges();
  }

  createApplication() {
    if (!this.isAdmin) {
      alert('Action réservée aux administrateurs');
      return;
    }
    if (this.newApp.name && this.newApp.department) {
      this.applicationService.create(this.newApp).subscribe({
        next: () => {
          this.loadApplications();
          this.resetForm();
          this.pendingChanges = true;
          this.addHistory('Création', this.newApp.name);
        },
        error: (err) => {
          console.error('Erreur lors de la création:', err);
          alert("Erreur lors de la création de l'application");
        },
      });
    }
  }

  editApplication(app: Application) {
    this.editingApp = { ...app };
    this.showCreateForm = true;
    this.newApp = {
      name: app.name,
      theme: app.theme,
      performance: app.performance,
      department: app.department,
      status: app.status,
    };
  }

  updateApplication() {
    if (!this.isAdmin) {
      alert('Action réservée aux administrateurs');
      return;
    }
    if (this.editingApp && this.newApp.name && this.newApp.department) {
      this.applicationService
        .update(this.editingApp.id!, this.newApp)
        .subscribe({
          next: () => {
            this.loadApplications();
            this.resetForm();
            this.pendingChanges = true;
            this.addHistory('Mise à jour', this.editingApp?.name || '');
          },
          error: (err) => {
            console.error('Erreur lors de la mise à jour:', err);
            alert('Erreur lors de la mise à jour');
          },
        });
    }
  }

  deleteApplication(id: number) {
    if (!this.isAdmin) {
      alert('Action réservée aux administrateurs');
      return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer cette application ?')) {
      this.applicationService.delete(id).subscribe({
        next: () => {
          this.loadApplications();
          this.pendingChanges = true;
          this.addHistory('Suppression', String(id));
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          alert('Erreur lors de la suppression');
        },
      });
    }
  }

  resetForm() {
    this.showCreateForm = false;
    this.editingApp = null;
    this.newApp = {
      name: '',
      theme: '',
      performance: 'Bon',
      department: '',
      status: 'active',
    };
  }

  // Filtrage des applications
  getFilteredApplications(): Application[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.applications.filter((app) => {
      const matchesSearch =
        term === '' ||
        app.name.toLowerCase().includes(term) ||
        (app.theme || '').toLowerCase().includes(term) ||
        (app.department || '').toLowerCase().includes(term);
      const matchesDept =
        this.departmentFilter === 'all' ||
        app.department === this.departmentFilter;
      const matchesStatus =
        this.statusFilter === 'all' || app.status === this.statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }

  // Bascule de statut avec MAJ backend
  toggleStatus(app: Application) {
    if (!this.isAdmin) {
      alert('Action réservée aux administrateurs');
      return;
    }
    const next: 'active' | 'inactive' =
      app.status === 'active' ? 'inactive' : 'active';
    const payload = {
      name: app.name,
      theme: app.theme,
      performance: app.performance,
      department: app.department,
      status: next,
    };
    this.applicationService.update(app.id!, payload).subscribe({
      next: () => {
        app.status = next;
        this.cdr.detectChanges();
        this.pendingChanges = true;
        this.addHistory('Statut modifié', `${app.name} → ${next}`);
      },
      error: (err) => {
        console.error('Erreur toggle status:', err);
        alert('Impossible de changer le statut. Veuillez réessayer.');
      },
    });
  }

  getUniqueDepartments(): string[] {
    const departments = this.applications.map((app) => app.department);
    return [...new Set(departments)];
  }

  getActiveApps(): Application[] {
    return this.applications.filter((app) => app.status === 'active');
  }

  getInactiveApps(): Application[] {
    return this.applications.filter((app) => app.status === 'inactive');
  }

  // Décodage du rôle depuis le token JWT (si présent)
  private parseRoleFromToken(): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      if (payload?.role) return payload.role;
      if (Array.isArray(payload?.roles) && payload.roles.length > 0)
        return payload.roles[0];
      return null;
    } catch {
      return null;
    }
  }

  private addHistory(action: string, detail?: string) {
    const time = new Date().toLocaleString();
    this.history.unshift({ time, action, detail });
    if (this.history.length > 50) this.history.pop();
  }

  // Relance manuelle: recharge les données et exporte un .doc si demandé
  refreshData(triggerExport = true) {
    this.isRefreshing = true;
    this.cdr.detectChanges();

    // Tente d'informer le backend (optionnel si endpoint absent)
    this.applicationService
      .relance({
        reason: this.pendingChanges ? 'apply-changes' : 'manual',
        pending: this.pendingChanges,
      })
      .subscribe({
        next: () => {
          this.addHistory('Relance API', 'Backend notifié');
          this.loadApplications();
          this.pendingChanges = false;
          this.lastSyncTime = new Date();
          this.isRefreshing = false;
          this.addHistory('Synchronisation effectuée', 'Données rafraîchies');
          if (triggerExport) this.exportDoc();
          this.cdr.detectChanges();
        },
        error: () => {
          // Même si la route n'existe pas, on rafraîchit les données
          this.addHistory('Synchronisation locale', 'API indisponible');
          this.loadApplications();
          this.pendingChanges = false;
          this.lastSyncTime = new Date();
          this.isRefreshing = false;
          if (triggerExport) this.exportDoc();
          this.cdr.detectChanges();
        },
      });
  }

  getLastSyncTime(): string {
    const now = new Date();
    const diff = Math.floor(
      (now.getTime() - this.lastSyncTime.getTime()) / 1000
    );

    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return this.lastSyncTime.toLocaleDateString();
  }

  // Export simple en .doc (HTML lisible par Word)
  exportDoc() {
    const rows = this.getSectionApps()
      .map(
        (a) => `
      <tr>
        <td>${a.name || ''}</td>
        <td>${a.theme || ''}</td>
        <td>${a.department || ''}</td>
        <td>${a.performance || ''}</td>
        <td>${a.status || ''}</td>
        <td>${
          a.created_at ? new Date(a.created_at).toLocaleDateString() : ''
        }</td>
      </tr>
    `
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Résultats</title></head>
      <body>
        <h1>Rapport Applications</h1>
        <p>Section: ${this.getPageTitle()}</p>
        <table border="1" cellspacing="0" cellpadding="6">
          <tr>
            <th>Nom</th><th>Thème</th><th>Département</th><th>Performance</th><th>Statut</th><th>Création</th>
          </tr>
          ${rows}
        </table>
      </body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultats.doc';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.addHistory('Export DOC', 'resultats.doc créé');
  }

  // Thème
  setTheme(theme: 'midnight' | 'light') {
    this.theme = theme;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
    this.cdr.detectChanges();
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    this.router.navigate(['/login']);
  }

  // Navigation par sections
  setActiveSection(
    section: 'dashboard' | 'transport' | 'logistique' | 'global'
  ) {
    this.activeSection = section;
    this.cdr.detectChanges();
  }

  getPageTitle(): string {
    const titles = {
      dashboard: 'Tableau de bord',
      transport: 'Transport',
      logistique: 'Logistique',
      global: 'Global',
    };
    return titles[this.activeSection];
  }

  getSectionApps(): Application[] {
    const term = this.searchTerm.trim().toLowerCase();
    let filtered = this.applications;

    // Filtrer par section
    if (this.activeSection === 'transport') {
      filtered = filtered.filter((app) => app.department === 'Transport');
    } else if (this.activeSection === 'logistique') {
      filtered = filtered.filter((app) => app.department === 'Logistique');
    } else if (this.activeSection === 'global') {
      filtered = filtered.filter((app) => app.department === 'Global');
    }
    // Pour 'dashboard' et 'liste', on affiche tout

    // Filtrer par recherche
    if (term) {
      filtered = filtered.filter(
        (app) =>
          app.name.toLowerCase().includes(term) ||
          (app.theme || '').toLowerCase().includes(term) ||
          (app.department || '').toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  getAveragePerformance(): string {
    const apps = this.getSectionApps();
    if (apps.length === 0) return '---';

    const perfMap: { [key: string]: number } = {
      Excellent: 4,
      Bon: 3,
      Moyen: 2,
      Faible: 1,
    };

    const sum = apps.reduce(
      (acc, app) => acc + (perfMap[app.performance || 'Moyen'] || 2),
      0
    );
    const avg = sum / apps.length;

    if (avg >= 3.5) return 'Excellent';
    if (avg >= 2.5) return 'Bon';
    if (avg >= 1.5) return 'Moyen';
    return 'Faible';
  }
}
