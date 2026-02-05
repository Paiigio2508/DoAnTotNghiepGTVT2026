import { useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

const buildTimestamp = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/* ================= REALTIME CHAT ================= */
function RealtimeChat() {
  const [username, setUsername] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);

  const canConnect = useMemo(() => username.trim().length > 0, [username]);
  const canSend = useMemo(
    () => connected && recipient.trim().length > 0 && message.trim().length > 0,
    [connected, recipient, message]
  );

  const connect = () => {
    if (!canConnect || connected) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/messages/${username.trim()}`, (frame) => {
          const payload = JSON.parse(frame.body);
          setMessages((prev) => [payload, ...prev]);
        });
        setConnected(true);
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;
  };

  const disconnect = () => {
    if (clientRef.current) {
      clientRef.current.deactivate();
    }
    setConnected(false);
  };

  const sendMessage = () => {
    if (!canSend || !clientRef.current) return;

    const payload = {
      sender: username.trim(),
      recipient: recipient.trim(),
      content: message.trim(),
      timestamp: buildTimestamp(),
    };

    clientRef.current.publish({
      destination: '/app/chat',
      body: JSON.stringify(payload),
    });

    setMessage('');
  };

  return (
    <div className="chat-layout">
      <div className="chat-widget chat-widget--page">
        <div className="chat-widget__header">
          <div>
            <h2>Realtime Chat</h2>
            <p>{connected ? `Đã kết nối: ${username}` : 'Chưa kết nối'}</p>
          </div>
        </div>

        <div className="chat-widget__body chat-widget__body--open">
          <section className="card">
            <div className="row">
              <label>
                Tên của bạn
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={connected}
                />
              </label>
              <button onClick={connect} disabled={!canConnect || connected}>
                Kết nối
              </button>
              <button onClick={disconnect} disabled={!connected}>
                Ngắt
              </button>
            </div>
          </section>

          <section className="card">
            <div className="row">
              <label>
                Người nhận
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </label>
              <label className="row__message">
                Tin nhắn
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
              </label>
              <button onClick={sendMessage} disabled={!canSend}>
                Gửi
              </button>
            </div>
          </section>

          <section className="card card--list">
            <h3>Hộp thoại 1-1</h3>
            {messages.length === 0 ? (
              <p className="empty">Chưa có tin nhắn.</p>
            ) : (
              <ul className="messages">
                {messages.map((m, i) => (
                  <li key={i} className="message">
                    <div className="message__meta">
                      <strong>{m.sender}</strong> → {m.recipient}
                      <span className="message__time">{m.timestamp}</span>
                    </div>
                    <p>{m.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ================= AI CHAT ================= */
function AiChat() {
  const [aiInput, setAiInput] = useState('');
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'assistant',
      content: 'Xin chào! Tôi là AMI của PTIT.',
      timestamp: buildTimestamp(),
    },
  ]);

  const canSendAi = useMemo(
    () => aiInput.trim().length > 0 && !aiIsTyping,
    [aiInput, aiIsTyping]
  );

  const sendAiMessage = async () => {
    if (!canSendAi) return;

    const trimmed = aiInput.trim();
    setAiMessages((prev) => [
      ...prev,
      { sender: 'user', content: trimmed, timestamp: buildTimestamp() },
    ]);
    setAiInput('');
    setAiIsTyping(true);
    setAiError('');

    try {
      const res = await fetch('http://localhost:8080/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          content: data.reply || 'AMI chưa thể trả lời.',
          timestamp: buildTimestamp(),
        },
      ]);
    } catch (e) {
      setAiError('Không thể kết nối AI');
    } finally {
      setAiIsTyping(false);
    }
  };

  return (
    <div className="chat-layout">
      <div className="chat-widget chat-widget--page">
        <div className="chat-widget__header">
          <h2>PTIT AMI</h2>
        </div>

        <div className="chat-widget__body chat-widget__body--open">
          <ul className="ai-messages">
            {aiMessages.map((m, i) => (
              <li key={i} className={`ai-message ai-message--${m.sender}`}>
                <p>{m.content}</p>
                <span>{m.timestamp}</span>
              </li>
            ))}
          </ul>

          {aiError && <p className="ai-error">{aiError}</p>}

          <div className="row ai-input">
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
              placeholder="Hỏi AMI..."
            />
            <button onClick={sendAiMessage} disabled={!canSendAi}>
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= APP ================= */
function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo">PTIT</span>
          <div>
            <h1>PTIT AMI Chat</h1>
            <p>Trợ lý thông minh 24/7</p>
          </div>
        </div>

        <nav className="app__nav">
          <NavLink to="/realtime" className="app__link">
            Chat realtime
          </NavLink>
          <NavLink to="/ai" className="app__link">
            Chat AI
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/realtime" replace />} />
        <Route path="/realtime" element={<RealtimeChat />} />
        <Route path="/ai" element={<AiChat />} />
      </Routes>
    </div>
  );
}

export default App;
