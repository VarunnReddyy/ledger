/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        ledger: "var(--ledger)",
        rule: "var(--rule)",
        seal: "var(--seal)",
        "seal-deep": "var(--seal-deep)",
        flag: "var(--flag)",
        pending: "var(--pending)",
        machine: "var(--machine)",
      },
      fontFamily: {
        sans: ["Instrument Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
