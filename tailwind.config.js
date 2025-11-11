/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Brand colors
        maroon: {
          DEFAULT: "#432323",
          light: "#5a3030",
          lighter: "#724040",
        },
        teal: {
          DEFAULT: "#2F5755",
          light: "#5A9690",
          lighter: "#7cb3ad",
        },
        grey: {
          DEFAULT: "#E0D9D9",
          dark: "#b8b0b0",
          darker: "#8f8888",
        },
        // Highlight
        highlight: {
          DEFAULT: "#add8e6",
          hover: "#87ceeb",
        },
        // Surface colors (will be used with CSS variables)
        surface: {
          0: "var(--clr-surface-a0)",
          10: "var(--clr-surface-a10)",
          20: "var(--clr-surface-a20)",
          30: "var(--clr-surface-a30)",
          40: "var(--clr-surface-a40)",
          50: "var(--clr-surface-a50)",
        },
        primary: {
          0: "var(--clr-primary-a0)",
          10: "var(--clr-primary-a10)",
          20: "var(--clr-primary-a20)",
          30: "var(--clr-primary-a30)",
          40: "var(--clr-primary-a40)",
          50: "var(--clr-primary-a50)",
        },
      },
      backgroundColor: {
        reader: "var(--reader-bg)",
      },
      textColor: {
        reader: "var(--reader-text)",
        primary: "var(--clr-text-primary)",
        secondary: "var(--clr-text-secondary)",
        tertiary: "var(--clr-text-tertiary)",
        muted: "var(--clr-text-muted)",
      },
    },
  },
  plugins: [],
};
