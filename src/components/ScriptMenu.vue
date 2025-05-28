<template>
  <div>
    <!-- Script Menu Overlay -->
    <div v-if="isVisible" class="script-menu-overlay" @click.self="hideMenu">
      <div class="script-menu">
        <div class="script-menu-header">
          <h3>Script Menu</h3>
          <button @click="hideMenu" class="close-button">&times;</button>
        </div>
        <div class="script-menu-content">
          <!-- Tab Navigation -->
          <div class="script-menu-tabs">
            <button
              :class="['tab-button', { active: activeTab === 'scripts' }]"
              @click="activeTab = 'scripts'"
            >
              Quick Scripts
            </button>
            <button
              :class="['tab-button', { active: activeTab === 'trigger' }]"
              @click="activeTab = 'trigger'"
            >
              Proactive Trigger
            </button>
            <button
              :class="['tab-button', { active: activeTab === 'widget' }]"
              @click="activeTab = 'widget'"
            >
              Custom Widget
            </button>
          </div>

          <!-- Quick Scripts Tab -->
          <div v-if="activeTab === 'scripts'">
            <div v-if="isEditing" class="edit-mode">
              <p>Edit Mode - Update your scripts below:</p>
              <div v-for="(script, index) in scripts" :key="index" class="script-edit-item">
                <label :for="`script-${index+1}`">{{ index + 1 }}:</label>
                <textarea
                  :id="`script-${index+1}`"
                  v-model="scripts[index]"
                  rows="2"
                ></textarea>
              </div>
              <div class="edit-controls">
                <button @click="saveScripts" class="save-button">Save</button>
                <button @click="cancelEdit" class="cancel-button">Cancel</button>
              </div>
            </div>
            <div v-else class="view-mode">
              <p>Press a number key (1-9) to execute the corresponding script:</p>
              <div v-for="(script, index) in scripts" :key="index" class="script-item">
                <div class="script-key">{{ index + 1 }}</div>
                <div class="script-text">{{ script }}</div>
              </div>

              <div class="script-menu-hint">
                <i>💡 Tip: Number keys 1-9 will execute scripts even when this menu is closed.</i>
              </div>

              <div class="script-settings">
                <h4>Script Execution Settings</h4>

                <div class="setting-group">
                  <label>Script Mode:</label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input
                        type="radio"
                        v-model="scriptSettings.injectMode"
                        value="inject"
                        @change="saveScriptSettings"
                      >
                      Inject into chat
                    </label>
                    <label class="radio-option">
                      <input
                        type="radio"
                        v-model="scriptSettings.injectMode"
                        value="copy"
                        @change="saveScriptSettings"
                      >
                      Copy to clipboard
                    </label>
                    <label class="radio-option">
                      <input
                        type="radio"
                        v-model="scriptSettings.injectMode"
                        value="both"
                        @change="saveScriptSettings"
                      >
                      Inject, fallback to copy
                    </label>
                  </div>
                </div>

                <div class="setting-group">
                  <div class="toggle-switch">
                    <label class="switch">
                      <input
                        type="checkbox"
                        v-model="scriptSettings.sendAfterInject"
                        @change="saveScriptSettings"
                        :disabled="scriptSettings.injectMode === 'copy'"
                      >
                      <span class="slider round"></span>
                    </label>
                    <span class="toggle-label">Auto-send after injection</span>
                  </div>
                </div>

                <div class="setting-group">
                  <label>
                    <input type="checkbox" v-model="showSilentCopyIndicator" @change="saveIndicatorSetting">
                    Show floating indicator when menu is closed
                  </label>
                </div>

                <div class="setting-group" v-if="scriptSettings.injectMode !== 'copy'">
                  <button @click="testChatInjection" class="test-button">
                    Test Chat Injection
                  </button>
                  <div v-if="lastInjectionResult !== null" class="injection-status">
                    <span v-if="lastInjectionResult" class="status-success">✅ Injection working</span>
                    <span v-else class="status-error">❌ Injection failed</span>
                  </div>
                </div>
              </div>

              <div class="script-menu-footer">
                <button @click="enterEditMode" class="edit-button">Edit Scripts</button>
              </div>
            </div>
          </div>

          <!-- Proactive Trigger Tab -->
          <div v-if="activeTab === 'trigger'" class="trigger-settings">
            <h4>Proactive Chat Trigger Settings</h4>

            <div class="setting-group">
              <label for="triggerDelay">Trigger Delay (seconds):</label>
              <input
                type="number"
                id="triggerDelay"
                v-model.number="triggerDelay"
                min="1"
                max="60"
                @change="saveTriggerSettings"
              >
            </div>

            <div class="setting-group">
              <label for="triggerName">Trigger Function Name:</label>
              <input
                type="text"
                id="triggerName"
                v-model="triggerName"
                @change="saveTriggerSettings"
              >
            </div>

            <div class="trigger-actions">
              <button @click="triggerChat" class="trigger-button">
                Execute Trigger Now
              </button>
            </div>

            <div class="trigger-info">
              <p>The proactive trigger will start a countdown when a user visits the travel page. After the specified delay, the chat widget will be automatically triggered.</p>
              <p class="current-settings">
                Current Configuration:<br>
                • Delay: <strong>{{ triggerDelay }}</strong> seconds<br>
                • Trigger Name: <strong>{{ triggerName }}</strong><br>
              </p>
            </div>
          </div>

          <!-- Custom Widget Tab -->
          <div v-if="activeTab === 'widget'" class="widget-settings">
            <h4>Custom Chat Widget Settings</h4>

            <div class="setting-group">
              <div class="toggle-switch">
                <label class="switch">
                  <input type="checkbox" v-model="widgetConfig.enabled" @change="widgetConfig.saveSettings">
                  <span class="slider round"></span>
                </label>
                <span class="toggle-label">Enable Custom Chat Widget</span>
              </div>
            </div>

            <div class="setting-group">
              <label for="widgetTitle">Widget Title:</label>
              <input
                type="text"
                id="widgetTitle"
                v-model="widgetConfig.title"
                @change="widgetConfig.saveSettings"
              >
            </div>

            <div class="setting-group">
              <label for="widgetSubtitle">Widget Subtitle:</label>
              <input
                type="text"
                id="widgetSubtitle"
                v-model="widgetConfig.subtitle"
                @change="widgetConfig.saveSettings"
              >
            </div>

            <div class="setting-group">
              <label for="widgetTypingMessage">Typing Message:</label>
              <input
                type="text"
                id="widgetTypingMessage"
                v-model="widgetConfig.typingMessage"
                @change="widgetConfig.saveSettings"
              >
            </div>

            <div class="setting-group">
              <label for="widgetColor">Main Color:</label>
              <div class="color-picker-container">
                <input
                  type="color"
                  id="widgetColor"
                  v-model="customColor"
                  @change="updateWidgetSettings"
                >
                <input
                  type="text"
                  v-model="customColor"
                  class="color-text-input"
                  @change="updateWidgetSettings"
                >
              </div>
            </div>

            <div class="setting-group">
              <label for="widgetHoverColor">Hover Color:</label>
              <div class="color-picker-container">
                <input
                  type="color"
                  id="widgetHoverColor"
                  v-model="customHoverColor"
                  @change="updateWidgetSettings"
                >
                <input
                  type="text"
                  v-model="customHoverColor"
                  class="color-text-input"
                  @change="updateWidgetSettings"
                >
              </div>
            </div>

            <div class="setting-group">
              <label for="widgetNotificationColor">Notification Color:</label>
              <div class="color-picker-container">
                <input
                  type="color"
                  id="widgetNotificationColor"
                  v-model="customNotificationColor"
                  @change="updateWidgetSettings"
                >
                <input
                  type="text"
                  v-model="customNotificationColor"
                  class="color-text-input"
                  @change="updateWidgetSettings"
                >
              </div>
            </div>

            <div class="setting-group">
              <label>Animation Speed:</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="widgetConfig.animationSpeed"
                    value="slow"
                    @change="widgetConfig.saveSettings"
                  >
                  Slow
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="widgetConfig.animationSpeed"
                    value="normal"
                    @change="widgetConfig.saveSettings"
                  >
                  Normal
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="widgetConfig.animationSpeed"
                    value="fast"
                    @change="widgetConfig.saveSettings"
                  >
                  Fast
                </label>
              </div>
            </div>

            <div class="setting-group">
              <label>Widget Position:</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="widgetConfig.position"
                    value="right"
                    @change="widgetConfig.saveSettings"
                  >
                  Right
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    v-model="widgetConfig.position"
                    value="left"
                    @change="widgetConfig.saveSettings"
                  >
                  Left
                </label>
              </div>
            </div>

            <div class="setting-group">
              <div class="toggle-switch">
                <label class="switch">
                  <input type="checkbox" v-model="widgetConfig.showPulse" @change="widgetConfig.saveSettings">
                  <span class="slider round"></span>
                </label>
                <span class="toggle-label">Show Pulse Animation</span>
              </div>
            </div>

            <div class="setting-group">
              <div class="toggle-switch">
                <label class="switch">
                  <input type="checkbox" v-model="widgetConfig.showNotifications" @change="widgetConfig.saveSettings">
                  <span class="slider round"></span>
                </label>
                <span class="toggle-label">Show Notifications</span>
              </div>
            </div>

            <div class="widget-preview">
              <h5>Widget Preview</h5>
              <div class="preview-container">
                <div
                  class="preview-widget"
                  :style="{
                    backgroundColor: customColor,
                    borderColor: customHoverColor
                  }"
                >
                  <div class="preview-icon">U+</div>
                  <div class="preview-text">
                    <div class="preview-title">{{ widgetConfig.title }}</div>
                    <div class="preview-subtitle">{{ widgetConfig.subtitle }}</div>
                  </div>
                  <div
                    v-if="widgetConfig.showNotifications"
                    class="preview-notification"
                    :style="{ backgroundColor: customNotificationColor }"
                  >1</div>
                </div>
              </div>
            </div>

            <div class="widget-actions">
              <button @click="resetWidgetSettings" class="reset-button">
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Silent Copy Indicator -->
    <div v-if="showSilentCopyIndicator"
         class="silent-copy-indicator"
         @click="showMenu"
         @contextmenu.prevent="toggleSilentCopyIndicator">
      Quick Scripts [+]
      <div class="indicator-tooltip">Click to open menu, right-click to hide</div>
    </div>
  </div>
