import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'MotionScope',
    description: "Inspect a website's animations, scroll motion and design system.",
    permissions: ['sidePanel', 'activeTab', 'scripting', 'storage'],
    // <all_urls> lets the background worker fetch cross-origin stylesheets
    // that the page itself is not allowed to read.
    host_permissions: ['<all_urls>'],
    action: { default_title: 'Open MotionScope' },
  },
});
