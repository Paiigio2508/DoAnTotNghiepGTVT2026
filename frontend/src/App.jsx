import { useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const clientRef = useRef(null);

  const canConnect = useMemo(() => username.trim().length > 0, [username]);
  const canSend = useMemo(
    () => connected && recipient.trim().length > 0 && message.trim().length > 0,
    [connected, recipient, message]
  );

  const connect = () => {
    if (!canConnect || connected) {
      return;
    }

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
      onDisconnect: () => {
        setConnected(false);
      },
      onStompError: () => {
        setConnected(false);
      },
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
    if (!canSend || !clientRef.current) {
      return;
    }

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
    <div className="app">
      <header className="app__header">
        <h1>Realtime Chat</h1>
        <p>Chat 1-1 between two accounts using WebSocket + STOMP.</p>
      </header>

      <button
        type="button"
        className="chat-toggle"
        onClick={() => setIsChatOpen((open) => !open)}
      >
        {isChatOpen ? 'Hide chat' : 'Show chat'}
      </button>

      <div className={`chat-panel ${isChatOpen ? 'chat-panel--open' : 'chat-panel--closed'}`}>
        <section className="card">
          <div className="row">
            <label>
              Your name
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your name"
              />
            </label>
            <button type="button" onClick={connect} disabled={!canConnect || connected}>
              Connect
            </button>
            <button type="button" onClick={disconnect} disabled={!connected}>
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
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="Recipient username"
              />
            </label>
            <label className="row__message">
              Message
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type a message"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    sendMessage();
                  }
                }}
              />
            </label>
            <button type="button" onClick={sendMessage} disabled={!canSend}>
              Send
            </button>
          </div>
        </section>

        <section className="card card--list">
          <h2>Conversation</h2>
          {messages.length === 0 ? (
            <p className="empty">No messages yet.</p>
          ) : (
            <ul className="messages">
              {messages.map((entry, index) => (
                <li key={`${entry.timestamp}-${index}`} className="message">
                  <div className="message__meta">
                    <strong>{entry.sender}</strong> → <span>{entry.recipient}</span>
                    <span className="message__time">{entry.timestamp}</span>
                  </div>
                  <p>{entry.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
