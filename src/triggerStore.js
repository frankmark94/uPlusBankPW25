import { reactive } from 'vue';

// Create a reactive store to share trigger settings between components
const triggerStore = reactive({
  // Default settings
  triggerDelay: 10,
  triggerName: 'TimeOnTravelPage',

  // Settings saved in localStorage
  loadSettings() {
    const savedDelay = localStorage.getItem('triggerDelay');
    const savedName = localStorage.getItem('triggerName');

    if (savedDelay) {
      this.triggerDelay = parseInt(savedDelay, 10);
    }

    if (savedName) {
      this.triggerName = savedName;
    }
  },

  // Save settings to localStorage
  saveSettings() {
    localStorage.setItem('triggerDelay', this.triggerDelay);
    localStorage.setItem('triggerName', this.triggerName);
  },

  // Manual trigger function
  triggerChat() {
    if (window.PegaUnifiedChatWidget && typeof window.PegaUnifiedChatWidget.triggerChat === 'function') {
      try {
        window.PegaUnifiedChatWidget.triggerChat(this.triggerName);
        console.log(`✅ Manually triggered ${this.triggerName} chat`);
        return true;
      } catch (e) {
        console.error('❌ Error triggering chat:', e);
        return false;
      }
    } else {
      console.error('❌ PegaUnifiedChatWidget not available or triggerChat is not a function');
      return false;
    }
  }
});

// Load settings when the store is created
triggerStore.loadSettings();

export default triggerStore;
