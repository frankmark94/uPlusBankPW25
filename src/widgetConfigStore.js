import { reactive } from 'vue';

// Create a reactive store to share widget configuration settings between components
const widgetConfigStore = reactive({
  // Default settings
  enabled: true,
  title: 'Let\'s Chat',
  subtitle: 'We\'re here to help',
  color: '#005501',
  hoverColor: '#009900',
  notificationColor: '#ff6b00',
  typingMessage: 'Preparing your conversation...',
  showPulse: true,
  showNotifications: true,
  animationSpeed: 'normal',
  position: 'right',

  // Load settings from localStorage
  loadSettings() {
    const savedConfig = localStorage.getItem('widgetConfig');

    if (savedConfig) {
      const config = JSON.parse(savedConfig);

      // Apply saved settings
      for (const key in config) {
        if (this.hasOwnProperty(key)) {
          this[key] = config[key];
        }
      }
    }
  },

  // Save current settings to localStorage
  saveSettings() {
    // Create a plain object from the reactive one
    const config = {};
    const keys = [
      'enabled', 'title', 'subtitle', 'color', 'hoverColor',
      'notificationColor', 'typingMessage', 'showPulse',
      'showNotifications', 'animationSpeed', 'position'
    ];

    keys.forEach(key => {
      config[key] = this[key];
    });

    localStorage.setItem('widgetConfig', JSON.stringify(config));
  },

  // Reset settings to defaults
  resetToDefaults() {
    this.enabled = true;
    this.title = 'Let\'s Chat';
    this.subtitle = 'We\'re here to help';
    this.color = '#005501';
    this.hoverColor = '#009900';
    this.notificationColor = '#ff6b00';
    this.typingMessage = 'Preparing your conversation...';
    this.showPulse = true;
    this.showNotifications = true;
    this.animationSpeed = 'normal';
    this.position = 'right';

    this.saveSettings();
  }
});

// Load settings when the store is created
widgetConfigStore.loadSettings();

export default widgetConfigStore;
