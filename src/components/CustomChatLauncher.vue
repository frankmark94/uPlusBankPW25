<template>
  <div
    v-if="visible && widgetConfig.enabled"
    :class="['custom-chat-launcher', {
      'expanded': isExpanded && !chatIsOpen,
      'pulse': needsAttention && widgetConfig.showPulse,
      'active': isActive,
      'minimized': chatIsOpen,
      'position-left': widgetConfig.position === 'left'
    }]"
    @click="launchChat"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    :style="getChatLauncherStyles()"
  >
    <div class="launcher-icon">
      <div class="icon-inner">
        <svg v-if="!isExpanded && !isActive && !chatIsOpen" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg v-if="chatIsOpen" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span v-if="(isExpanded || isActive) && !chatIsOpen" class="plus-icon">U+</span>
      </div>
    </div>
    <div class="launcher-text" v-if="isExpanded && !chatIsOpen">
      <div class="launcher-title">{{ widgetConfig.title }}</div>
      <div class="launcher-subtitle">{{ widgetConfig.subtitle }}</div>
    </div>
    <div class="launcher-typing" v-if="isActive && showTypingIndicator">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="typing-text">{{ widgetConfig.typingMessage }}</div>
    </div>
    <div class="notification-badge" v-if="hasNotification && !chatIsOpen && widgetConfig.showNotifications" :style="getNotificationStyles()">1</div>
    <div class="launcher-wave-effect"></div>
  </div>
</template>

<script>
import widgetConfig from '../widgetConfigStore';

export default {
  name: 'CustomChatLauncher',
  data() {
    return {
      visible: true,
      isExpanded: false,
      isActive: false,
      needsAttention: false,
      hasNotification: false,
      attentionInterval: null,
      showTypingIndicator: false,
      chatIsOpen: false,
      widgetConfig
    };
  },
  mounted() {
    // Set an interval to pulse the button every so often to draw attention
    if (this.widgetConfig.showPulse) {
      setTimeout(() => {
        this.needsAttention = true;
        setTimeout(() => {
          this.needsAttention = false;
          if (this.widgetConfig.showNotifications) {
            this.hasNotification = true;
          }
        }, 3000);
      }, 10000);
    }

    // Listen for chat widget status to toggle visibility
    window.addEventListener('PegaChatWidget:Loaded', this.handleChatWidgetLoaded);
    window.addEventListener('PegaChatWidget:Opened', this.handleChatOpened);
    window.addEventListener('PegaChatWidget:Closed', this.handleChatClosed);
  },
  beforeUnmount() {
    // Clean up event listeners
    window.removeEventListener('PegaChatWidget:Loaded', this.handleChatWidgetLoaded);
    window.removeEventListener('PegaChatWidget:Opened', this.handleChatOpened);
    window.removeEventListener('PegaChatWidget:Closed', this.handleChatClosed);

    // Clear any active intervals
    if (this.attentionInterval) {
      clearInterval(this.attentionInterval);
    }
  },
  methods: {
    getChatLauncherStyles() {
      return {
        '--launcher-bg-color': this.widgetConfig.color,
        '--launcher-hover-color': this.widgetConfig.hoverColor,
        '--animation-speed': this.getAnimationSpeedValue()
      };
    },
    getNotificationStyles() {
      return {
        backgroundColor: this.widgetConfig.notificationColor
      };
    },
    getAnimationSpeedValue() {
      const speeds = {
        'slow': '0.4s',
        'normal': '0.3s',
        'fast': '0.2s'
      };
      return speeds[this.widgetConfig.animationSpeed] || speeds.normal;
    },
    handleMouseEnter() {
      if (!this.chatIsOpen) {
        this.isExpanded = true;
      }
    },
    handleMouseLeave() {
      if (!this.isActive && !this.chatIsOpen) {
        this.isExpanded = false;
      }
    },
    launchChat() {
      if (this.chatIsOpen) {
        // If chat is already open, toggle it closed
        if (window.PegaUnifiedChatWidget && typeof window.PegaUnifiedChatWidget.toggleWidget === 'function') {
          window.PegaUnifiedChatWidget.toggleWidget();
        }
        return;
      }

      // Set active state and show typing indicator
      this.isActive = true;
      this.isExpanded = false;
      this.hasNotification = false;
      this.showTypingIndicator = true;

      // Toggle the Pega chat widget after a small delay to show the typing animation
      setTimeout(() => {
        if (window.PegaUnifiedChatWidget && typeof window.PegaUnifiedChatWidget.toggleWidget === 'function') {
          window.PegaUnifiedChatWidget.toggleWidget();
          // Hide typing indicator after another delay
          setTimeout(() => {
            this.showTypingIndicator = false;
          }, 1000);
        } else {
          console.error('PegaUnifiedChatWidget not available or toggleWidget is not a function');
          this.isActive = false;
          this.showTypingIndicator = false;
        }
      }, 1200);
    },
    handleChatWidgetLoaded() {
      console.log('Chat widget loaded, custom launcher is active');
    },
    handleChatOpened() {
      this.needsAttention = false;
      this.hasNotification = false;
      this.isActive = false;

      // Instead of hiding, transition to minimized state
      setTimeout(() => {
        this.chatIsOpen = true;
      }, 500);
    },
    handleChatClosed() {
      // Widget has been closed, restore launcher to normal state
      this.chatIsOpen = false;
      this.isActive = false;
      this.isExpanded = false;
    }
  }
};
</script>

