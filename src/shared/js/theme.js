export function getStoredThemePreference() {
    return localStorage.getItem("themePreference") || "system";
}

export function applyThemePreference(value) {
    const theme = value || getStoredThemePreference();
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && prefersDark)
    );

    localStorage.setItem("themePreference", theme);
}

export function initTheme() {
    applyThemePreference(getStoredThemePreference());

    window.matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
            if (getStoredThemePreference() === "system") {
                applyThemePreference("system");
            }
        });
}