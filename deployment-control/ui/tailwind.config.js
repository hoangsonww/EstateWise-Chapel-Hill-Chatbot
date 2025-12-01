export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0d1829",
        "bg-2": "#0f243d",
        panel: "#111f33",
        border: "rgba(255, 255, 255, 0.08)",
        accent: "#ffb703",
        "accent-2": "#14cba8",
        muted: "#a0aec0",
        text: "#e9edf5",
        danger: "#ff6b6b",
        success: "#5cf2c7",
        warning: "#ffd166",
      },
      fontFamily: {
        sans: ["Space Grotesk", "Sora", "Inter", "system-ui", "sans-serif"],
        mono: ["Sora", "SFMono-Regular", "Consolas", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 18px 60px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