<style scoped>
.custom-chat-launcher {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  background-color: var(--launcher-bg-color, #005501);
  color: white;
  border-radius: 30px;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 85, 1, 0.3);
  z-index: 9999;
  overflow: hidden;
  transition: all var(--animation-speed, 0.3s) cubic-bezier(0.175, 0.885, 0.32, 1.275);
  width: 60px;
  height: 60px;
  transform-origin: bottom right;
}

.custom-chat-launcher.position-left {
  left: 20px;
  right: auto;
  transform-origin: bottom left;
}

.custom-chat-launcher:hover {
  box-shadow: 0 6px 18px rgba(0, 85, 1, 0.4);
  transform: translateY(-2px);
  background-color: var(--launcher-hover-color, #009900);
}

.custom-chat-launcher.expanded {
  width: 200px;
  padding-left: 10px;
  padding-right: 10px;
  background: linear-gradient(90deg, var(--launcher-bg-color, #005501), var(--launcher-hover-color, #009900));
}

.custom-chat-launcher.active {
  width: 240px;
  padding-left: 10px;
  padding-right: 10px;
  background: linear-gradient(90deg, var(--launcher-bg-color, #005501), var(--launcher-hover-color, #009900));
}

/* Position adjustments for left side */
.custom-chat-launcher.position-left.expanded,
.custom-chat-launcher.position-left.active {
  padding-right: 10px;
  padding-left: 10px;
}

/* Minimized state when chat is open */
.custom-chat-launcher.minimized {
  width: 40px;
  height: 40px;
  bottom: 30px;
  right: 30px;
  background-color: rgba(0, 85, 1, 0.6);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  opacity: 0.7;
  transform: scale(0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.custom-chat-launcher.position-left.minimized {
  left: 30px;
  right: auto;
}

.custom-chat-launcher.minimized:hover {
  opacity: 1;
  transform: scale(1);
  background-color: rgba(0, 85, 1, 0.9);
}

.custom-chat-launcher.minimized .launcher-icon {
  width: 32px;
  height: 32px;
}

.launcher-icon {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.icon-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  transition: transform var(--animation-speed, 0.3s) ease;
}

.custom-chat-launcher:hover .icon-inner {
  transform: scale(1.1);
}

.plus-icon {
  font-size: 1.4rem;
  font-weight: bold;
  letter-spacing: -1px;
  font-family: Arial, sans-serif;
}

.launcher-text {
  margin-left: 10px;
  text-align: left;
  opacity: 0;
  transform: translateX(10px);
  animation: fadeIn var(--animation-speed, 0.3s) forwards;
  max-width: 120px;
}

.launcher-title {
  font-size: 0.95rem;
  font-weight: bold;
  white-space: nowrap;
}

.launcher-subtitle {
  font-size: 0.75rem;
  opacity: 0.9;
  white-space: nowrap;
}

.launcher-typing {
  margin-left: 10px;
  text-align: left;
  opacity: 0;
  transform: translateX(10px);
  animation: fadeIn var(--animation-speed, 0.3s) forwards;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.typing-text {
  font-size: 0.75rem;
  opacity: 0.9;
  white-space: nowrap;
  margin-top: 4px;
}

.typing-indicator {
  display: flex;
  align-items: center;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  margin-right: 4px;
  border-radius: 50%;
  background-color: white;
  display: inline-block;
  opacity: 0.7;
}

.typing-indicator span:nth-child(1) {
  animation: bounce 1.2s infinite 0.2s;
}

.typing-indicator span:nth-child(2) {
  animation: bounce 1.2s infinite 0.4s;
}

.typing-indicator span:nth-child(3) {
  animation: bounce 1.2s infinite 0.6s;
  margin-right: 0;
}

.launcher-wave-effect {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 30px;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
  opacity: 0;
  pointer-events: none;
}

.custom-chat-launcher:active .launcher-wave-effect {
  opacity: 1;
  animation: wave 0.6s ease-out;
}

.notification-badge {
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
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  animation: bounceIn 0.5s;
  border: 2px solid white;
}

.position-left .notification-badge {
  right: auto;
  left: -5px;
}

.pulse {
  animation: pulse 2s infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes wave {
  from {
    opacity: 1;
    transform: scale(0);
  }
  to {
    opacity: 0;
    transform: scale(1);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 4px 15px rgba(0, 85, 1, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 4px 20px rgba(0, 85, 1, 0.5);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 15px rgba(0, 85, 1, 0.3);
  }
}

@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

@keyframes bounceIn {
  0%, 20%, 40%, 60%, 80%, 100% {
    animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
  }
  0% {
    opacity: 0;
    transform: scale3d(0.3, 0.3, 0.3);
  }
  20% {
    transform: scale3d(1.1, 1.1, 1.1);
  }
  40% {
    transform: scale3d(0.9, 0.9, 0.9);
  }
  60% {
    opacity: 1;
    transform: scale3d(1.03, 1.03, 1.03);
  }
  80% {
    transform: scale3d(0.97, 0.97, 0.97);
  }
  100% {
    opacity: 1;
    transform: scale3d(1, 1, 1);
  }
}
</style>