</template>

<script>
import triggerStore from '../triggerStore';
import widgetConfig from '../widgetConfigStore';
import chatInjector from '../chatInjector';

export default {
  name: 'ScriptMenu',
  data() {
    return {
      isVisible: false,
      isEditing: false,
      showSilentCopyIndicator: true,
      activeTab: 'scripts',
      triggerDelay: triggerStore.triggerDelay,
      triggerName: triggerStore.triggerName,
      // Widget configuration
      widgetConfig,
      customColor: widgetConfig.color,
      customHoverColor: widgetConfig.hoverColor,
      customNotificationColor: widgetConfig.notificationColor,
      // Script settings
      scriptSettings: {
        injectMode: 'both', // 'inject', 'copy', or 'both'
        sendAfterInject: false, // Whether to automatically send after injecting
      },
      scripts: [
        'What is the best credit card for international travel?',
        'I leave in two days. How quickly would I be able to get my card?',
        'I need to speak to a representative.',
        'Sure!',
        'Yes. It looks like I might be able to get expedited shipping, but even with expedited shipping, it might not arrive in time. Could the card be shipped to my hotel in France?',
        'Okay, I\'ll apply for the platinum travel card now.',
        'I\'m flying to France on May 21st',
        'Yes.',
        'Thanks!'
      ],
      originalScripts: [],
      silentCopyActive: false,
      lastInjectionResult: null
    };
  },
  created() {
    // Load saved scripts from localStorage if available
    const savedScripts = localStorage.getItem('scriptMenuScripts');
    if (savedScripts) {
      this.scripts = JSON.parse(savedScripts);
    }

    // Load script settings from localStorage
    const savedSettings = localStorage.getItem('scriptSettings');
    if (savedSettings) {
      this.scriptSettings = { ...this.scriptSettings, ...JSON.parse(savedSettings) };
    }

    // Add event listeners for keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyDown);
  },
  beforeUnmount() {
    // Remove event listeners when component is destroyed
    window.removeEventListener('keydown', this.handleKeyDown);
  },
  methods: {
    handleKeyDown(event) {
      // Show menu when '+' key is pressed
      if (event.key === '+') {
        this.showMenu();
        event.preventDefault();
      }

      // Handle number key presses for script execution
      if (event.key >= '1' && event.key <= '9') {
        // Don't handle numeric keys if currently editing scripts or if focus is in a text input or textarea
        if (this.isEditing ||
            event.target.tagName === 'INPUT' ||
            event.target.tagName === 'TEXTAREA') {
          return;
        }

        const index = parseInt(event.key) - 1;
        if (index < this.scripts.length) {
          this.executeScript(index);
          event.preventDefault();
        }
      }

      // Close menu when Escape key is pressed
      if (event.key === 'Escape' && this.isVisible) {
        this.hideMenu();
        event.preventDefault();
      }
    },
    showMenu() {
      this.isVisible = true;
    },
    hideMenu() {
      if (this.isEditing) {
        if (confirm('Discard changes?')) {
          this.isEditing = false;
          this.isVisible = false;
        }
      } else {
        this.isVisible = false;
      }
    },
    enterEditMode() {
      this.originalScripts = [...this.scripts];
      this.isEditing = true;
    },
    cancelEdit() {
      this.scripts = [...this.originalScripts];
      this.isEditing = false;
    },
    saveScripts() {
      // Save scripts to localStorage
      localStorage.setItem('scriptMenuScripts', JSON.stringify(this.scripts));
      this.isEditing = false;
      this.showSavedMessage();
    },
    copyToClipboard(text) {
      navigator.clipboard.writeText(text)
        .catch(err => {
          console.error('Failed to copy text: ', err);
        });
    },
    saveScriptSettings() {
      localStorage.setItem('scriptSettings', JSON.stringify(this.scriptSettings));
      this.showSavedMessage();
    },
    executeScript(index) {
      const text = this.scripts[index];
      let success = false;

      // Execute based on injection mode
      if (this.scriptSettings.injectMode === 'inject' || this.scriptSettings.injectMode === 'both') {
        // Try to inject text directly into chat widget
        success = chatInjector.injectText(text, this.scriptSettings.sendAfterInject);
        this.lastInjectionResult = success;

        // If injection not successful and mode is 'both', fallback to clipboard
        if (!success && this.scriptSettings.injectMode === 'both') {
          this.copyToClipboard(text);

          // Show feedback
          if (this.isVisible) {
            this.showMessage(`Injection failed - Script #${index + 1} copied to clipboard instead`, 'warning');
          } else {
            this.showSilentCopyFeedback(index + 1);
          }
          return;
        }
      } else {
        // Copy to clipboard mode
        this.copyToClipboard(text);
        success = true;
      }

      // Show appropriate feedback
      if (success) {
        if (this.isVisible) {
          const action = this.scriptSettings.injectMode === 'copy' ? 'copied to clipboard' : 'injected into chat';
          this.showMessage(`Script #${index + 1} ${action}!`);
        } else if (this.scriptSettings.injectMode === 'copy') {
          this.showSilentCopyFeedback(index + 1);
        } else {
          // Show subtle feedback for silent injection
          this.showSilentInjectionFeedback(index + 1);
        }
      } else {
        // Show error message
        if (this.isVisible) {
          this.showMessage(`Failed to process Script #${index + 1}`, 'error');
        }
      }
    },
    showMessage(message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `script-notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 500);
      }, 1500);
    },
    showSilentCopyFeedback(num) {
      // Flash the indicator to show silent copy happened
      const indicator = document.querySelector('.silent-copy-indicator');
      if (indicator) {
        // Show the script number that was copied
        const originalText = indicator.textContent;
        indicator.textContent = `Copied #${num}`;
        indicator.classList.add('silent-copy-active');

        // Reset after a short delay
        setTimeout(() => {
          indicator.classList.remove('silent-copy-active');
          setTimeout(() => {
            indicator.textContent = originalText;
          }, 300);
        }, 800);
      }
    },
    showSilentInjectionFeedback(num) {
      // Flash the indicator to show silent injection happened
      const indicator = document.querySelector('.silent-copy-indicator');
      if (indicator) {
        // Show the script number that was injected
        const originalText = indicator.textContent;
        indicator.textContent = `Injected #${num}`;
        indicator.classList.add('silent-injection-active');

        // Reset after a short delay
        setTimeout(() => {
          indicator.classList.remove('silent-injection-active');
          setTimeout(() => {
            indicator.textContent = originalText;
          }, 300);
        }, 800);
      }
    },
    showSavedMessage() {
      const notification = document.createElement('div');
      notification.className = 'script-notification';
      notification.textContent = 'Settings saved successfully!';
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 500);
      }, 1500);
    },
    toggleSilentCopyIndicator() {
      this.showSilentCopyIndicator = false;
      this.saveIndicatorSetting();

      // Show temporary notification
      const notification = document.createElement('div');
      notification.className = 'script-notification';
      notification.textContent = 'Indicator hidden. Press + to show menu.';
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 500);
      }, 2000);
    },
    saveIndicatorSetting() {
      localStorage.setItem('showScriptIndicator', this.showSilentCopyIndicator);
    },

    // Trigger settings methods
    saveTriggerSettings() {
      // Update the store with current values
      triggerStore.triggerDelay = this.triggerDelay;
      triggerStore.triggerName = this.triggerName;
      triggerStore.saveSettings();

      this.showSavedMessage();
    },

    triggerChat() {
      const success = triggerStore.triggerChat();

      if (success) {
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'script-notification success';
        notification.textContent = `Trigger "${this.triggerName}" executed successfully!`;
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.classList.add('fade-out');
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 500);
        }, 2000);
      } else {
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'script-notification error';
        notification.textContent = 'Failed to execute trigger. Chat widget not available.';
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.classList.add('fade-out');
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 500);
        }, 2000);
      }
    },

    // Widget configuration methods
    updateWidgetSettings() {
      // Update the widget configuration with current values
      this.widgetConfig.color = this.customColor;
      this.widgetConfig.hoverColor = this.customHoverColor;
      this.widgetConfig.notificationColor = this.customNotificationColor;

      // Save settings
      this.widgetConfig.saveSettings();
      this.showSavedMessage();
    },

    resetWidgetSettings() {
      if (confirm('Reset all widget settings to defaults?')) {
        this.widgetConfig.resetToDefaults();

        // Update local copies of color values
        this.customColor = this.widgetConfig.color;
        this.customHoverColor = this.widgetConfig.hoverColor;
        this.customNotificationColor = this.widgetConfig.notificationColor;

        this.showSavedMessage();
      }
    },

    testChatInjection() {
      const success = chatInjector.injectText('This is a test message from U+Bank script menu', false);
      if (success) {
        this.showMessage('Test message successfully injected into chat', 'success');
      } else {
        this.showMessage('Failed to inject test message into chat', 'error');
      }
      this.lastInjectionResult = success;
    }
  },
  mounted() {
    // Load preference for showing indicator
    const showIndicator = localStorage.getItem('showScriptIndicator');
    if (showIndicator !== null) {
      this.showSilentCopyIndicator = showIndicator === 'true';
    }
  }
};
</script>

