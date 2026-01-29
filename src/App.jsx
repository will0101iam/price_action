import { useState, useEffect, useRef } from 'react'
import { generateData, getRandomSlice } from './utils/dataGenerator'
import { saveSession, getHistory, createSessionId, deleteSession } from './utils/historyManager'
import { ChartComponent } from './components/ChartComponent'
import { LockScreen } from './components/LockScreen'
import ReactMarkdown from 'react-markdown';
import './App.css'

function App() {
  // Auth State
  const [isAuthorized, setIsAuthorized] = useState(() => {
      return !!localStorage.getItem('pa_trainer_auth');
  });
  const [sitePassword, setSitePassword] = useState(() => {
      return localStorage.getItem('pa_trainer_auth') || '';
  });

  const [fullData, setFullData] = useState([]);
  const [currentSlice, setCurrentSlice] = useState([]);
  const [sessionId, setSessionId] = useState(null); // Track current session
  const [historyList, setHistoryList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [inputText, setInputText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENROUTER_API_KEY || '');
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreviewCard, setShowPreviewCard] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false); // New: Collapse State
  const recognitionRef = useRef(null);

  const [messages, setMessages] = useState([]); // Array of { role: 'user' | 'assistant', content: string, thinking?: string }
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processSlice = (slice) => {
    return slice.map((candle, index) => ({
      ...candle,
      id: index + 1 // Reset ID to start from 1
    }));
  };

  useEffect(() => {
    // Init Data
    const raw = generateData(200);
    setFullData(raw);
    setCurrentSlice(processSlice(getRandomSlice(raw, 30)));
    setSessionId(createSessionId());
    setHistoryList(getHistory());

    // Init Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN'; // Chinese for the user

      recognitionRef.current.onstart = () => {
          console.log("Speech recognition started");
          setIsRecording(true);
          setShowPreviewCard(true); // Show card when recording starts
          recognitionRef.current.hasRetried = false; // Reset retry flag
      };
      
      recognitionRef.current.onend = () => {
          console.log("Speech recognition ended");
          // Only auto-restart if we intended to keep recording
          if (isRecording) {
              try {
                  recognitionRef.current.start();
              } catch(e) {
                  // Ignore error if already started
                  console.log("Restart failed", e);
                  setIsRecording(false);
              }
          } else {
              setIsRecording(false);
          }
      };

      recognitionRef.current.onsoundstart = () => {
          console.log("Sound detected");
      };

      recognitionRef.current.onresult = (event) => {
        let interim = '';
        let finalChunk = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (finalChunk) {
            setTranscript(prev => prev + finalChunk);
        }
        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        
        // Auto-retry for network errors (one attempt)
        if (event.error === 'network' && !recognitionRef.current.hasRetried) {
             console.log("Network error detected, attempting auto-retry...");
             recognitionRef.current.hasRetried = true;
             setTimeout(() => {
                 try {
                     // Only restart if we still think we should be recording, 
                     // or just let the user try again manually to be safe.
                     // But here we try to recover the session.
                     recognitionRef.current.start();
                 } catch(e) { console.log("Retry failed", e); }
             }, 1000);
             return;
        }

        if (event.error === 'no-speech') {
            return; 
        }
        
        // Visual feedback
        let msg = `Voice Error: ${event.error}`;
        if (event.error === 'network') {
            msg = "语音服务连接失败，请检查网络 (Google Speech API)";
        }
        setAiFeedback(msg);
        setIsRecording(false);
      };
    } else {
      console.warn("Browser does not support Speech Recognition.");
    }
  }, []);

  useEffect(() => {
    if (sessionId && currentSlice.length > 0 && messages.length > 0) {
      const title = messages.find(m => m.role === 'user')?.content.substring(0, 20) || `Session ${new Date(parseInt(sessionId.substring(0, 8), 36) || Date.now()).toLocaleTimeString()}`;
      saveSession({
        id: sessionId,
        chartData: currentSlice,
        messages: messages,
        title: title
      });
      setHistoryList(getHistory());
    }
  }, [sessionId, currentSlice, messages]);

  const handleNewChart = () => {
    setCurrentSlice(processSlice(getRandomSlice(fullData, 30)));
    setSessionId(createSessionId());
    setTranscript('');
    setInputText('');
    setMessages([]); // Clear chat history
    setAiFeedback(null);
  };

  const handleLoadSession = (session) => {
      setSessionId(session.id);
      setCurrentSlice(session.chartData);
      setMessages(session.messages || []);
      setShowHistory(false);
  };

  const handleDeleteSession = (e, id) => {
      e.stopPropagation();
      if (confirm('Delete this session?')) {
          const newList = deleteSession(id);
          setHistoryList(newList);
          if (sessionId === id) {
              handleNewChart();
          }
      }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false); // Update state first to stop auto-restart
      recognitionRef.current.stop();
      // Keep card open for review!
    } else {
      setTranscript(''); // Clear previous
      setInterimTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
      setShowPreviewCard(true); // Show card
      
      // Diagnostic Timeout
      setTimeout(() => {
          if (isRecording && !transcript && !interimTranscript) {
              // Check if we are still recording but have no text after 5 seconds
              // We can't easily check 'isRecording' state inside timeout closure properly without ref, 
              // but we can check if the transcript state is still empty.
              // Actually, best to just log or show a subtle hint.
              console.log("Diagnostic: No speech detected after 5s.");
          }
      }, 5000);
    }
  };

  const handleVoiceCancel = () => {
    setTranscript('');
    setInterimTranscript('');
    setShowPreviewCard(false);
    if (isRecording) {
        setIsRecording(false);
        recognitionRef.current.stop();
    }
  };

  const handleVoiceSubmit = () => {
    const text = transcript + interimTranscript;
    if (text.trim()) {
        analyzeWithAI(text);
        setShowPreviewCard(false);
        setIsInputCollapsed(true); // Auto-collapse on send
    }
  };

  const handleTextSubmit = () => {
    if (inputText.trim()) {
        analyzeWithAI(inputText);
        setIsInputCollapsed(true); // Auto-collapse on send
    }
  };

  const handleUnlock = (password) => {
      setSitePassword(password);
      setIsAuthorized(true);
      localStorage.setItem('pa_trainer_auth', password);
  };

  const analyzeWithAI = async (manualInput = null) => {
    // This function simulates the backend logic
    // It constructs the prompt that WOUL be sent to the LLM
    
    const finalInput = manualInput || transcript;

    if (!finalInput) {
        setAiFeedback("Please say or type something first.");
        return;
    }

    const contextData = currentSlice.map(c => 
      `Index: ${c.id} | O:${c.open} H:${c.high} L:${c.low} C:${c.close}`
    ).join('\n');

    const focusPoint = "User Focus: General Chart";

    const systemPrompt = `你是一位专业的价格行为学（Price Action）交易教练。请根据提供的K线数据分析用户的观点。
1. **必须使用中文回答**。
2. 使用专业的中文交易术语（如：吞没、孕线、pinbar、阻力位、支撑位等）。
3. 如果需要思考过程，请将思考内容包裹在 <thinking>...</thinking> 标签中，然后输出最终回答。
4. 评分用户的分析（0-10分）。`;
    
    const userPrompt = `
[CHART DATA]
${contextData}

[USER CONTEXT]
${focusPoint}

[USER INPUT]
"${finalInput}"
    `;

    // Optimistic UI update
    const newUserMsg = { role: 'user', content: finalInput };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    setInputText('');
    setTranscript('');
    setInterimTranscript('');

    try {
        // Prepare messages for API (include history)
        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({ 
                role: m.role, 
                content: m.thinking ? `${m.thinking}\n${m.content}` : m.content 
            })),
            { role: "user", content: userPrompt }
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        let response;
        
        // Determine Mode: Dev (Direct) vs Prod (Proxy)
        const isDev = import.meta.env.DEV;
        
        if (isDev) {
            // --- Local Development Mode (Direct OpenRouter) ---
            // Verify Local Password first
            if (sitePassword !== import.meta.env.VITE_SITE_PASSWORD) {
                throw new Error("Incorrect Password (Local Check)");
            }
            
            const localApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
            if (!localApiKey) throw new Error("VITE_OPENROUTER_API_KEY not found in .env.local");

            response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localApiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Walk & Trade',
                },
                body: JSON.stringify({
                    model: "google/gemini-3-flash-preview",
                    messages: apiMessages,
                    temperature: 0.7
                }),
                signal: controller.signal
            });
        } else {
            // --- Production Mode (Backend Proxy) ---
            response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-site-password': sitePassword
                },
                body: JSON.stringify({
                    messages: apiMessages,
                    temperature: 0.7
                }),
                signal: controller.signal
            });
        }
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Handle Auth Failure
            if (response.status === 401 && !import.meta.env.DEV) {
                // Only logout in Production if 401 (which now comes from our Backend Auth)
                setIsAuthorized(false);
                localStorage.removeItem('pa_trainer_auth');
                throw new Error("Password Incorrect or Session Expired. Please login again.");
            }
            
            throw new Error(errorData.error?.message || errorData.error || `API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(JSON.stringify(data.error));
        }

        const rawReply = data.choices[0].message.content;
        
        // Parse Thinking
        let thinking = '';
        let content = rawReply;
        const thinkingMatch = rawReply.match(/<thinking>([\s\S]*?)<\/thinking>/);
        if (thinkingMatch) {
            thinking = thinkingMatch[1].trim();
            content = rawReply.replace(thinkingMatch[0], '').trim();
        }

        setMessages(prev => [...prev, { role: 'assistant', content, thinking }]);

    } catch (error) {
        console.error("LLM Error:", error);
        let errorMsg = error.message;
        if (error.name === 'AbortError') {
            errorMsg = "Network Timeout: The request took too long. Check your connection.";
        } else if (error.message.includes('Failed to fetch')) {
            errorMsg = "Network Error: Could not connect to API. Please check your VPN/Proxy.";
        }
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isAuthorized) {
      return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <>
      {/* Header */}
      <header className="app-header">
          <div className="logo">
              <div className="logo-icon"></div>
              <span>PA Trainer</span>
          </div>
          <div className="header-actions">
              <button title="History" onClick={() => setShowHistory(!showHistory)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
              </button>
              <button title="Settings" onClick={() => setShowSettings(!showSettings)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                  </svg>
              </button>
          </div>
      </header>

      {/* Panels (Overlays) */}
      {showHistory && (
        <div className="history-panel">
            <h3>Sessions</h3>
            <div className="history-list">
                {historyList.map(h => (
                    <div 
                        key={h.id} 
                        className={`history-item ${h.id === sessionId ? 'active' : ''}`}
                        onClick={() => handleLoadSession(h)}
                    >
                        <div className="history-info">
                            <span className="history-title">{h.title}</span>
                            <span className="history-date">{new Date(h.lastUpdated).toLocaleString()}</span>
                        </div>
                        <button 
                            className="delete-btn"
                            onClick={(e) => handleDeleteSession(e, h.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}
                {historyList.length === 0 && <p className="empty-hint">No history yet.</p>}
            </div>
        </div>
      )}

      {showSettings && (
          <div className="settings-panel">
              <h3>Settings</h3>
              <input 
                  type="password" 
                  placeholder="Enter OpenAI/DeepSeek API Key" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="api-key-input"
              />
              <p className="hint">Key is stored in memory only.</p>
          </div>
      )}

      {/* Main Content */}
      <div className="main-container">
          
          {/* Chart Section */}
          <div className="chart-section">
              <div className="chart-controls">
                  <div className="refresh-btn" onClick={handleNewChart}>
                      <span>🔄 Random Chart</span>
                  </div>
              </div>
              
              <div className="chart-wrapper">
                <ChartComponent 
                  data={currentSlice} 
                />
              </div>
          </div>

          {/* Chat Section */}
          <div className="chat-section">
              <div className="chat-messages">
                  {messages.length === 0 && (
                    <div className="message assistant">
                        👋 你好！我是你的 AI 交易教练。<br />
                        我已经为你随机抽取了一段 BTC 的历史行情。<br />
                        请告诉我你的分析。
                    </div>
                  )}
                  
                  {messages.map((msg, idx) => (
                      <div key={idx} className={`message ${msg.role}`}>
                          {msg.role === 'assistant' && msg.thinking && (
                              <details className="thinking-accordion">
                                  <summary>🧠 思考过程</summary>
                                  <div className="thinking-content">{msg.thinking}</div>
                              </details>
                          )}
                          <div className="message-content">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                      </div>
                  ))}
                  
                  {isLoading && (
                      <div className="message assistant">
                          <div className="typing-indicator">
                              <span>●</span><span>●</span><span>●</span>
                          </div>
                      </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>

              {/* Input Area (New V2 Design) */}
              <div className={`input-section ${isInputCollapsed ? 'collapsed' : ''}`}>
                  {/* Toggle Collapse Button */}
                  <button 
                      className="collapse-toggle" 
                      onClick={() => setIsInputCollapsed(!isInputCollapsed)}
                      title={isInputCollapsed ? "Expand" : "Collapse"}
                  >
                      {isInputCollapsed ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                      ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                      )}
                  </button>

                  {/* 1. Mode Toggle */}
                  <div className="mode-toggle-container">
                      <div className="mode-toggle">
                          <button 
                              className={`toggle-btn ${inputMode === 'voice' ? 'active' : ''}`}
                              onClick={() => setInputMode('voice')}
                          >
                              Voice
                          </button>
                          <button 
                              className={`toggle-btn ${inputMode === 'text' ? 'active' : ''}`}
                              onClick={() => setInputMode('text')}
                          >
                              Text
                          </button>
                      </div>
                  </div>
                  
                  {/* 2. Controls */}
                  <div className="controls-row">
                      {inputMode === 'text' ? (
                          <>
                            <div className="text-input-wrapper" onClick={() => setIsInputCollapsed(false)}>
                                <textarea 
                                    className="text-input" 
                                    placeholder="Type your analysis (Shift+Enter for new line)..."
                                    rows={1}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleTextSubmit();
                                        }
                                    }}
                                    onFocus={() => setIsInputCollapsed(false)} // Auto-expand on focus
                                />
                            </div>
                            <button className="send-btn" onClick={handleTextSubmit}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                          </>
                      ) : (
                          <button 
                              className={`voice-btn ${isRecording ? 'recording' : ''}`} 
                              onMouseDown={(e) => { e.preventDefault(); toggleRecording(); setIsInputCollapsed(false); }}
                              onTouchStart={(e) => { e.preventDefault(); toggleRecording(); setIsInputCollapsed(false); }}
                              // Note: We use toggle behavior instead of hold-to-speak for simplicity with PC mouse
                              // But to match prototype 'hold', we could use start/stop. 
                              // For better UX across devices, click-to-start/click-to-stop is often safer than hold.
                              // Let's stick to click-toggle for now as implemented in logic.
                          >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                              {isRecording ? 'Listening...' : 'Tap to Speak'}
                          </button>
                      )}
                  </div>

                  {/* 3. Voice Result Card (The Fix) */}
                  <div className={`voice-result-card ${showPreviewCard ? 'visible' : ''}`}>
                      <div className="voice-text-content">
                          {transcript + interimTranscript || "Listening..."}
                      </div>
                      <div className="voice-card-footer">
                          <button className="action-chip cancel" onClick={handleVoiceCancel}>Cancel</button>
                          <button className="action-chip confirm" onClick={handleVoiceSubmit}>
                              Send <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                          </button>
                      </div>
                  </div>
              </div>
          </div>

      </div>
    </>
  )
}

export default App

