import { useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

const buildTimestamp = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

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
            <p>{connected ? `Đang kết nối: ${username || '...'}` : 'Chưa kết nối'}</p>
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
                  placeholder="Nhập tên"
                  disabled={connected}
                />
              </label>
              <button onClick={connect} disabled={!canConnect || connected}>
                Kết nối
              </button>
              <button onClick={disconnect} disabled={!connected}>
                Ngắt kết nối
              </button>
            </div>
            <p className={connected ? 'status status--online' : 'status status--offline'}>
              {connected ? `Đã kết nối: ${username}` : 'Chưa kết nối'}
            </p>
          </section>

          <section className="card">
            <div className="row">
              <label>
                Người nhận
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Tài khoản người nhận"
                />
              </label>
              <label className="row__message">
                Tin nhắn
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nhập nội dung"
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
                  <li key={`${m.timestamp}-${i}`} className="message">
                    <div className="message__meta">
                      <strong>{m.sender}</strong> → <span>{m.recipient}</span>
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

function AiChat() {
  const [aiInput, setAiInput] = useState('');
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'assistant',
      content:
        'Xin chào! Tôi là AMI của PTIT. Tôi có thể hỗ trợ bạn tra cứu thông tin học vụ, dịch vụ sinh viên, hoặc gợi ý nội dung.',
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
    const userMessage = {
      sender: 'user',
      content: trimmed,
      timestamp: buildTimestamp(),
    };
    const history = aiMessages.map((item) => ({
      role: item.sender === 'assistant' ? 'assistant' : 'user',
      content: item.content,
    }));
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput('');
    setAiIsTyping(true);
    setAiError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      if (!response.ok) {
        throw new Error('Không thể kết nối tới AI. Vui lòng thử lại.');
      }
      const data = await response.json();
      const reply = {
        sender: 'assistant',
        content: data.reply || 'AMI chưa thể trả lời lúc này.',
        timestamp: buildTimestamp(),
      };
      setAiMessages((prev) => [...prev, reply]);
    } catch (error) {
      setAiError(error.message || 'Đã có lỗi xảy ra.');
    } finally {
      setAiIsTyping(false);
    }
  };

  return (
    <div className="chat-layout">
      <div className="chat-widget chat-widget--page">
        <div className="chat-widget__header">
          <div>
            <h2>PTIT AMI</h2>
            <p>Trợ lý AI tư vấn nhanh cho sinh viên</p>
          </div>
        </div>

        <div className="chat-widget__body chat-widget__body--open">
          <section className="card card--ai">
            <div className="ai-header">
              <div>
                <h3>Trợ lý AMI PTIT</h3>
                <p>Gợi ý nhanh về học vụ, dịch vụ sinh viên, và thông báo mới.</p>
              </div>
              <span className={`ai-status ${aiIsTyping ? 'ai-status--typing' : ''}`}>
                {aiIsTyping ? 'Đang soạn trả lời...' : 'Sẵn sàng'}
              </span>
            </div>
            <div className="ai-suggestions">
              {['Học phí học kỳ này?', 'Lịch thi cuối kỳ', 'Hướng dẫn đăng ký môn'].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="ai-suggestion"
                    onClick={() => setAiInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
            <ul className="ai-messages">
              {aiMessages.map((aiMessage, index) => (
                <li
                  key={`${aiMessage.timestamp}-${index}`}
                  className={`ai-message ai-message--${aiMessage.sender}`}
                >
                  <p>{aiMessage.content}</p>
                  <span>{aiMessage.timestamp}</span>
                </li>
              ))}
              {aiIsTyping ? (
                <li className="ai-message ai-message--assistant ai-message--typing">
                  <p>AI đang nhập...</p>
                </li>
              ) : null}
            </ul>
            {aiError ? <p className="ai-error">{aiError}</p> : null}
            <div className="row ai-input">
              <label>
                Nhắn cho AMI
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Hỏi AMI về PTIT..."
                  onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                />
              </label>
              <button onClick={sendAiMessage} disabled={!canSendAi}>
                Gửi
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo">PTIT</span>
          <div>
            <h1>PTIT AMI Chat</h1>
            <p>Trợ lý thông minh hỗ trợ sinh viên và cán bộ PTIT 24/7.</p>
          </div>
        </div>
        <nav className="app__nav">
          <NavLink to="/realtime" className="app__link">
            Chat realtime
          </NavLink>
          <NavLink to="/ai" className="app__link">
            Chat AMI (AI)
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/realtime" replace />} />
        <Route path="/realtime" element={<RealtimeChat />} />
        <Route path="/ai" element={<AiChat />} />
        <Route path="*" element={<Navigate to="/realtime" replace />} />
      </Routes>
    </div>
  );
}

export default App;
