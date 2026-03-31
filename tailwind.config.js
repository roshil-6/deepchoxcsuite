/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'office-cream': '#050505',
        'office-teal': '#0D9488',
        'office-teal-dark': '#0F766E',
        'office-espresso': '#E5E5E5',
        'office-teal-light': 'rgba(13, 148, 136, 0.1)',
      },
      borderRadius: {
        'office': '24px',
        // Keep card for backward compatibility if needed, or replace usages later. 
        // User snippet used 'office', existing used 'card'. 
        // I will keep 'card' mapping to '24px' as well or just map office. 
        // The user snippet defines 'office'. I should check if 'card' is used widely.
        // Step 145 global.css uses .card class, Step 148 config had card: '24px'.
        // I will add 'office': '24px' AND keep 'card': '24px' to avoid breaking existing classes unless I refactor them all now. 
        // Actually, the user's snippet replaces the config. I will add 'office' and keep 'card' alias for safety, or just added 'office'.
        // Let's stick effectively to the user's snippet but I'll add 'card' back if things break, 
        // or better, I will check usages. 
        // Sidebar.tsx uses rounded-card. 
        // I should probably alias card to office or update Sidebar. 
        // For now, I'll include both to be safe and strictly follow the "apply user design" instruction which implies adding these capabilities.
        'card': '24px',
        'office': '24px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      borderWidth: {
        '0.5': '0.5px',
      }
    },
  },
};