<style>
.script-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.script-menu {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  color: #333;
}

.script-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.script-menu-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #005501;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #777;
}

.script-menu-content {
  padding: 20px;
}

.script-menu-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 20px;
  background: none;
  border: none;
  font-size: 0.95rem;
  cursor: pointer;
  position: relative;
  color: #666;
  transition: color 0.2s;
}

.tab-button.active {
  color: #005501;
  font-weight: 600;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 2px;
  background-color: #005501;
}

.script-menu-hint {
  margin: 20px 0;
  font-size: 0.9rem;
  color: #666;
  font-style: italic;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
  border-left: 3px solid #005501;
}

.script-item {
  display: flex;
  margin-bottom: 15px;
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
}

.script-key {
  background-color: #005501;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  margin-right: 15px;
  flex-shrink: 0;
}

.script-text {
  flex-grow: 1;
  line-height: 1.4;
}

.script-menu-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.edit-button, .save-button, .cancel-button, .reset-button, .test-button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  border: none;
}

.edit-button {
  background-color: #f0f0f0;
  color: #333;
}

.save-button {
  background-color: #005501;
  color: white;
  margin-right: 10px;
}

.cancel-button, .reset-button {
  background-color: #f0f0f0;
  color: #333;
}

.reset-button {
  background-color: #f0f0f0;
  color: #e74c3c;
  font-weight: 600;
}

