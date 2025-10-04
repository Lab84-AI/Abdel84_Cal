import React from 'react';
import './App.css';

const navItems = [
  { label: 'Dashboard', icon: 'grid' },
  { label: 'Models', icon: 'cubes' },
  { label: 'Data', icon: 'database' },
  { label: 'Experiments', icon: 'flask' },
  { label: 'Deployments', icon: 'rocket' },
  { label: 'Monitoring', icon: 'activity' },
  { label: 'Reports', icon: 'file' }
];

const projectMetrics = [
  { label: 'Active Projects', value: '12', accent: '#5f5cf1' },
  { label: 'Models Training', value: '3', accent: '#48c8ff' },
  { label: 'Success Rate', value: '94%', accent: '#3ed0a4' }
];

const quickStats = [
  { title: 'Active Models', value: '18', delta: '+2 this week' },
  { title: 'Scheduled Deployments', value: '5', delta: 'Next in 2h 14m' },
  { title: 'Pending Reviews', value: '3', delta: 'Team feedback needed' }
];

const activities = [
  {
    avatar: 'AC',
    name: 'Alex Chen',
    action: 'Deployed "Customer Churn v4" to production',
    time: '08:24 AM'
  },
  {
    avatar: 'LM',
    name: 'Lara Martinez',
    action: 'Reviewed experiment "Image Classifier Sweep"',
    time: '07:52 AM'
  },
  {
    avatar: 'JW',
    name: 'Jamie Wong',
    action: 'Pushed new features to project "Vision Analytics"',
    time: '07:30 AM'
  }
];

function Icon({ name }) {
  return <span className={`icon icon-${name}`} aria-hidden="true" />;
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-mark">ML</div>
        <div className="sidebar__logo-text">
          <span className="sidebar__logo-title">MLFlow Pro</span>
          <span className="sidebar__logo-subtitle">Intelligent ML Platform</span>
        </div>
      </div>
      <nav className="sidebar__nav">
        {navItems.map(item => (
          <button key={item.label} className={`sidebar__nav-item ${item.label === 'Dashboard' ? 'is-active' : ''}`}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar__status-card">
        <div className="sidebar__status-icon">⚡</div>
        <div className="sidebar__status-content">
          <h3>System Health</h3>
          <p>All services operational</p>
        </div>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="header__search">
        <Icon name="search" />
        <input type="search" placeholder="Search projects, models, experiments..." />
      </div>
      <div className="header__actions">
        <button className="header__action-btn" aria-label="Notifications">
          <Icon name="bell" />
        </button>
        <button className="header__action-btn" aria-label="Settings">
          <Icon name="settings" />
        </button>
        <div className="header__profile">
          <div className="header__profile-text">
            <span className="header__profile-name">Alex Chen</span>
            <span className="header__profile-role">Data Scientist</span>
          </div>
          <div className="header__profile-avatar">AC</div>
        </div>
      </div>
    </header>
  );
}

function WelcomeCard() {
  return (
    <section className="welcome-card">
      <div className="welcome-card__bg" />
      <div className="welcome-card__content">
        <div className="welcome-card__greeting">
          <div className="welcome-card__avatar">AC</div>
          <div>
            <h1>Good afternoon, Alex Chen!</h1>
            <p>Data Scientist · Ready to build something amazing today?</p>
          </div>
        </div>
        <div className="welcome-card__actions">
          <button className="btn btn--primary">New Project</button>
          <button className="btn btn--ghost">View Tutorials</button>
        </div>
      </div>
      <div className="welcome-card__metrics">
        {projectMetrics.map(metric => (
          <div key={metric.label} className="welcome-card__metric">
            <span className="welcome-card__metric-label">{metric.label}</span>
            <span className="welcome-card__metric-value" style={{ color: metric.accent }}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickStats() {
  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Today&apos;s Overview</h2>
        <button className="link-button">View analytics</button>
      </header>
      <div className="quick-stats">
        {quickStats.map(stat => (
          <div key={stat.title} className="quick-stats__item">
            <h3>{stat.title}</h3>
            <p>{stat.value}</p>
            <span>{stat.delta}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityFeed() {
  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Recent Activity</h2>
        <button className="link-button">View all</button>
      </header>
      <ul className="activity-list">
        {activities.map(item => (
          <li key={item.action} className="activity-list__item">
            <div className="activity-list__avatar">{item.avatar}</div>
            <div className="activity-list__details">
              <span className="activity-list__name">{item.name}</span>
              <p>{item.action}</p>
            </div>
            <span className="activity-list__time">{item.time}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpcomingMeetings() {
  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Upcoming Meetings</h2>
        <button className="link-button">Join next</button>
      </header>
      <div className="meetings">
        <article className="meeting-card">
          <div>
            <h3>Weekly Model Review</h3>
            <p>Today · 3:00 PM · Conference Room B</p>
          </div>
          <div className="meeting-card__avatars">
            <span>AC</span>
            <span>LM</span>
            <span>JW</span>
          </div>
        </article>
        <article className="meeting-card meeting-card--secondary">
          <div>
            <h3>Deployment Stand-up</h3>
            <p>Tomorrow · 9:30 AM · Zoom</p>
          </div>
          <button className="btn btn--ghost">Add to calendar</button>
        </article>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <Header />
        <main className="app-shell__content">
          <WelcomeCard />
          <div className="content-grid">
            <QuickStats />
            <ActivityFeed />
            <UpcomingMeetings />
          </div>
        </main>
      </div>
    </div>
  );
}
