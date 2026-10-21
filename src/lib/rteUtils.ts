export const fontFamilies = [
  { name: 'Default', value: 'sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Courier', value: 'Courier, monospace' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
];

export const colorOptions = [
  { name: 'Black', value: '#000000' },
  { name: 'Gray', value: '#666666' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Green', value: '#008000' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Purple', value: '#800080' },
  { name: 'Orange', value: '#ffa500' },
];

export const highlightColors = [
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Green', value: '#00ff00' },
  { name: 'Pink', value: '#ff00ff' },
  { name: 'Blue', value: '#00ffff' },
  { name: 'Red', value: '#ff9999' },
];

export const defaultHeaderHtml = `<header style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 1rem; display: flex; justify-content: space-between; align-items: center;">
    <div style="font-size: 1.5rem; font-weight: bold;">Organization Name</div>
    <nav style="display: flex; gap: 2rem;">
    </nav>
  </div>
</header>`;

export const defaultFooterHtml = `<footer style="background: #1a202c; color: white; padding: 3rem 0 1rem;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 0rem;">
    <div style=" padding-top: 0rem; text-align: center; color: #a0aec0;">
      <p>&copy; 2024 Your Company. All rights reserved.</p>
    </div>
  </div>
</footer>`;
