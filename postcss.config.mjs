import theme from "./scripts/postcss-theme.cjs";

const config = {
  plugins: [
    ["@tailwindcss/postcss", {}],
    theme,
  ],
};

export default config;
