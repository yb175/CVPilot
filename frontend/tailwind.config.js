/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      'sans': [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
      ],
      'display': [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ],
    },
    extend: {
      // Color system with semantic names
      colors: {
        // Background colors
        'bg-primary': '#07090f',      // Landing page, hero backgrounds
        'bg-secondary': '#080b14',    // Main content areas (Jobs, Profile)
        'bg-tertiary': '#0b0f19',     // App layout background
        'bg-surface': '#0d111c',      // Cards, elevated surfaces
        'bg-hover': '#0f1427',        // Hover states on surfaces
        'bg-interactive': '#131829',  // Interactive elements

        // Text colors
        'text-primary': '#e8e8e8',    // Headings, primary text
        'text-secondary': '#b3bac2',  // Body text, descriptions
        'text-tertiary': '#7a8290',   // Labels, muted text
        'text-disabled': '#4f5563',   // Disabled text
        'text-inverse': '#ffffff',    // White text on dark backgrounds

        // Border colors with opacity
        'border-light': 'rgba(255, 255, 255, 0.08)',
        'border-normal': 'rgba(255, 255, 255, 0.12)',
        'border-hover': 'rgba(255, 255, 255, 0.16)',
        'border-focus': 'rgba(99, 102, 241, 0.3)',

        // Surface hover/active states
        'surface-hover': 'rgba(255, 255, 255, 0.06)',
        'surface-active': 'rgba(255, 255, 255, 0.08)',

        // Status colors
        'status-success': '#34d399',   // Emerald - success, remote, positive
        'status-info': '#818cf8',      // Indigo - info, primary, strong
        'status-warning': '#fb923c',   // Orange - warning, moderate, intern
        'status-danger': '#f87171',    // Red - danger, error, negative
        'status-muted': '#94a3b8',     // Slate - muted,  neutral, fair

        // Accent colors
        'accent-primary': '#6366f1',   // Indigo primary
        'accent-light': '#a5b4fc',     // Indigo light
        'accent-bright': '#818cf8',    // Indigo bright
      },

      // Semantic spacing
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '48px',
      },

      // Typography scale
      fontSize: {
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0em' }],
        'sm': ['14px', { lineHeight: '20px', letterSpacing: '0em' }],
        'base': ['16px', { lineHeight: '24px', letterSpacing: '0em' }],
        'lg': ['18px', { lineHeight: '28px', letterSpacing: '0em' }],
        'xl': ['20px', { lineHeight: '28px', letterSpacing: '0em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        '4xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
        '5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em' }],
        '6xl': ['60px', { lineHeight: '68px', letterSpacing: '-0.02em' }],
      },

      // Letter spacing
      letterSpacing: {
        'tight': '-0.02em',
        'normal': '0em',
        'wide': '0.035em',
        'wider': '0.2em',
        'widest': '0.35em',
      },

      // Border radius
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },

      // Box shadows with glow effects
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 8px 16px -2px rgba(0, 0, 0, 0.15)',
        'glow-sm': '0 0 12px rgba(99, 102, 241, 0.15)',
        'glow-md': '0 0 20px rgba(99, 102, 241, 0.25)',
        'glow-lg': '0 0 32px rgba(99, 102, 241, 0.35)',
      },

      // Max widths for containers
      maxWidth: {
        'container-sm': '640px',
        'container-md': '768px',
        'container-lg': '1024px',
        'container-xl': '1280px',
        'content': '900px',  // Main content width
        'form': '600px',     // Form content width
      },

      // Animation additions
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-in-out',
        'slide-down': 'slide-down 200ms ease-out',
      },

      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
}