.reset-button:hover {
  background-color: #fadbd8;
}

.test-button {
  background-color: #3498db;
  color: white;
  display: block;
  margin-bottom: 10px;
}

.test-button:hover {
  background-color: #2980b9;
}

.injection-status {
  font-size: 0.9rem;
  padding: 5px 0;
}

.status-success {
  color: #2ecc71;
  font-weight: 600;
}

.status-error {
  color: #e74c3c;
  font-weight: 600;
}

.script-edit-item {
  margin-bottom: 15px;
}

.script-edit-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.script-edit-item textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
}

.script-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #005501;
  color: white;
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  transition: opacity 0.5s;
}

.script-notification.error {
  background-color: #e74c3c;
}

.script-notification.success {
  background-color: #2ecc71;
}

.script-notification.warning {
  background-color: #f39c12;
}

.script-notification.fade-out {
  opacity: 0;
}

.script-settings {
  margin: 20px 0;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.script-settings h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #005501;
  font-size: 1rem;
}

.script-settings label {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
}

.script-settings input[type="checkbox"] {
  margin-right: 10px;
}

.silent-copy-indicator {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background-color: rgba(0, 85, 1, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  z-index: 9990;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.silent-copy-indicator:hover {
  background-color: #005501;
}

.silent-copy-indicator:hover .indicator-tooltip {
  opacity: 1;
  transform: translateY(0);
}

.indicator-tooltip {
  position: absolute;
  bottom: 100%;
  left: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 0.75rem;
  padding: 5px 8px;
  border-radius: 3px;
  margin-bottom: 8px;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(5px);
  transition: all 0.2s ease;
  pointer-events: none;
}

.indicator-tooltip:after {
  content: '';
  position: absolute;
  top: 100%;
  left: 15px;
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
}

.silent-copy-indicator.silent-copy-active {
  background-color: #ff6b00;
  transform: scale(1.05);
}

.silent-copy-indicator.silent-injection-active {
  background-color: #3498db;
  transform: scale(1.05);
}

/* Trigger Settings Styles */
.trigger-settings,
.widget-settings {
  padding: 10px 0;
}

.trigger-settings h4,
.widget-settings h4,
.widget-preview h5 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #005501;
  font-size: 1.1rem;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

.setting-group input[type="number"],
.setting-group input[type="text"] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.trigger-actions,
.widget-actions {
  margin: 25px 0;
}

.trigger-button {
  background-color: #ff6b00;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.trigger-button:hover {
  background-color: #e05d00;
}

.trigger-info {
  background-color: #f8f8f8;
  padding: 15px;
  border-radius: 4px;
  border-left: 3px solid #666;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #555;
  margin-top: 20px;
}

.current-settings {
  margin-top: 15px;
  font-size: 0.95rem;
}

/* Custom Widget Settings */
.toggle-switch {
  display: flex;
  align-items: center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  margin-right: 10px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #005501;
}

input:focus + .slider {
  box-shadow: 0 0 1px #005501;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

.toggle-label {
  font-weight: 500;
}

.color-picker-container {
  display: flex;
  align-items: center;
  margin-top: 5px;
}

input[type="color"] {
  width: 45px;
  height: 45px;
  border: none;
  border-radius: 4px;
  padding: 0;
  margin-right: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

input[type="color"]:hover {
  transform: scale(1.05);
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
}

input[type="color"]:active {
  transform: scale(0.98);
}

.color-text-input {
  width: 100px !important;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.color-text-input:hover {
  border-color: #bbb;
}

.color-text-input:focus {
  border-color: #005501;
  box-shadow: 0 0 0 2px rgba(0, 85, 1, 0.1);
  outline: none;
}

.setting-group input[type="text"],
.setting-group input[type="number"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.setting-group input[type="text"]:hover,
.setting-group input[type="number"]:hover {
  border-color: #bbb;
}

.setting-group input[type="text"]:focus,
.setting-group input[type="number"]:focus {
  border-color: #005501;
  box-shadow: 0 0 0 2px rgba(0, 85, 1, 0.1);
  outline: none;
}

/* Improved toggle switch hover effect */
.switch:hover {
  opacity: 0.9;
}

.toggle-label {
  font-weight: 500;
  transition: color 0.2s ease;
}

.switch:hover + .toggle-label {
  color: #005501;
}

/* Reset button hover effect */
.reset-button:hover {
  background-color: #fadbd8;
  color: #c0392b;
  border-color: #e74c3c;
}

.radio-group {
  display: flex;
  gap: 15px;
  margin-top: 5px;
}

.radio-option {
  display: flex;
  align-items: center;
  font-weight: normal;
  padding: 5px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.radio-option:hover {
  background-color: rgba(0, 85, 1, 0.1);
}

.radio-option input {
  margin-right: 10px;
}

.widget-preview {
  background-color: #f8f8f8;
  padding: 20px;
  border-radius: 4px;
  margin-top: 25px;
  border: 1px solid #eee;
  transition: all 0.3s ease;
}

.widget-preview:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #ddd;
}

.widget-preview h5 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #005501;
  font-size: 1.1rem;
  text-align: center;
}

.preview-container {
  display: flex;
  justify-content: center;
  padding: 30px 0;
  position: relative;
}

.preview-container::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 70%;
  height: 10px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 70%);
  border-radius: 50%;
}

.preview-widget {
  display: flex;
  align-items: center;
  background-color: #005501;
  color: white;
  border-radius: 30px;
  padding: 12px 20px;
  border: 2px solid transparent;
  position: relative;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  transform: scale(1);
}

.preview-widget:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.15);
}

.preview-widget:active {
  transform: scale(0.98);
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.preview-icon {
  width: 35px;
  height: 35px;
  background-color: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  margin-right: 12px;
  transition: all 0.3s ease;
}

.preview-widget:hover .preview-icon {
  transform: scale(1.1);
  background-color: rgba(255,255,255,0.3);
}

.preview-text {
  flex: 1;
}

.preview-title {
  font-weight: bold;
  font-size: 0.9rem;
}

.preview-subtitle {
  font-size: 0.75rem;
  opacity: 0.9;
}

.preview-notification {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 22px;
  height: 22px;
  background-color: #ff6b00;
  color: white;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.75rem;
  font-weight: bold;
  border: 2px solid white;
}

@media (max-width: 768px) {
  .script-menu {
    width: 90%;
    max-height: 70vh;
  }

  .script-item {
    flex-direction: column;
  }

  .script-key {
    margin-bottom: 8px;
  }

  .radio-group {
    flex-direction: column;
    gap: 8px;
  }
}

/* Add hover states for buttons */
.edit-button:hover, .test-button:hover {
  background-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.save-button:hover {
  background-color: #004401;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.trigger-button:hover {
  background-color: #e05d00;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

/* Widget Configuration Settings */
.widget-settings .radio-group {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.widget-settings .radio-option {
  border: 1px solid #ddd;
  padding: 8px 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.widget-settings .radio-option:hover {
  background-color: rgba(0, 85, 1, 0.08);
  border-color: #005501;
  box-shadow: 0 1px 4px rgba(0, 85, 1, 0.1);
}

.widget-settings .radio-option input:checked + span,
.widget-settings .radio-option input:checked {
  font-weight: 600;
  color: #005501;
}

.widget-settings .setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}
</style>
