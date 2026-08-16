// ⚠ MIRRORED CONFIG: the `theme` block below is byte-identical to the one in
// ept-portal/tailwind.config.ts (that copy is TS, this one is CommonJS — the
// wrapper differs, the theme must not). Change both in the same sitting.
//
// Futurimi graphics standards. Three rules are enforced here rather than at the
// call sites, so they cannot drift back in:
//   1. every radius resolves to 2px (only `rounded-full` stays round, for the
//      one spinner). `rounded-lg`, `rounded-xl` etc. are kept as aliases so old
//      markup lands on the system instead of erroring.
//   2. every shadow resolves to none. Depth comes from rules and value contrast.
//   3. `transition-all` no longer includes transform or box-shadow, so a stray
//      `hover:` cannot reintroduce a lift or a glow.
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
        ftm: {
          // Grounds — near-black, warmed very slightly off pure neutral.
          night: "#14181B", // page ground
          card: "#1B2024", // raised surface
          up: "#232A2F", // header strip, hover ground
          bar: "#181D21", // top bar
          panel: "#20262B", // dark panel on a light page

          // Paper — warm off-white. Never #FFFFFF.
          paper: "#F4F1EC",
          paper2: "#E7E2D8",

          // Text on dark
          ink: "#F4F1EC",
          mut: "#A2ACB2",
          dim: "#8A959B",
          dim2: "#A2ACB2",
          link: "#D6D1C8",

          // Text on paper
          bodyl: "#3F4A51",
          mutl: "#6B767D",

          // The single accent. Same hue on both grounds — no neon variant.
          crimson: "#C5132D",
          crimsondeep: "#97071E",
          crimsontint: "#F7E3E6",

          // Caution only. From the imigongo beige-yellow.
          ochre: "#C8A96B",
          ochretint: "#F2E9D6",

          // Confirmation only.
          green: "#58A47C",
          greendeep: "#2F6B4A",

          // Neutral slate
          slate: "#93A4AE",
          slatel: "#55636C",
          slateltint: "#EDF0F1",

          // Hairlines
          line: "rgba(244,241,236,.14)",
          line2: "rgba(244,241,236,.30)",
          linel: "rgba(20,24,27,.16)",
          linel2: "rgba(20,24,27,.55)",
        },
      },
      fontFamily: {
        grotesk: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      spacing: {
        // 4px baseline. Named steps so a page reads in units, not pixels.
        bar: "56px",
      },
      maxWidth: {
        measure: "68ch", // reading measure for prose and exam passages
        shell: "1120px", // the one page width
      },
    },

    // Overridden, not extended — these replace Tailwind's scales outright.
    borderRadius: {
      none: "0",
      DEFAULT: "2px",
      sm: "2px",
      md: "2px",
      lg: "2px",
      xl: "2px",
      "2xl": "2px",
      "3xl": "2px",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      DEFAULT: "none",
      sm: "none",
      md: "none",
      lg: "none",
      xl: "none",
      "2xl": "none",
      inner: "none",
    },
    transitionProperty: {
      none: "none",
      all: "color, background-color, border-color, text-decoration-color, fill, stroke, opacity",
      DEFAULT: "color, background-color, border-color, opacity",
      colors: "color, background-color, border-color, text-decoration-color, fill, stroke",
      opacity: "opacity",
      transform: "transform",
    },
  },
  plugins: [],
};
