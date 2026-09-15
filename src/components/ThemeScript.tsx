/**
 * Applies the stored theme before first paint.
 *
 * Wallos enables and disables whole stylesheets to switch themes. Doing that
 * from a React effect would show a flash of the light theme first, so this runs
 * as a blocking inline script in <head>, reading the same localStorage keys the
 * settings page writes.
 */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var theme = localStorage.getItem('wallos-theme') || 'automatic';
    var colorTheme = localStorage.getItem('wallos-color-theme') || 'blue';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'automatic' && prefersDark);

    var dark = document.getElementById('dark-theme');
    if (dark) dark.disabled = !isDark;

    ['red', 'green', 'yellow', 'purple'].forEach(function (name) {
      var el = document.getElementById(name + '-theme');
      if (el) el.disabled = colorTheme !== name;
    });

    document.body && document.body.classList.add(isDark ? 'dark' : 'light');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    var custom = localStorage.getItem('wallos-custom-colors');
    if (custom) {
      var colors = JSON.parse(custom);
      var style = document.createElement('style');
      var css = ':root{';
      function rgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        return parseInt(hex.slice(0,2),16)+', '+parseInt(hex.slice(2,4),16)+', '+parseInt(hex.slice(4,6),16);
      }
      if (colors.main_color) css += '--main-color:'+colors.main_color+';--main-color-rgb:'+rgb(colors.main_color)+';';
      if (colors.accent_color) css += '--accent-color:'+colors.accent_color+';--accent-color-rgb:'+rgb(colors.accent_color)+';';
      if (colors.hover_color) css += '--hover-color:'+colors.hover_color+';--hover-color-rgb:'+rgb(colors.hover_color)+';';
      style.id = 'custom_theme_colors';
      style.textContent = css + '}';
      document.head.appendChild(style);
    }

    var customCss = localStorage.getItem('wallos-custom-css');
    if (customCss) {
      var el = document.createElement('style');
      el.id = 'custom_css';
      el.textContent = customCss;
      document.head.appendChild(el);
    }
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
