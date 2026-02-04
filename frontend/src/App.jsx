import { useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý AI. Bạn có thể hỏi tôi về sản phẩm, hướng dẫn sử dụng, hoặc gợi ý nội dung.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [connected, setConnected] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const clientRef = useRef(null);

  const canConnect = useMemo(() => username.trim().length > 0, [username]);
  const canSend = useMemo(
    () => connected && recipient.trim().length > 0 && message.trim().length > 0,
    [connected, recipient, message]
  );
  const canSendAi = useMemo(
    () => aiInput.trim().length > 0 && !aiIsTyping,
    [aiInput, aiIsTyping]
  );

  const buildTimestamp = () =>
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const buildAiReply = (prompt) => {
    const normalized = prompt.toLowerCase();
    if (normalized.includes('xin chào') || normalized.includes('chào')) {
      return 'Chào bạn! Tôi có thể giúp bạn lên kịch bản trò chuyện, gợi ý nội dung, hoặc trả lời câu hỏi nhanh.';
    }
    if (normalized.includes('giá') || normalized.includes('chi phí')) {
      return 'Bạn có thể cho tôi biết sản phẩm/dịch vụ cụ thể để tôi gợi ý chi phí phù hợp?';
    }
    if (normalized.includes('hướng dẫn') || normalized.includes('cách dùng')) {
      return 'Bạn muốn hướng dẫn phần nào? Hãy mô tả ngắn, tôi sẽ gửi từng bước cụ thể.';
    }
    if (normalized.includes('tính năng') || normalized.includes('feature')) {
      return 'Tôi có thể tóm tắt các tính năng chính, lợi ích và các ví dụ sử dụng. Bạn cần theo dạng bảng hay bullet?';
    }
    return 'Tôi đã ghi nhận. Bạn muốn tôi làm rõ thêm phần nào hoặc cần gợi ý chi tiết hơn?';
  };

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

  const sendAiMessage = () => {
    if (!canSendAi) return;
    const trimmed = aiInput.trim();
    const userMessage = {
      sender: 'user',
      content: trimmed,
      timestamp: buildTimestamp(),
    };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput('');
    setAiIsTyping(true);

    setTimeout(() => {
      const reply = {
        sender: 'assistant',
        content: buildAiReply(trimmed),
        timestamp: buildTimestamp(),
      };
      setAiMessages((prev) => [...prev, reply]);
      setAiIsTyping(false);
    }, 700);
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>Realtime Chat</h1>
        <p>Chat 1-1 between two accounts using WebSocket + STOMP.</p>
      </header>

      <div className="chat-widget">
        <div className="chat-widget__header">
          <div>
            <h2>Chat</h2>
            <p>{connected ? `Connected as ${username || '...'}` : 'Disconnected'}</p>
          </div>
          <button
            type="button"
            className="chat-widget__toggle"
            onClick={() => setIsChatOpen((open) => !open)}
          >
            {isChatOpen ? '−' : '+'}
          </button>
        </div>

        <div
          className={`chat-widget__body ${
            isChatOpen ? 'chat-widget__body--open' : 'chat-widget__body--closed'
          }`}
        >
          <section className="card">
            <div className="row">
              <label>
                Your name
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  disabled={connected}
                />
              </label>
              <button onClick={connect} disabled={!canConnect || connected}>
                Connect
              </button>
              <button onClick={disconnect} disabled={!connected}>
                Disconnect
              </button>
            </div>
            <p className={connected ? 'status status--online' : 'status status--offline'}>
              {connected ? `Connected as ${username}` : 'Disconnected'}
            </p>
          </section>

          <section className="card">
            <div className="row">
              <label>
                Recipient
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Recipient username"
                />
              </label>
              <label className="row__message">
                Message
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message"
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
              </label>
              <button onClick={sendMessage} disabled={!canSend}>
                Send
              </button>
            </div>
          </section>

          <section className="card card--ai">
            <div className="ai-header">
              <div>
                <h3>Hỗ trợ AI</h3>
                <p>Trợ lý gợi ý nhanh nội dung và phản hồi.</p>
              </div>
              <span className={`ai-status ${aiIsTyping ? 'ai-status--typing' : ''}`}>
                {aiIsTyping ? 'Đang soạn trả lời...' : 'Sẵn sàng'}
              </span>
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
            <div className="row ai-input">
              <label>
                Nhắn cho AI
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Bạn cần trợ giúp gì?"
                  onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                />
              </label>
              <button onClick={sendAiMessage} disabled={!canSendAi}>
                Gửi
              </button>
            </div>
          </section>

          <section className="card card--list">
            <h3>Conversation</h3>
            {messages.length === 0 ? (
              <p className="empty">No messages yet.</p>
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

export default App;
