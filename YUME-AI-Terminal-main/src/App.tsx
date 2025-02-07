import React, { useState, useEffect } from 'react';
import { Send, User, Plus, LogIn, Github, Copy, Check, Menu, X, Rainbow } from 'lucide-react';
import { supabase } from './lib/supabase';
import { generateAIResponse } from './lib/ai-service';
import { Message, Conversation } from './types';
import { DexscreenerIcon } from './components/DexscreenerIcon';
import { DiscordIcon } from './components/DiscordIcon';
import { YUMELogo } from './components/YUMELogo';

function App() {
  const [messages, setMessages] = useState<(Message & { tempId?: string })[]>([]);
  const [input, setInput] = useState('');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const socialLinks = [
    {
      icon: <DiscordIcon className="w-4 h-4" />,
      url: '',
      label: 'Discord'
    },
    {
      icon: <Github className="w-4 h-4" />,
      url: 'https://github.com/YUMEinfrastructure',
      label: 'GitHub'
    },
    {
      icon: <DexscreenerIcon className="w-4 h-4" />,
      url: 'https://dexscreener.com/',
      label: 'Dexscreener'
    }
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadConversations();
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setMessages([]);
        setCurrentConversationId(null);
        setConversations([]);
      } else {
        loadConversations();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadConversations = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    const conversationMap = new Map<string, { created_at: string; last_message: string }>();
    data.forEach((message) => {
      if (message.conversation_id && !conversationMap.has(message.conversation_id)) {
        conversationMap.set(message.conversation_id, {
          created_at: message.created_at,
          last_message: message.content
        });
      }
    });

    const formattedConversations: Conversation[] = Array.from(conversationMap.entries()).map(
      ([id, { created_at, last_message }]) => ({
        id,
        created_at,
        user_id: session.user.id,
        last_message: last_message.slice(0, 60) + (last_message.length > 60 ? '...' : '')
      })
    );

    setConversations(formattedConversations);
  };

  const createNewConversation = async () => {
    if (!session) return null;
    
    const newConversationId = crypto.randomUUID();
    setCurrentConversationId(newConversationId);
    setMessages([]);
    setIsSidebarOpen(false);
    return newConversationId;
  };

  const selectConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setIsSidebarOpen(false);
    await loadMessages(conversationId);
  };

  useEffect(() => {
    if (session && currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [session, currentConversationId]);

  const loadMessages = async (conversationId: string) => {
    if (!session) return;
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const handleNewChat = async () => {
    await createNewConversation();
    setInput('');
    setIsGenerating(false);
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session || isGenerating) return;

    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    const tempUserMessageId = `temp-${Date.now()}-user`;
    const userMessage = { 
      role: 'user' as const, 
      content: input,
      tempId: tempUserMessageId,
      conversation_id: conversationId
    };
    setInput('');
    
    try {
      const { error: userError } = await supabase
        .from('messages')
        .insert([{ 
          role: userMessage.role, 
          content: userMessage.content, 
          user_id: session.user.id,
          conversation_id: conversationId
        }]);

      if (userError) throw userError;

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      
      setIsGenerating(true);
      const aiResponseContent = await generateAIResponse(updatedMessages);
      
      const tempAiMessageId = `temp-${Date.now()}-ai`;
      const aiMessage = {
        role: 'assistant' as const,
        content: aiResponseContent,
        tempId: tempAiMessageId,
        conversation_id: conversationId
      };

      const { error: aiError } = await supabase
        .from('messages')
        .insert([{ 
          role: aiMessage.role, 
          content: aiMessage.content, 
          user_id: session.user.id,
          conversation_id: conversationId
        }]);

      if (aiError) throw aiError;

      setMessages([...updatedMessages, aiMessage]);
      loadConversations();
    } catch (error) {
      console.error('Error saving messages:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setAuthError(error.message);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          username: email.split('@')[0],
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setAuthError('This email is already registered. Please log in instead.');
      } else {
        setAuthError(error.message);
      }
    } else {
      setEmail('');
      setPassword('');
      setAuthError('Successfully signed up! You can now log in.');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);
    setMessages([]);
    setCurrentConversationId(null);
    setConversations([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbfd]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8e44ad]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#fbfbfd]">
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1701213327963-742e60631b75?auto=format&fit=crop&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#fbfbfd]/90 to-[#fbfbfd]/60 backdrop-blur-xl"></div>
      </div>

      <div className="relative z-10">
        <nav className="backdrop-blur-xl bg-[#fbfbfd]/50 fixed top-0 w-full border-b border-[#86868b]/10 z-50">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {session && (
                <>
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="flex items-center space-x-2 text-sm font-medium text-[#1d1d1f] hover:text-[#8e44ad] transition-colors md:hidden"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleNewChat}
                    className="flex items-center space-x-2 text-sm font-medium text-[#1d1d1f] hover:text-[#8e44ad] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Chat</span>
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1d1d1f] hover:text-[#8e44ad] transition-colors"
                  aria-label={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>
            <div>
              {session ? (
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-[#8e44ad] hover:text-[#9b59b6] transition-colors"
                >
                  Logout
                </button>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setAuthError('')}
                    className="flex items-center space-x-2 text-sm font-medium text-[#1d1d1f] hover:text-[#8e44ad] transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </button>
                  <button
                    onClick={() => setAuthError('')}
                    className="text-sm font-medium text-[#8e44ad] hover:text-[#9b59b6] transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {session && (
          <div
            className={`fixed inset-y-0 left-0 w-64 bg-white/80 backdrop-blur-xl transform transition-transform duration-300 ease-in-out z-40 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0 border-r border-[#86868b]/10`}
          >
            <div className="h-full pt-16 flex flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id)}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      currentConversationId === conversation.id
                        ? 'bg-[#8e44ad]/10 text-[#8e44ad]'
                        : 'hover:bg-[#8e44ad]/5 text-[#1d1d1f]'
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{conversation.last_message}</p>
                    <p className="text-xs text-[#86868b] mt-1">
                      {formatDate(conversation.created_at)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-3 right-3 p-2 text-[#86868b] hover:text-[#8e44ad] md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <main className={`pt-12 pb-24 transition-all duration-300 ${session ? 'md:pl-64' : ''}`}>
          <div className="max-w-3xl mx-auto px-4">
            {!session ? (
              <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#ff1b6b] via-[#45caff] to-[#ff1b6b] rounded-[22px] flex items-center justify-center mb-6 shadow-lg">
                  <YUMELogo className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-5xl font-semibold text-[#1d1d1f] mb-3">
                  Welcome to YUMEAI
                </h1>
                <p className="text-[#86868b] text-xl max-w-md mb-8">
                  Sign in to start chatting with AI.
                </p>
                <div className="w-full max-w-sm">
                  {authError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                      {authError}
                    </div>
                  )}
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-4 py-3 rounded-xl border border-[#86868b]/20 bg-white/60 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[#8e44ad] transition-all"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-4 py-3 rounded-xl border border-[#86868b]/20 bg-white/60 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[#8e44ad] transition-all"
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleLogin}
                        className="flex-1 px-6 py-3 bg-[#8e44ad] text-white rounded-xl hover:bg-[#9b59b6] transition-colors font-medium"
                      >
                        Login
                      </button>
                      <button
                        onClick={handleSignUp}
                        className="flex-1 px-6 py-3 border border-[#8e44ad] text-[#8e44ad] rounded-xl hover:bg-[#8e44ad]/5 transition-colors font-medium"
                      >
                        Sign Up
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#ff1b6b] via-[#45caff] to-[#ff1b6b] rounded-[22px] flex items-center justify-center mb-6 shadow-lg">
                  <Rainbow className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>
                <h1 className="text-5xl font-semibold text-[#1d1d1f] mb-3">
                  Start a New Chat
                </h1>
                <p className="text-[#86868b] text-xl max-w-md">
                  Ask me anything. I'm designed to help you with any question or task you have in mind.
                  Please keep in mind that I need time to respond.
                </p>
              </div>
            ) : (
              <div className="space-y-6 py-8">
                {messages.map((message) => (
                  <div
                    key={message.id || message.tempId}
                    className={`flex items-start space-x-4 ${
                      message.role === 'assistant' 
                        ? 'bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg shadow-black/5 border border-[#86868b]/10 group' 
                        : 'px-6'
                    }`}
                  >
                    <div className={`shrink-0 ${
                      message.role === 'assistant' 
                        ? 'bg-gradient-to-r from-[#ff1b6b] via-[#45caff] to-[#ff1b6b]'
                        : 'bg-[#1d1d1f]'
                    } rounded-xl p-2 shadow-lg`}>
                      {message.role === 'assistant' ? (
                        <Rainbow className="w-5 h-5 text-white" strokeWidth={1.5} />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start">
                        <p className="text-[#1d1d1f] leading-relaxed">{message.content}</p>
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => handleCopyMessage(message.content, message.id || message.tempId || '')}
                            className="ml-4 p-2 text-[#86868b] hover:text-[#8e44ad] transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Copy message"
                          >
                            {copiedMessageId === (message.id || message.tempId) ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex items-center space-x-2 px-6">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8e44ad]"></div>
                    <span className="text-[#86868b]">Generating response...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {session && (
          <div className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#fbfbfd] via-[#fbfbfd] to-transparent pt-10 transition-all duration-300 ${session ? 'md:pl-64' : ''}`}>
            <div className="max-w-3xl mx-auto px-4 pb-6">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message"
                  className="w-full bg-white/70 backdrop-blur-lg rounded-xl border border-[#86868b]/20 px-6 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#8e44ad] shadow-lg shadow-black/5 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isGenerating}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[#86868b] hover:text-[#8e44ad] disabled:opacity-50 disabled:hover:text-[#86868b] transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;