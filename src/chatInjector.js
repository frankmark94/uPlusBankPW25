/**
 * Chat Text Injector
 *
 * This utility provides methods to inject text directly into the Pega chat widget input field.
 * It attempts multiple approaches to access the iframe and its contents:
 * 1. Direct DOM access if allowed
 * 2. PostMessage API as a fallback
 * 3. Focus + keyboard simulation as a last resort
 */

const debugInjector = (message, data) => {
  console.log(`%c[Chat Injector] ${message}`, 'background: #3f51b5; color: white; padding: 2px 5px; border-radius: 2px;', data || '');
};

const chatInjector = {
  /**
   * Whether we've detected an iframe in the DOM
   */
  iframeDetected: false,

  /**
   * Whether our message listener has been successfully set up in the iframe
   */
  listenerReady: false,

  /**
   * Whether the bridge iframe is ready
   */
  bridgeReady: false,

  /**
   * Find the chat iframe in the DOM
   */
  findChatIframe() {
    debugInjector('Looking for chat iframe');

    // Skip our own bridge iframe
    const skipIds = ['chat-injector-bridge'];

    // Look for the specific textarea we're seeing in logs first
    const textareas = document.querySelectorAll('textarea[data-testid="type_a_message"]');
    if (textareas.length > 0) {
      debugInjector('Found chat textarea directly in DOM', textareas[0]);
      // If we find the textarea directly, we don't need an iframe
      this.chatTextarea = textareas[0];
      return null;
    }

    // Common iframe selectors/IDs used by Pega chat widget
    const possibleSelectors = [
      '#pegaChatWidget iframe',
      'iframe#chatWindowIframe',
      '#chatWindowIframe',
      'iframe[src*="chat.pega"]',
      'iframe[name*="chat"]',
      'iframe.chat-iframe',
      'iframe[src*="DMM"]',
      // Add the specific iframe from logs
      'iframe[name="wss1747850825589Ifr"]',
      'iframe[id="wss1747850825589Ifr"]',
      // Try to match by URL pattern
      'iframe[src*="pegademo"]',
      'iframe[src*="DataPortal"]',
      'iframe[src*="UIKitSSDemo"]'
    ];

    // Try all selectors
    for (const selector of possibleSelectors) {
      const iframe = document.querySelector(selector);
      if (iframe && !skipIds.includes(iframe.id)) {
        debugInjector(`Found chat iframe with selector: ${selector}`, iframe);
        return iframe;
      }
    }

    // If not found with specific selectors, try to find any iframe that might be the chat
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      // Skip our bridge iframe
      if (skipIds.includes(iframe.id)) continue;

      if (iframe.src && (
          iframe.src.includes('chat') ||
          iframe.src.includes('pega') ||
          iframe.src.includes('dmm') ||
          iframe.src.includes('widget') ||
          iframe.src.includes('DataPortal') ||
          iframe.src.includes('pegademo') ||
          iframe.name && iframe.name.includes('wss')
        )) {
        debugInjector('Found potential chat iframe by URL pattern', iframe);
        return iframe;
      }
    }

    debugInjector('No chat iframe found');
    return null;
  },

  /**
   * Find the chat input field inside the iframe
   */
  findInputField(iframeDocument) {
    if (!iframeDocument) return null;

    // Common selectors for chat input fields
    const possibleSelectors = [
      // Generic form inputs
      'textarea[placeholder*="message" i]',
      'input[placeholder*="message" i]',
      'textarea[placeholder*="type" i]',
      'input[placeholder*="type" i]',

      // Classes and IDs
      '.oda-chat-input',
      '.chat-input',
      '.message-input',
      '#chatTextarea',
      '#messageInput',

      // Specific to Pega (from screenshot)
      '.unified-chat-widget-entry textarea',
      '.unified-chat-widget-entry input',
      '.ui-input textarea',
      '.ui-input input',

      // Very generic fallbacks
      'textarea',
      'input[type="text"]'
    ];

    // Try all selectors
    for (const selector of possibleSelectors) {
      try {
        const inputs = iframeDocument.querySelectorAll(selector);
        if (inputs && inputs.length) {
          debugInjector(`Found input field with selector: ${selector}`, inputs[0]);
          return inputs[0];
        }
      } catch (e) {
        debugInjector(`Error querying for ${selector}`, e);
      }
    }

    debugInjector('No input field found in iframe');
    return null;
  },

  /**
   * Find the send button inside the iframe
   */
  findSendButton(iframeDocument) {
    if (!iframeDocument) return null;

    // Common selectors for send buttons
    const possibleSelectors = [
      // Text-based selectors
      'button:has-text("Send")',
      'button:contains("Send")',
      'button[aria-label*="send" i]',
      'button[title*="send" i]',

      // Icons and classes
      'button.send-button',
      'button.chat-send',
      '.send-message-button',
      'button.oda-chat-send',
      'button[type="submit"]',

      // Specific to Pega (from screenshot)
      '.unified-chat-widget-send-button',
      '.send-button',

      // Very generic fallbacks with icon identification
      'button svg[viewBox], button i.fa-paper-plane, button i.fa-send'
    ];

    // Try all selectors
    for (const selector of possibleSelectors) {
      try {
        const buttons = iframeDocument.querySelectorAll(selector);
        if (buttons && buttons.length) {
          debugInjector(`Found send button with selector: ${selector}`, buttons[0]);
          return buttons[0];
        }
      } catch (e) {
        // Some complex selectors might not be supported
        debugInjector(`Error querying for ${selector}`, e);
      }
    }

    // Last resort: look for any buttons near the input field
    try {
      const input = this.findInputField(iframeDocument);
      if (input) {
        // Look for buttons near the input
        const parent = input.parentElement;
        const nearbyButtons = parent.querySelectorAll('button') ||
                             parent.parentElement.querySelectorAll('button');

        if (nearbyButtons && nearbyButtons.length) {
          // Assume the last button is send
          debugInjector('Found potential send button near input', nearbyButtons[nearbyButtons.length - 1]);
          return nearbyButtons[nearbyButtons.length - 1];
        }
      }
    } catch (e) {
      debugInjector('Error finding nearby buttons', e);
    }

    debugInjector('No send button found in iframe');
    return null;
  },

  /**
   * Attempt to directly inject text into the input field
   */
  directInjection(text) {
    debugInjector(`Attempting direct injection: "${text}"`);

    try {
      const iframe = this.findChatIframe();
      if (!iframe) return false;

      // Try to access iframe content - may fail due to same-origin policy
      let iframeDocument;
      try {
        iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
      } catch (e) {
        debugInjector('Cannot access iframe contents directly due to same-origin policy', e);
        return false;
      }

      const inputField = this.findInputField(iframeDocument);
      if (!inputField) return false;

      // Focus the input field
      inputField.focus();

      // Set value and dispatch input event to trigger any listeners
      inputField.value = text;

      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      inputField.dispatchEvent(inputEvent);

      // Also try with change event
      const changeEvent = new Event('change', { bubbles: true });
      inputField.dispatchEvent(changeEvent);

      debugInjector('Direct injection successful');
      return true;
    } catch (e) {
      debugInjector('Error during direct injection', e);
      return false;
    }
  },

  /**
   * Send text via postMessage API
   */
  postMessageInjection(text) {
    debugInjector(`Attempting postMessage injection: "${text}"`);

    try {
      const iframe = this.findChatIframe();
      if (!iframe) return false;

      // Try multiple message formats that different chat widgets might understand
      const messages = [
        // Standard format
        {
          action: 'injectText',
          text: text,
          source: 'uplus-script-menu'
        },
        // Format for Pega chat widgets
        {
          type: 'pega-chat-message',
          content: text,
          action: 'inject'
        },
        // Generic format
        {
          command: 'setText',
          value: text
        },
        // Another common format
        {
          messageType: 'CHAT_INPUT_TEXT',
          text: text
        },
        // Most basic format
        text
      ];

      // Try sending to multiple targets
      const targets = [
        iframe.contentWindow, // Direct to iframe window
        iframe.src,          // To the iframe's source URL
        '*'                  // To any listener (least secure but most compatible)
      ];

      // Try all message formats with all targets
      for (const message of messages) {
        for (const target of targets) {
          try {
            iframe.contentWindow.postMessage(message, target);
            debugInjector(`PostMessage sent to ${target}`, message);
          } catch (err) {
            debugInjector(`Error sending postMessage to ${target}`, err);
          }
        }
      }

      // Also try to send a script to be executed inside the iframe
      try {
        const injectionScript = `
          try {
            const inputFields = document.querySelectorAll('textarea, input[type="text"]');
            for (const field of inputFields) {
              if (field.placeholder && (field.placeholder.toLowerCase().includes('message') ||
                  field.placeholder.toLowerCase().includes('type'))) {
                field.value = ${JSON.stringify(text)};
                field.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('Injection script executed successfully');
                // Try to find a send button
                const buttons = document.querySelectorAll('button');
                for (const button of buttons) {
                  if (button.textContent && button.textContent.toLowerCase().includes('send')) {
                    button.click();
                    break;
                  }
                }
                break;
              }
            }
          } catch (e) {
            console.error('Injection script error:', e);
          }
        `;

        // Create a message with the script to execute
        const scriptMessage = {
          action: 'executeScript',
          script: injectionScript,
          source: 'uplus-script-menu'
        };

        iframe.contentWindow.postMessage(scriptMessage, '*');
        debugInjector('Injection script sent via postMessage');
      } catch (e) {
        debugInjector('Error sending injection script', e);
      }

      debugInjector('All postMessage attempts completed');
      return true; // We can't really know if this worked, but we tried our best
    } catch (e) {
      debugInjector('Error during postMessage injection', e);
      return false;
    }
  },

  /**
   * Simulate keyboard input as a last resort
   */
  simulateTyping(text) {
    debugInjector(`Attempting keyboard simulation: "${text}"`);

    try {
      const iframe = this.findChatIframe();
      if (!iframe) return false;

      // First try the standard approach
      try {
        // Try to focus the iframe first
        iframe.focus();

        // Wait a moment for the focus to take effect
        setTimeout(() => {
          // Try different keyboard event types for maximum compatibility
          const eventTypes = ['keydown', 'keypress', 'keyup', 'input'];

          // Clear any existing text with Ctrl+A and Delete
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', ctrlKey: true, bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Delete', bubbles: true }));

          // Type character by character with small delays
          let index = 0;

          const typeNextChar = () => {
            if (index >= text.length) {
              debugInjector('Keyboard simulation completed');
              return;
            }

            const char = text[index];

            // Fire all event types for each character
            for (const eventType of eventTypes) {
              const event = new KeyboardEvent(eventType, {
                key: char,
                code: `Key${char.toUpperCase()}`,
                charCode: char.charCodeAt(0),
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true,
                cancelable: true
              });

              document.activeElement.dispatchEvent(event);
            }

            index++;
            // Add a small delay between characters to simulate typing
            setTimeout(typeNextChar, 10);
          };

          typeNextChar();
        }, 100);

        debugInjector('Started keyboard simulation sequence');
        return true;
      } catch (e) {
        debugInjector('Error during standard keyboard simulation', e);
      }

      // If standard approach fails, try using execCommand (deprecated but sometimes works)
      try {
        document.execCommand('insertText', false, text);
        debugInjector('Used execCommand for text insertion');
        return true;
      } catch (e) {
        debugInjector('execCommand failed', e);
      }

      // Last resort: try to use clipboard operations
      try {
        // Save current clipboard
        let originalClipboard = '';
        navigator.clipboard.readText().then(text => {
          originalClipboard = text;
        }).catch(() => {});

        // Copy our text to clipboard
        navigator.clipboard.writeText(text).then(() => {
          // Try to focus the frame
          iframe.focus();

          // Paste with keyboard shortcut
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'v', ctrlKey: true, bubbles: true }));

          // Restore original clipboard after a delay
          setTimeout(() => {
            if (originalClipboard) {
              navigator.clipboard.writeText(originalClipboard);
            }
          }, 1000);
        });

        debugInjector('Attempted clipboard paste method');
        return true;
      } catch (e) {
        debugInjector('Clipboard method failed', e);
      }

      // If all attempts failed
      debugInjector('All keyboard simulation methods failed');
      return false;
    } catch (e) {
      debugInjector('Error during keyboard simulation', e);
      return false;
    }
  },

  /**
   * Attempt to click the send button
   */
  clickSendButton() {
    debugInjector('Attempting to click send button');

    try {
      const iframe = this.findChatIframe();
      if (!iframe) return false;

      // Try to access iframe content
      let iframeDocument;
      try {
        iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
      } catch (e) {
        debugInjector('Cannot access iframe contents to find send button', e);
        return false;
      }

      const sendButton = this.findSendButton(iframeDocument);
      if (!sendButton) return false;

      // Click the button
      sendButton.click();

      debugInjector('Send button clicked');
      return true;
    } catch (e) {
      debugInjector('Error clicking send button', e);
      return false;
    }
  },

  /**
   * Create a bridge iframe to assist with cross-origin communication
   */
  createBridgeIframe() {
    debugInjector('Creating chat bridge iframe');

    try {
      // Check if bridge already exists
      const existingBridge = document.getElementById('chat-injector-bridge');
      if (existingBridge) {
        debugInjector('Bridge iframe already exists');
        return existingBridge;
      }

      // Create a hidden iframe to serve as a bridge
      const bridgeIframe = document.createElement('iframe');
      bridgeIframe.id = 'chat-injector-bridge';
      bridgeIframe.src = '/chatBridge.html';
      bridgeIframe.style.width = '0';
      bridgeIframe.style.height = '0';
      bridgeIframe.style.border = 'none';
      bridgeIframe.style.position = 'absolute';
      bridgeIframe.style.top = '-9999px';
      bridgeIframe.style.left = '-9999px';

      // Add to document
      document.body.appendChild(bridgeIframe);

      // Set up listener for bridge messages
      window.addEventListener('message', (event) => {
        if (event.data && event.data.source === 'chat-bridge') {
          if (event.data.status === 'bridge-ready') {
            debugInjector('Chat bridge is ready');
            this.bridgeReady = true;
          } else if (event.data.status === 'textarea-found') {
            debugInjector('Chat textarea found by bridge', event.data.info);

            // Look for the textarea with the given ID in the document
            const textarea = document.getElementById(event.data.info.id);
            if (textarea) {
              debugInjector('Found chat textarea by ID', textarea);
              this.chatTextarea = textarea;
            } else {
              // Try to find by data-testid
              const textareas = document.querySelectorAll(`textarea[data-testid="${event.data.info.dataTestId}"]`);
              if (textareas.length > 0) {
                debugInjector('Found chat textarea by data-testid', textareas[0]);
                this.chatTextarea = textareas[0];
              }
            }
          }
        }
      });

      debugInjector('Created chat bridge iframe', bridgeIframe);
      return bridgeIframe;
    } catch (e) {
      debugInjector('Error creating bridge iframe', e);
      return null;
    }
  },

  /**
   * Use the bridge iframe to inject text
   */
  bridgeInjection(text, shouldSend) {
    debugInjector(`Attempting bridge injection: "${text}"`);

    try {
      // Create bridge if it doesn't exist
      const bridge = document.getElementById('chat-injector-bridge') || this.createBridgeIframe();

      if (!bridge) {
        debugInjector('Failed to create or find bridge iframe');
        return false;
      }

      // Send message to bridge
      const message = {
        action: 'injectText',
        text: text,
        sendAfterInject: shouldSend,
        source: 'uplus-script-menu'
      };

      bridge.contentWindow.postMessage(message, '*');
      debugInjector('Sent message to bridge iframe');

      return true;
    } catch (e) {
      debugInjector('Error using bridge injection', e);
      return false;
    }
  },

  /**
   * Direct textarea injection when we've found the textarea directly in the DOM
   */
  directTextareaInjection(text) {
    debugInjector(`Attempting direct textarea injection: "${text}"`);

    try {
      if (!this.chatTextarea) {
        // Try to find it again
        const textareas = document.querySelectorAll('textarea[data-testid="type_a_message"]');
        if (textareas.length > 0) {
          this.chatTextarea = textareas[0];
        } else {
          return false;
        }
      }

      // Focus the textarea
      this.chatTextarea.focus();

      // Set value and dispatch input event to trigger any listeners
      this.chatTextarea.value = text;

      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      this.chatTextarea.dispatchEvent(inputEvent);

      // Also try with change event
      const changeEvent = new Event('change', { bubbles: true });
      this.chatTextarea.dispatchEvent(changeEvent);

      debugInjector('Direct textarea injection successful');
      return true;
    } catch (e) {
      debugInjector('Error during direct textarea injection', e);
      return false;
    }
  },

  /**
   * Find a send button in the document (not in iframe)
   */
  findDocumentSendButton() {
    debugInjector('Looking for send button in document');

    // Common selectors for send buttons
    const possibleSelectors = [
      'button:contains("Send")',
      'button[aria-label*="send" i]',
      'button[title*="send" i]',
      'button.send-button',
      'button.chat-send',
      '.send-message-button',
      'button.oda-chat-send',
      'button[type="submit"]',
      '.unified-chat-widget-send-button',
      '.send-button'
    ];

    // Try all selectors
    for (const selector of possibleSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        if (buttons && buttons.length) {
          debugInjector(`Found send button with selector: ${selector}`, buttons[0]);
          return buttons[0];
        }
      } catch (e) {
        // Some complex selectors might not be supported
        debugInjector(`Error querying for ${selector}`, e);
      }
    }

    // If we have a textarea, look for nearby buttons
    if (this.chatTextarea) {
      try {
        // Look for buttons near the textarea
        let parent = this.chatTextarea.parentElement;
        for (let i = 0; i < 3; i++) { // Check up to 3 levels up
          if (!parent) break;

          const nearbyButtons = parent.querySelectorAll('button');
          if (nearbyButtons && nearbyButtons.length) {
            // Look for a button that looks like 'send'
            for (const button of nearbyButtons) {
              if (button.textContent && button.textContent.toLowerCase().includes('send')) {
                debugInjector('Found send button by text content', button);
                return button;
              }
              if (button.title && button.title.toLowerCase().includes('send')) {
                debugInjector('Found send button by title', button);
                return button;
              }
              if (button.getAttribute('aria-label') && button.getAttribute('aria-label').toLowerCase().includes('send')) {
                debugInjector('Found send button by aria-label', button);
                return button;
              }
            }

            // If no specific send button found, return the last button (likely the send button)
            debugInjector('Found potential send button near textarea', nearbyButtons[nearbyButtons.length - 1]);
            return nearbyButtons[nearbyButtons.length - 1];
          }

          parent = parent.parentElement;
        }
      } catch (e) {
        debugInjector('Error finding nearby buttons', e);
      }
    }

    debugInjector('No send button found in document');
    return null;
  },

  /**
   * Click a send button in the document (not in iframe)
   */
  clickDocumentSendButton() {
    debugInjector('Attempting to click document send button');

    try {
      const sendButton = this.findDocumentSendButton();
      if (!sendButton) return false;

      // Click the button
      sendButton.click();

      debugInjector('Document send button clicked');
      return true;
    } catch (e) {
      debugInjector('Error clicking document send button', e);
      return false;
    }
  },

  /**
   * Main method to inject text into chat widget
   * Tries multiple approaches in sequence
   */
  injectText(text, shouldSend = false) {
    debugInjector(`Injecting text: "${text}", shouldSend: ${shouldSend}`);

    // Track whether the injection was successful
    let success = false;

    // First, try direct textarea injection if we found the textarea in DOM
    if (this.chatTextarea) {
      success = this.directTextareaInjection(text);
      if (success) {
        debugInjector('Text injected via direct textarea method');
        if (shouldSend) {
          setTimeout(() => this.clickDocumentSendButton(), 100);
        }
        return true;
      }
    }

    // If textarea approach failed, try other methods with iframe
    // Try different approaches in order of preference
    if (this.listenerReady) {
      // If we have confirmed our listener script is working, use that
      debugInjector('Using injected listener for text injection');

      const iframe = this.findChatIframe();
      if (iframe) {
        // Send message with appropriate format
        const message = {
          action: 'injectText',
          text: text,
          sendAfterInject: shouldSend,
          source: 'uplus-script-menu'
        };

        iframe.contentWindow.postMessage(message, '*');
        debugInjector('Sent message to injected listener');
        success = true;
      }
    }

    // If using listener failed, try direct injection
    if (!success) {
      success = this.directInjection(text);
      if (success) {
        debugInjector('Text injected via direct method');
        if (shouldSend) {
          setTimeout(() => this.clickSendButton(), 100);
        }
        return true;
      }
    }

    // Try bridge injection next
    if (!success) {
      success = this.bridgeInjection(text, shouldSend);
      if (success) {
        debugInjector('Text potentially injected via bridge');
        return true;
      }
    }

    // Try postMessage API next
    if (!success) {
      success = this.postMessageInjection(text);
      if (success) {
        debugInjector('Text potentially injected via postMessage');
        // Can't reliably click send button with this method
        return true;
      }
    }

    // Try keyboard simulation as last resort
    if (!success) {
      success = this.simulateTyping(text);
      if (success) {
        debugInjector('Text injected via keyboard simulation');
        if (shouldSend) {
          setTimeout(() => this.clickSendButton(), 100);
        }
        return true;
      }
    }

    // All methods failed
    debugInjector('All injection methods failed');
    return false;
  },

  /**
   * Monitor for changes to detect when chat widget appears
   */
  startMonitoring() {
    debugInjector('Starting iframe monitoring');

    // Create bridge iframe
    this.createBridgeIframe();

    // Check periodically for the chat iframe
    this.monitorInterval = setInterval(() => {
      const iframe = this.findChatIframe();
      if (iframe && !this.iframeDetected) {
        this.iframeDetected = true;
        debugInjector('Chat iframe appeared in DOM', iframe);

        // Try to set up message listener
        this.setupIframeMessageListener();

        // Try to detect input field
        try {
          const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
          const inputField = this.findInputField(iframeDocument);

          if (inputField) {
            debugInjector('Chat input field detected', inputField);
          }
        } catch (e) {
          debugInjector('Cannot access iframe contents', e);
        }
      } else if (!iframe && this.iframeDetected) {
        this.iframeDetected = false;
        this.listenerReady = false;
        debugInjector('Chat iframe removed from DOM');
      }
    }, 2000);
  },

  /**
   * Stop monitoring for chat iframe
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  },

  /**
   * Set up a message listener in the iframe
   * This attempts to inject a script that listens for our custom messages
   */
  setupIframeMessageListener() {
    debugInjector('Setting up iframe message listener');

    const iframe = this.findChatIframe();
    if (!iframe) return false;

    try {
      // Create a script to inject into the page
      const listenerScript = `
        <script>
        (function() {
          // Set up a message listener to receive text from parent
          window.addEventListener('message', function(event) {
            console.log('[Chat Injector Listener] Received message:', event.data);

            try {
              // Handle different message formats
              let text = '';
              let shouldSend = false;

              if (typeof event.data === 'string') {
                text = event.data;
              } else if (event.data && typeof event.data === 'object') {
                // Check for various formats
                if (event.data.action === 'injectText' && event.data.text) {
                  text = event.data.text;
                  shouldSend = event.data.sendAfterInject === true;
                } else if (event.data.type === 'pega-chat-message' && event.data.content) {
                  text = event.data.content;
                } else if (event.data.command === 'setText' && event.data.value) {
                  text = event.data.value;
                } else if (event.data.messageType === 'CHAT_INPUT_TEXT' && event.data.text) {
                  text = event.data.text;
                } else if (event.data.action === 'executeScript' && event.data.script) {
                  // Execute the provided script
                  try {
                    eval(event.data.script);
                    console.log('[Chat Injector Listener] Executed script successfully');
                    return; // Don't continue with text injection for script execution
                  } catch (e) {
                    console.error('[Chat Injector Listener] Failed to execute script:', e);
                  }
                }
              }

              if (!text) return;

              // Look for input fields
              const inputFields = document.querySelectorAll('textarea, input[type="text"]');
              let found = false;

              for (const field of inputFields) {
                // Check if this looks like a chat input
                if (field.placeholder && (
                    field.placeholder.toLowerCase().includes('message') ||
                    field.placeholder.toLowerCase().includes('type'))) {
                  // Found a chat input field, set its value
                  field.value = text;
                  field.dispatchEvent(new Event('input', { bubbles: true }));
                  field.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log('[Chat Injector Listener] Text injected into field:', field);
                  found = true;

                  // Auto-send if requested
                  if (shouldSend) {
                    // Look for a send button
                    setTimeout(function() {
                      const buttons = document.querySelectorAll('button');
                      for (const button of buttons) {
                        if (button.textContent && (
                            button.textContent.toLowerCase().includes('send') ||
                            button.title && button.title.toLowerCase().includes('send') ||
                            button.getAttribute('aria-label') && button.getAttribute('aria-label').toLowerCase().includes('send'))) {
                          button.click();
                          console.log('[Chat Injector Listener] Clicked send button');
                          break;
                        }
                      }
                    }, 100);
                  }

                  break;
                }
              }

              if (!found) {
                console.log('[Chat Injector Listener] No suitable input field found');
              }
            } catch (e) {
              console.error('[Chat Injector Listener] Error handling message:', e);
            }
          });

          // Send ready message back to parent
          try {
            window.parent.postMessage({ status: 'ready', source: 'chat-injector-listener' }, '*');
            console.log('[Chat Injector Listener] Listener ready, sent confirmation to parent');
          } catch (e) {
            console.error('[Chat Injector Listener] Failed to send ready message:', e);
          }
        })();
        </script>
      `;

      // Try to inject the script in various ways

      // Method 1: Try using srcdoc if supported
      try {
        const originalSrc = iframe.src;
        if (iframe.getAttribute('srcdoc') !== null) {
          // Read the current srcdoc
          let currentSrcdoc = iframe.getAttribute('srcdoc') || '';

          // Append our script to it
          if (currentSrcdoc.includes('</body>')) {
            iframe.srcdoc = currentSrcdoc.replace('</body>', `${listenerScript}</body>`);
          } else if (currentSrcdoc.includes('</html>')) {
            iframe.srcdoc = currentSrcdoc.replace('</html>', `${listenerScript}</html>`);
          } else {
            iframe.srcdoc = currentSrcdoc + listenerScript;
          }

          debugInjector('Injected listener script via srcdoc modification');
        }
      } catch (e) {
        debugInjector('Error injecting script via srcdoc', e);
      }

      // Method 2: Try using a URL parameter with base64 encoding
      try {
        const src = iframe.src;
        if (src && src.includes('?')) {
          const encodedScript = btoa(listenerScript);
          let newSrc = src;

          if (src.includes('#')) {
            // Insert before hash
            const parts = src.split('#');
            newSrc = `${parts[0]}&injectScript=${encodedScript}#${parts[1]}`;
          } else {
            // Append to end
            newSrc = `${src}&injectScript=${encodedScript}`;
          }

          // Only set if changed to avoid reload loop
          if (newSrc !== src) {
            iframe.src = newSrc;
            debugInjector('Added injection script parameter to iframe src');
          }
        }
      } catch (e) {
        debugInjector('Error adding script parameter to src', e);
      }

      // Listen for ready message from the injected script
      window.addEventListener('message', (event) => {
        if (event.data && event.data.status === 'ready' && event.data.source === 'chat-injector-listener') {
          debugInjector('Received ready message from injected listener');
          this.listenerReady = true;
        }
      });

      return true;
    } catch (e) {
      debugInjector('Error setting up iframe message listener', e);
      return false;
    }
  },
};

// Start monitoring when the module loads
chatInjector.startMonitoring();

// Make the injector available globally for debugging
window.chatInjector = chatInjector;

export default chatInjector;
