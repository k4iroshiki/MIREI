// pages/ChatPage.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import useChat from '../../hooks/useChat';
import { useApp } from '../../App';
import ChatWindow from '../../components/chat/ChatWindow';
import ChatInput from '../../components/chat/ChatInput';
import ChatHistoryPanel from '../../components/chat/ChatHistoryPanel';
import WelcomeScreen from '../../components/chat/WelcomeScreen';
import Live2DCanvas from '../../components/live2d/Live2DCanvas';
import { FlowerIcon, ClockIcon, PlusIcon, TrashIcon } from '../../components/common/Icon';
import '../../styles/chat.css';

const MIREI = {
  id: 'mirei_001',
  name: 'Mirei',
  avatar: '/assets/mirei-avatar.png',
  greeting: 'Halo! Aku Mirei, asisten virtualmu. Ada yang bisa aku bantu hari ini?'
};

// ── Emotion detection (diperkuat) ─────────────────────────────
const detectEmotion = (messages) => {
  if (!messages || messages.length === 0) return 'neutral';

  // Prioritaskan respons AI terbaru
  const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const aiText   = (lastAI?.content  || '').toLowerCase();
  const userText = (lastUser?.content || '').toLowerCase();
  const combined = aiText + ' ' + userText;

  if (/haha|wkwk|lol|ngakak|lucu|😂|😄|kocak/.test(combined))           return 'laugh';
  if (/makasih|terima kasih|thanks|senang|bahagia|😊|🥰|suka/.test(combined)) return 'happy';
  if (/sedih|nangis|kecewa|😢|💔|galau|patah hati/.test(combined))       return 'sad';
  if (/marah|kesal|benci|😠|😤|frustrasi/.test(combined))                return 'angry';
  if (/takut|khawatir|cemas|😰|😨|nervous/.test(combined))               return 'worried';
  if (/wow|keren|luar biasa|amazing|hebat|✨|🤩|kagum/.test(combined))   return 'amazed';
  if (/hmm|mikir|bingung|🤔|gimana ya|entah/.test(combined))             return 'thinking';
  return 'neutral';
};

const EMOTION_CFG = {
  neutral:  { emoji: '😌', label: 'Santai',      glow: '#a5b4fc', ring: '#8b5cf6' },
  happy:    { emoji: '😊', label: 'Senang',       glow: '#f9a8d4', ring: '#ec4899' },
  laugh:    { emoji: '😂', label: 'Tertawa',      glow: '#fde68a', ring: '#f59e0b' },
  sad:      { emoji: '😢', label: 'Sedih',        glow: '#93c5fd', ring: '#3b82f6' },
  angry:    { emoji: '😠', label: 'Kesal',        glow: '#fca5a5', ring: '#ef4444' },
  worried:  { emoji: '😰', label: 'Khawatir',     glow: '#6ee7b7', ring: '#10b981' },
  amazed:   { emoji: '🤩', label: 'Terkagum',     glow: '#c4b5fd', ring: '#7c3aed' },
  thinking: { emoji: '🤔', label: 'Berpikir',     glow: '#d1d5db', ring: '#9ca3af' },
};

