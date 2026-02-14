/**
 * Content Script
 * Main entry point for the extension's page-level functionality.
 * API calls are routed through the background service worker.
 */

(function() {
  'use strict';

  // ============================================================
  // Configuration & State
  // ============================================================
  
  const CONFIG = {
    SHORTCUT: { key: 'a', ctrlKey: true, shiftKey: true },
    DEBOUNCE_MS: 150,
    MIN_SELECTION_LENGTH: 3
  };

  const state = {
    selectedText: '',
    selectionRect: null,
    isStreaming: false,
    fab: null,
    panel: null,
    fullResponse: ''
  };

  // ============================================================
  // Utility Functions
  // ============================================================

  function debounce(fn, ms) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  }

  function parseMarkdown(text) {
    if (!text) return '';
    
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    return `<p>${html}</p>`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================
  // Message Listener for Background Script Responses
  // ============================================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!state.panel) return;
    
    const responseArea = state.panel.querySelector('.cta-panel__response');
    const input = state.panel.querySelector('.cta-panel__input');
    const submitBtn = state.panel.querySelector('.cta-panel__submit');
    
    switch (message.type) {
      case 'STREAM_START':
        state.fullResponse = '';
        break;
        
      case 'STREAM_CHUNK':
        state.fullResponse += message.content;
        if (responseArea) {
          responseArea.innerHTML = `
            <div class="cta-response-content">
              ${parseMarkdown(state.fullResponse)}
              <span class="cta-cursor"></span>
            </div>
          `;
          responseArea.scrollTop = responseArea.scrollHeight;
        }
        break;
        
      case 'STREAM_COMPLETE':
        if (responseArea) {
          responseArea.innerHTML = `
            <div class="cta-response-content">
              ${parseMarkdown(state.fullResponse)}
            </div>
          `;
        }
        state.isStreaming = false;
        if (submitBtn) submitBtn.disabled = false;
        if (input) {
          input.disabled = false;
          input.value = '';
          input.focus();
        }
        break;
        
      case 'STREAM_ERROR':
        if (responseArea) {
          responseArea.innerHTML = `
            <div class="cta-error">
              <span class="cta-error__icon">⚠️</span>
              <span>${escapeHtml(message.error)}</span>
            </div>
          `;
        }
        state.isStreaming = false;
        if (submitBtn) submitBtn.disabled = false;
        if (input) input.disabled = false;
        break;
    }
  });

  // ============================================================
  // UI Components
  // ============================================================

  function createFAB(x, y) {
    removeFAB();
    
    const fab = document.createElement('button');
    fab.className = 'cta-fab';
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    fab.title = 'Ask AI about this text';
    
    fab.style.left = `${Math.min(x + 10, window.innerWidth - 60)}px`;
    fab.style.top = `${Math.min(y - 50, window.innerHeight - 60)}px`;
    
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPanel();
    });
    
    document.body.appendChild(fab);
    state.fab = fab;
    
    return fab;
  }

  function removeFAB() {
    if (state.fab) {
      state.fab.remove();
      state.fab = null;
    }
  }

  function createPanel() {
    removePanel();
    
    const panel = document.createElement('div');
    panel.className = 'cta-panel';
    
    const rect = state.selectionRect;
    let left = rect ? rect.right + 16 : window.innerWidth / 2 - 210;
    let top = rect ? rect.top : 100;
    
    left = Math.max(16, Math.min(left, window.innerWidth - 436));
    top = Math.max(16, Math.min(top, window.innerHeight - 400));
    
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    
    panel.innerHTML = `
      <div class="cta-panel__header">
        <div class="cta-panel__title">
          <span class="cta-panel__icon">✨</span>
          <span>AI Assistant</span>
        </div>
        <button class="cta-panel__close" title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="cta-panel__context">
        <div class="cta-panel__context-label">Selected Text</div>
        <div class="cta-panel__context-text">${escapeHtml(state.selectedText)}</div>
      </div>
      
      <div class="cta-panel__input-area">
        <div class="cta-panel__input-wrapper">
          <textarea 
            class="cta-panel__input" 
            placeholder="Ask a question about this text..."
            rows="1"
          ></textarea>
          <button class="cta-panel__submit">
            <span>Ask</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="cta-panel__response">
        <div class="cta-empty">
          <div class="cta-empty__icon">💬</div>
          <div>Ask a question to get started</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    state.panel = panel;
    
    setupPanelEvents(panel);
    
    const input = panel.querySelector('.cta-panel__input');
    setTimeout(() => input.focus(), 100);
    
    return panel;
  }

  function setupPanelEvents(panel) {
    const closeBtn = panel.querySelector('.cta-panel__close');
    const input = panel.querySelector('.cta-panel__input');
    const submitBtn = panel.querySelector('.cta-panel__submit');
    const header = panel.querySelector('.cta-panel__header');
    
    closeBtn.addEventListener('click', removePanel);
    submitBtn.addEventListener('click', () => handleSubmit(panel));
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(panel);
      }
    });
    
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
    
    makeDraggable(panel, header);
    document.addEventListener('keydown', handleEscape);
  }

  function handleEscape(e) {
    if (e.key === 'Escape' && state.panel) {
      removePanel();
    }
  }

  function makeDraggable(panel, handle) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.cta-panel__close')) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = panel.offsetLeft;
      startTop = panel.offsetTop;
      
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
    });
    
    function onDrag(e) {
      if (!isDragging) return;
      panel.style.left = `${startLeft + e.clientX - startX}px`;
      panel.style.top = `${startTop + e.clientY - startY}px`;
    }
    
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }

  /**
   * Handle form submission - sends request through background script
   */
  async function handleSubmit(panel) {
    const input = panel.querySelector('.cta-panel__input');
    const submitBtn = panel.querySelector('.cta-panel__submit');
    const responseArea = panel.querySelector('.cta-panel__response');
    const question = input.value.trim();
    
    if (!question || state.isStreaming) return;
    
    state.isStreaming = true;
    state.fullResponse = '';
    submitBtn.disabled = true;
    input.disabled = true;
    
    responseArea.innerHTML = `
      <div class="cta-loading">
        <div class="cta-loading__dots">
          <div class="cta-loading__dot"></div>
          <div class="cta-loading__dot"></div>
          <div class="cta-loading__dot"></div>
        </div>
        <span>AI is thinking...</span>
      </div>
    `;
    
    // Send request through background script
    try {
      chrome.runtime.sendMessage({
        type: 'STREAM_CHAT',
        selectedText: state.selectedText,
        question: question,
        contextUrl: window.location.href
      }, (response) => {
        // Check for errors
        if (chrome.runtime.lastError) {
          console.error('[Content] Message error:', chrome.runtime.lastError);
          responseArea.innerHTML = `
            <div class="cta-error">
              <span class="cta-error__icon">⚠️</span>
              <span>Extension error: ${chrome.runtime.lastError.message}</span>
            </div>
          `;
          state.isStreaming = false;
          submitBtn.disabled = false;
          input.disabled = false;
        }
      });
    } catch (error) {
      console.error('[Content] Send error:', error);
      responseArea.innerHTML = `
        <div class="cta-error">
          <span class="cta-error__icon">⚠️</span>
          <span>Failed to send message: ${error.message}</span>
        </div>
      `;
      state.isStreaming = false;
      submitBtn.disabled = false;
      input.disabled = false;
    }
  }

  function removePanel() {
    if (state.panel) {
      state.panel.remove();
      state.panel = null;
      state.isStreaming = false;
      document.removeEventListener('keydown', handleEscape);
    }
  }

  function showPanel() {
    removeFAB();
    createPanel();
  }

  // ============================================================
  // Selection Handler
  // ============================================================

  const handleSelection = debounce(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text.length >= CONFIG.MIN_SELECTION_LENGTH) {
      state.selectedText = text;
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      state.selectionRect = rect;
      
      createFAB(rect.right, rect.top);
    } else {
      if (!state.panel) {
        removeFAB();
      }
    }
  }, CONFIG.DEBOUNCE_MS);

  // ============================================================
  // Keyboard Shortcut Handler
  // ============================================================

  function handleKeyboard(e) {
    const { key, ctrlKey, shiftKey } = e;
    const shortcut = CONFIG.SHORTCUT;
    
    if (
      key.toLowerCase() === shortcut.key &&
      ctrlKey === shortcut.ctrlKey &&
      shiftKey === shortcut.shiftKey
    ) {
      e.preventDefault();
      
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length >= CONFIG.MIN_SELECTION_LENGTH) {
        state.selectedText = text;
        const range = selection.getRangeAt(0);
        state.selectionRect = range.getBoundingClientRect();
        showPanel();
      }
    }
  }

  // ============================================================
  // Initialization
  // ============================================================

  function init() {
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    document.addEventListener('keydown', handleKeyboard);
    
    document.addEventListener('mousedown', (e) => {
      if (state.fab && !state.fab.contains(e.target) && !state.panel) {
        removeFAB();
      }
    });
    
    console.log('[AI Text Assistant] Loaded successfully');
  }

  init();
})();
