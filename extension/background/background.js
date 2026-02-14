/**
 * Background Service Worker
 * Handles API communication for the extension.
 * Content scripts can't make cross-origin requests, so we proxy through here.
 */

const API_URL = 'http://localhost:8000';

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type);
  
  if (message.type === 'STREAM_CHAT') {
    handleStreamChat(message, sender);
  }
  
  return false;
});

/**
 * Handle streaming chat request
 */
async function handleStreamChat(message, sender) {
  const { selectedText, question, contextUrl } = message;
  const tabId = sender.tab?.id;
  
  if (!tabId) {
    console.error('[Background] No tab ID');
    return;
  }
  
  console.log('[Background] Making request to:', `${API_URL}/api/chat/stream`);
  
  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selected_text: selectedText,
        question: question,
        context_url: contextUrl
      })
    });
    
    console.log('[Background] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] Server error:', errorText);
      chrome.tabs.sendMessage(tabId, {
        type: 'STREAM_ERROR',
        error: `Server error: ${response.status}`
      });
      return;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    // Send start event
    chrome.tabs.sendMessage(tabId, { type: 'STREAM_START' });
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('[Background] Stream complete');
        chrome.tabs.sendMessage(tabId, { type: 'STREAM_COMPLETE' });
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.event_type === 'delta' && data.content) {
              chrome.tabs.sendMessage(tabId, {
                type: 'STREAM_CHUNK',
                content: data.content
              });
            } else if (data.event_type === 'error') {
              chrome.tabs.sendMessage(tabId, {
                type: 'STREAM_ERROR',
                error: data.error || 'Unknown error'
              });
              return;
            } else if (data.event_type === 'stop') {
              chrome.tabs.sendMessage(tabId, { type: 'STREAM_COMPLETE' });
              return;
            }
          } catch (e) {
            console.error('[Background] Parse error:', e, 'Line:', line);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Background] Fetch error:', error);
    chrome.tabs.sendMessage(tabId, {
      type: 'STREAM_ERROR',
      error: 'Cannot connect to server. Is the backend running on localhost:8000?'
    });
  }
}

console.log('[AI Text Assistant] Background service worker loaded');
