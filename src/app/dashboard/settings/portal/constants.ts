export const PREDEFINED_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#f97316', // Orange
  '#84cc16', // Lime
];

export const PREDEFINED_COLOR_COMBINATIONS = [
  {
    name: 'Default Theme',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    isDefault: true,
  },
  {
    name: 'Ocean Blue',
    primary: '#3b82f6',
    secondary: '#06b6d4',
  },
  {
    name: 'Forest Green',
    primary: '#10b981',
    secondary: '#84cc16',
  },
  {
    name: 'Sunset Orange',
    primary: '#f97316',
    secondary: '#f59e0b',
  },
  {
    name: 'Cherry Blossom',
    primary: '#ec4899',
    secondary: '#f43f5e',
  },
  {
    name: 'Midnight',
    primary: '#64748b',
    secondary: '#3e4456',
  },
  {
    name: 'Emerald Mint',
    primary: '#059669',
    secondary: '#34d399',
  },
  {
    name: 'Royal Purple',
    primary: '#7c3aed',
    secondary: '#a855f7',
  },
];

export const HEADER_EXAMPLE_HTML = `<style>
  .portal-header {
    background: linear-gradient(135deg, var(--portal-primary, #6366f1), var(--portal-secondary, #8b5cf6));
    padding: 1rem 2rem;
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .portal-header-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
  }
  .portal-header-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  .portal-header-nav {
    display: flex;
    gap: 1rem;
  }
  .portal-header-link {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: background-color 0.2s ease;
    font-weight: 500;
  }
  .portal-header-link:hover {
    background-color: rgba(255,255,255,0.15);
  }
</style>
<div class="portal-header">
  <div class="portal-header-container">
    <h1 class="portal-header-title">Your Company</h1>
    <nav class="portal-header-nav">
      <a href="#jobs" class="portal-header-link">Open Positions</a>
      <a href="#about" class="portal-header-link">About Us</a>
      <a href="#contact" class="portal-header-link">Contact</a>
    </nav>
  </div>
</div>`;

export const FOOTER_EXAMPLE_HTML = `<style>
  .portal-footer {
    background: linear-gradient(135deg, var(--portal-primary, #6366f1), var(--portal-secondary, #8b5cf6));
    color: white;
    padding: 2rem;
    margin-top: 2rem;
    text-align: center;
  }
  .portal-footer-container {
    max-width: 1200px;
    margin: 0 auto;
  }
  .portal-footer h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .portal-footer p {
    margin: 0;
    opacity: 0.9;
  }
  .portal-footer-links {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin: 1.5rem 0;
  }
  .portal-footer-link {
    color: white;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }
  .portal-footer-link:hover {
    opacity: 0.8;
  }
</style>
<div class="portal-footer">
  <div class="portal-footer-container">
    <h3>Your Company</h3>
    <div class="portal-footer-links">
      <a href="#" class="portal-footer-link">Privacy Policy</a>
      <a href="#" class="portal-footer-link">Terms of Service</a>
      <a href="#" class="portal-footer-link">Contact Us</a>
    </div>
    <p>&copy; 2024 Your Company. All rights reserved.</p>
  </div>
</div>`;
