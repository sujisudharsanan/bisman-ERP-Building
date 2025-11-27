const themes = [
  {
    id: 'bisman-default',
    name: 'BISMAN Default',
    bgMain: '#0F172A',
    bgSecondary: '#111827',
    bgPanel: '#1E293B',
    border: '#334155',
    divider: '#1F2937',
    textPrimary: '#E5E7EB',
    textSecondary: '#94A3B8',
    userBubble: '#312E81',
    assistantBubble: '#1F2937',
    accent: '#4338CA'
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    bgMain: '#0A0E27',
    bgSecondary: '#0F1535',
    bgPanel: '#161B3D',
    border: '#1E2749',
    divider: '#151A3C',
    textPrimary: '#E0E7FF',
    textSecondary: '#8B9DC3',
    userBubble: '#1E40AF',
    assistantBubble: '#1E2749',
    accent: '#3B82F6'
  },
  {
    id: 'slate-pro',
    name: 'Slate Professional',
    bgMain: '#0F1419',
    bgSecondary: '#1A1F29',
    bgPanel: '#252A35',
    border: '#3D4451',
    divider: '#1E232D',
    textPrimary: '#E4E6EB',
    textSecondary: '#9CA3AF',
    userBubble: '#374151',
    assistantBubble: '#1F2937',
    accent: '#60A5FA'
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    bgMain: '#041E3A',
    bgSecondary: '#0A2540',
    bgPanel: '#0F2E4D',
    border: '#1E3A5F',
    divider: '#0D2843',
    textPrimary: '#E0F2FE',
    textSecondary: '#7DD3FC',
    userBubble: '#075985',
    assistantBubble: '#0E3A5C',
    accent: '#0EA5E9'
  },
  {
    id: 'carbon-dark',
    name: 'Carbon Dark',
    bgMain: '#161616',
    bgSecondary: '#1C1C1C',
    bgPanel: '#262626',
    border: '#393939',
    divider: '#202020',
    textPrimary: '#F4F4F4',
    textSecondary: '#A8A8A8',
    userBubble: '#393939',
    assistantBubble: '#262626',
    accent: '#78A9FF'
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    bgMain: '#1A0F2E',
    bgSecondary: '#231640',
    bgPanel: '#2D1B4E',
    border: '#3E2463',
    divider: '#281A42',
    textPrimary: '#F3E8FF',
    textSecondary: '#C4B5FD',
    userBubble: '#5B21B6',
    assistantBubble: '#2D1B4E',
    accent: '#A78BFA'
  },
  {
    id: 'forest-night',
    name: 'Forest Night',
    bgMain: '#0C1713',
    bgSecondary: '#111D1A',
    bgPanel: '#1A2C23',
    border: '#2D4A3D',
    divider: '#152520',
    textPrimary: '#ECFDF5',
    textSecondary: '#86EFAC',
    userBubble: '#065F46',
    assistantBubble: '#1E3A2F',
    accent: '#10B981'
  }
];

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--bg-main', theme.bgMain);
  root.style.setProperty('--bg-secondary', theme.bgSecondary);
  root.style.setProperty('--bg-panel', theme.bgPanel);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--divider', theme.divider);
  root.style.setProperty('--text-primary', theme.textPrimary);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--user-bubble', theme.userBubble);
  root.style.setProperty('--assistant-bubble', theme.assistantBubble);
  root.style.setProperty('--accent', theme.accent);
}

function getThemeById(id) {
  return themes.find(theme => theme.id === id);
}

function saveThemePreference(themeId) {
  localStorage.setItem('bisman-theme', themeId);
}

function loadThemePreference() {
  return localStorage.getItem('bisman-theme') || 'bisman-default';
}

function initializeTheme() {
  const savedThemeId = loadThemePreference();
  const theme = getThemeById(savedThemeId) || themes[0];
  applyTheme(theme);
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initializeTheme);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    themes,
    applyTheme,
    getThemeById,
    saveThemePreference,
    loadThemePreference,
    initializeTheme
  };
}
