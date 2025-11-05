module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // <-- add this
    theme: {
        extend: {
          colors: {
            blackPrimary: '#121212', // or your preferred value
            // CSS variable-backed tokens used across the project
            background: 'var(--color-background)',
            foreground: 'var(--color-foreground)',
            card: 'var(--color-card)',
            'card-foreground': 'var(--color-card-foreground)',
            popover: 'var(--color-popover)',
            'popover-foreground': 'var(--color-popover-foreground)',
            primary: 'var(--color-primary)',
            'primary-foreground': 'var(--color-primary-foreground)',
            secondary: 'var(--color-secondary)',
            muted: 'var(--color-muted)',
            'muted-foreground': 'var(--color-muted-foreground)',
            accent: 'var(--color-accent)',
            destructive: 'var(--color-destructive)',
            border: 'var(--color-border)',
            input: 'var(--color-input)',
          },
        },
    },
    plugins: [],
  };
  