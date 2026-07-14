/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    relative: true,
    files: [
      "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
  },
  theme: {
    extend: {
      colors: {
        // Futurimi design tokens (see design_handoff_futurimi_redesign)
        ftm: {
          night: "#12171B", // dark page bg
          card: "#1B2226", // dark card bg
          up: "#20282D", // elevated card / header strip
          bar: "#181F24", // top bar
          panel: "#20262B", // light-theme ink
          ink: "#F3F0EA", // dark-theme headings
          paper: "#F4F1EC",
          bodyl: "#4B565D",
          mutl: "#7C8790",
          mut: "#7E8B93",
          dim: "#6E7A82",
          dim2: "#8B979E",
          link: "#C3CAD0",
          crimson: "#C5132D",
          crimsontint: "#FBE7E9",
          red: "#E0273F",
          redsoft: "#F09AA6",
          slatel: "#55636C",
          slateltint: "#EDF0F1",
          slate: "#93A4AE",
          green: "#48B27F",
          amber: "#D9A441",
          amberdim: "#C7A466",
          indigo: "#8CA3F0", // Futurimi wordmark "imi"
        },
      },
      fontFamily: {
        grotesk: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        redglow: "0 4px 18px rgba(224,39,63,.3)",
      },
    },
  },
  plugins: [],
}