// ── Live2D Panel ───────────────────────────────────────────────
const Live2DPanel = ({ emotion, isLoading, lastAIMessage, hasMessages }) => {
  const cfg = EMOTION_CFG[emotion] || EMOTION_CFG.neutral;
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const typingRef = useRef(null);

  // Typewriter effect untuk respons terakhir MIREI
  useEffect(() => {
    if (!lastAIMessage) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }
    // Potong teks agar tidak terlalu panjang di panel
    const short = lastAIMessage.length > 120
      ? lastAIMessage.slice(0, 120) + '…'
      : lastAIMessage;

    setIsTyping(true);
    setDisplayedText('');
    let i = 0;
    clearInterval(typingRef.current);
    typingRef.current = setInterval(() => {
      i++;
      setDisplayedText(short.slice(0, i));
      if (i >= short.length) {
        clearInterval(typingRef.current);
        setIsTyping(false);
      }
    }, 18);
    return () => clearInterval(typingRef.current);
  }, [lastAIMessage]);

  return (
    <div style={{
      width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.025)',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-40px', right: '-40px',
        width: '200px', height: '200px', borderRadius: '50%',
        background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
        opacity: 0.12, pointerEvents: 'none', transition: 'background 0.6s ease',
      }} />

      {/* Live2D Canvas Container */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
      }}>
        <div style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(236,72,153,0.08) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${cfg.glow}15`,
          transition: 'all 0.5s ease',
        }}>
          {/* Subtle glow effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: `radial-gradient(circle at 50% 30%, ${cfg.glow}12 0%, transparent 60%)`,
            pointerEvents: 'none',
            transition: 'background 0.5s ease',
          }} />
          
          <Live2DCanvas
            emotion={emotion}
            isLoading={isLoading}
            width={240}
            height={380}
          />
        </div>
      </div>

      {/* Speech bubble — respons terakhir MIREI atau kosong jika belum ada chat */}
      {hasMessages && (
        <div style={{ flex: 1, padding: '0 16px 16px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${cfg.ring}25`,
            borderRadius: '12px', padding: '12px 14px',
            minHeight: '72px', position: 'relative',
            transition: 'border-color 0.5s ease',
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', height: '24px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: cfg.glow,
                    animation: `typingDot 1.2s ${i * 0.2}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
            ) : displayedText ? (
              <>
                <p style={{
                  fontSize: '12px', color: 'var(--t2)', lineHeight: '1.6',
                  margin: 0, whiteSpace: 'pre-wrap',
                }}>
                  {displayedText}
                  {isTyping && (
                    <span style={{
                      display: 'inline-block', width: '2px', height: '13px',
                      background: cfg.glow, marginLeft: '2px', verticalAlign: 'middle',
                      animation: 'cursorBlink 0.7s infinite',
                    }} />
                  )}
                </p>
              </>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0, fontStyle: 'italic' }}>
                Menunggu respons...
              </p>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

// ── ChatPage ───────────────────────────────────────────────────
const WELCOME_KEY = 'mirei_welcome_shown';

const ChatPage = () => {
  const { messages, sendMessage, isLoading, clearChat, newChat, loadSession } = useChat(MIREI);
  const { activePage, notifyChatMessage, user } = useApp();
  const emotion = useMemo(() => detectEmotion(messages), [messages]);

  // Ambil respons terakhir MIREI untuk ditampilkan di panel
  const lastAIMessage = useMemo(() => {
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    return last?.content || '';
  }, [messages]);
  
  // Cek apakah ada pesan (untuk menampilkan/menyembunyikan panel chat)
  const hasMessages = messages.length > 0;
  
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const prevLengthRef = useRef(messages.length);

  // Tampilkan welcome hanya jika:
  // 1. sessionStorage belum punya flag (tab baru / browser ditutup)
  // 2. user baru login/logout (user id berubah)
  const [showWelcome, setShowWelcome] = useState(() => {
    const shownForUser = sessionStorage.getItem(WELCOME_KEY);
    // Belum pernah ditampilkan di sesi tab ini
    if (!shownForUser) return true;
    // User berbeda (logout → login akun lain)
    if (shownForUser !== String(user?.id)) return true;
    return false;
  });

  const lastUserRef = useRef(user?.id);

  // Reset welcome saat user logout/login akun berbeda
  useEffect(() => {
    if (user?.id !== lastUserRef.current) {
      sessionStorage.removeItem(WELCOME_KEY);
      setShowWelcome(true);
      lastUserRef.current = user?.id;
    }
  }, [user?.id]);

  // Tandai welcome sudah ditampilkan di sesi ini
  useEffect(() => {
    if (showWelcome && user?.id) {
      sessionStorage.setItem(WELCOME_KEY, String(user.id));
    }
  }, [showWelcome, user?.id]);

  // Track berapa kali halaman chat aktif → untuk reset animasi welcome
  const [welcomeKey, setWelcomeKey] = useState(0);
  const wasActiveRef = useRef(activePage === 'chat');

  useEffect(() => {
    const isNowActive = activePage === 'chat';
    if (isNowActive && !wasActiveRef.current) {
      setWelcomeKey(k => k + 1);
    }
    wasActiveRef.current = isNowActive;
  }, [activePage]);

  // Detect new AI messages and notify sidebar
  useEffect(() => {
    const prev = prevLengthRef.current;
    const curr = messages.length;
    if (curr > prev) {
      const lastMsg = messages[curr - 1];
      if (lastMsg?.role === 'assistant' && activePage !== 'chat') {
        notifyChatMessage?.();
      }
    }
    prevLengthRef.current = curr;
  }, [messages, activePage, notifyChatMessage]);

  const handleViewHistory = () => {
    setHistoryPanelOpen(true);
  };

  const handleNewChat = () => {
    newChat();
    setShowWelcome(false); // Langsung ke chat area kosong
  };

  const handleSelectChat = (chat) => {
    loadSession(chat.id);
    setShowWelcome(false);
    setHistoryPanelOpen(false);
  };

  const handleWelcomeStart = (firstMessage) => {
    setShowWelcome(false);
    sendMessage(firstMessage);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat History Panel */}
      <ChatHistoryPanel
        isOpen={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        onSelectChat={handleSelectChat}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="chat-topbar">
          {/* Kiri — action buttons dengan expand on hover */}
          <div className="chat-topbar-left">
            <button className="chat-topbar-btn" onClick={handleViewHistory}>
              <ClockIcon size={15} />
              <span className="chat-topbar-btn-label">Riwayat</span>
            </button>
            <button className="chat-topbar-btn" onClick={handleNewChat}>
              <PlusIcon size={15} />
              <span className="chat-topbar-btn-label">Chat Baru</span>
            </button>
            <button className="chat-topbar-btn chat-topbar-btn-danger" onClick={clearChat}>
              <TrashIcon size={15} />
              <span className="chat-topbar-btn-label">Hapus</span>
            </button>
          </div>

          {/* Kanan — Mirei identity */}
          <div className="chat-topbar-right">
            <div className="chat-topbar-identity">
              <span className="chat-topbar-name">{MIREI.name}</span>
              <div className="chat-topbar-avatar">
                <FlowerIcon size={16} color="#fff" />
              </div>
            </div>
          </div>
        </div>

        {showWelcome ? (
          <WelcomeScreen key={welcomeKey} username={user?.username} onStart={handleWelcomeStart} active={activePage === 'chat'} />
        ) : (
          <>
            <ChatWindow messages={messages} isLoading={isLoading} character={MIREI} />
            <ChatInput onSend={sendMessage} disabled={isLoading} placeholder={`Kirim pesan ke ${MIREI.name}...`} />
          </>
        )}
      </div>

      {/* Live2D panel */}
      <Live2DPanel emotion={emotion} isLoading={isLoading} lastAIMessage={lastAIMessage} hasMessages={hasMessages} />
    </div>
  );
};

export default ChatPage;