const themeScript = `
(() => {
  const storageKey = "dobly-theme";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = (mode) => {
    const resolved = mode === "system"
      ? (media.matches ? "dark" : "light")
      : mode;

    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.dataset.theme = mode;
    root.style.colorScheme = resolved;
  };

  const savedTheme = localStorage.getItem(storageKey) || "system";
  applyTheme(savedTheme);
})();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
