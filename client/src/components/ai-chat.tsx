import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Plus, Loader2, ChevronDown, Sparkles, User } from "lucide-react";
import type { Conversation, Message } from "@shared/schema";

interface AiChatProps {
  module: string;
  title: string;
  description: string;
}

export function AiChat({ module, title, description }: AiChatProps) {
  const queryClient = useQueryClient();
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/chat", module, "conversations"],
  });

  const { data: messagesData = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/conversations", activeConv, "messages"],
    enabled: !!activeConv,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesData]);

  const createConv = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/chat/${module}/conversations`, { title: "Новый разговор" });
      return res.json();
    },
    onSuccess: (conv: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", module, "conversations"] });
      setActiveConv(conv.id);
      setIsOpen(true);
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/chat/conversations/${activeConv}/messages`, { content, module });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations", activeConv, "messages"] });
      setInput("");
    },
  });

  const handleSend = () => {
    if (!input.trim() || !activeConv || sendMessage.isPending) return;
    sendMessage.mutate(input.trim());
  };

  const handleNewChat = () => {
    createConv.mutate();
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Chat header — always visible */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="text-chat-title"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversations.length > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {conversations.length} чатов
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Expandable chat area */}
      {isOpen && (
        <div className="flex flex-col" style={{ height: 480 }}>
          <div className="border-t border-border/40" />

          {!activeConv ? (
            /* Start screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
              <p className="text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
                {conversations.length > 0
                  ? "Продолжите существующий разговор или начните новый"
                  : "Задайте любой вопрос — ИИ-помощник готов помочь"}
              </p>

              {conversations.length > 0 && (
                <div className="w-full max-w-xs space-y-1.5 mb-4">
                  {conversations.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveConv(c.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary text-sm text-foreground font-medium transition-colors flex items-center gap-2"
                      data-testid={`button-conv-${c.id}`}
                    >
                      <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </button>
                  ))}
                </div>
              )}

              <Button
                onClick={handleNewChat}
                disabled={createConv.isPending}
                className="bg-gradient-to-r from-primary to-emerald-600 text-white shadow-sm"
                data-testid="button-start-chat"
              >
                {createConv.isPending
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Plus className="w-4 h-4 mr-2" />}
                Начать разговор
              </Button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-secondary/20">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {conversations.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveConv(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        activeConv === c.id
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                      data-testid={`button-conv-${c.id}`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleNewChat}
                  disabled={createConv.isPending}
                  className="ml-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                  title="Новый чат"
                  data-testid="button-new-chat"
                >
                  {createConv.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                {messagesData.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">Напишите вопрос и нажмите отправить</p>
                  </div>
                )}
                {messagesData.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm"
                      }`}
                      data-testid={`text-message-${msg.id}`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {sendMessage.isPending && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border/40 flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите вопрос..."
                  className="min-h-[40px] max-h-[100px] resize-none text-sm flex-1 bg-secondary/50 border-border/50 focus:border-primary/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMessage.isPending}
                  size="icon"
                  className="h-10 w-10 bg-primary hover:bg-primary/90 shrink-0"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
