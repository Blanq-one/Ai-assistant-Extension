/**
 * Popup Script
 * Handles configuration UI and server health checks.
 * Following Single Responsibility: Only manages popup interactions.
 */

class PopupController {
  constructor() {
    this.apiUrlInput = document.getElementById('apiUrl');
    this.saveBtn = document.getElementById('saveBtn');
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    this.toast = document.getElementById('toast');
    
    this.init();
  }
  
  async init() {
    await this.loadConfig();
    this.bindEvents();
    await this.checkConnection();
  }
  
  bindEvents() {
    this.saveBtn.addEventListener('click', () => this.saveConfig());
    this.apiUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.saveConfig();
    });
  }
  
  async loadConfig() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (response && response.apiUrl) {
        this.apiUrlInput.value = response.apiUrl;
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }
  
  async saveConfig() {
    const apiUrl = this.apiUrlInput.value.trim();
    
    if (!apiUrl) {
      this.showToast('Please enter an API URL', 'error');
      return;
    }
    
    try {
      new URL(apiUrl);
    } catch {
      this.showToast('Please enter a valid URL', 'error');
      return;
    }
    
    try {
      await chrome.runtime.sendMessage({
        type: 'SET_CONFIG',
        config: { apiUrl }
      });
      
      this.showToast('Configuration saved', 'success');
      await this.checkConnection();
    } catch (error) {
      this.showToast('Failed to save configuration', 'error');
    }
  }
  
  async checkConnection() {
    this.setStatus('checking', 'Checking connection...');
    
    try {
      const config = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      const response = await fetch(`${config.apiUrl}/api/chat/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.setStatus('connected', `Connected to ${data.service || 'server'}`);
      } else {
        this.setStatus('disconnected', 'Server returned error');
      }
    } catch (error) {
      this.setStatus('disconnected', 'Cannot reach server');
    }
  }
  
  setStatus(status, text) {
    this.statusDot.className = `status-dot ${status}`;
    this.statusText.textContent = text;
  }
  
  showToast(message, type = '') {
    this.toast.textContent = message;
    this.toast.className = `toast ${type}`;
    this.toast.style.display = 'block';
    
    setTimeout(() => {
      this.toast.style.display = 'none';
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});


