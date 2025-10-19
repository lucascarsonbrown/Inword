import React, { createContext, useContext, useState, ReactNode } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface Insight {
  date: string;
  entry: string;
  reflection: string;
  rating: number;
  chatMessages?: ChatMessage[];
}

interface AppContextType {
  latestInsight: Insight | null;
  setLatestInsight: (insight: Insight | null) => void;
  addChatMessage: (message: ChatMessage) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [latestInsight, setLatestInsight] = useState<Insight | null>(null);

  const addChatMessage = (message: ChatMessage) => {
    if (latestInsight) {
      setLatestInsight({
        ...latestInsight,
        chatMessages: [...(latestInsight.chatMessages || []), message],
      });
    }
  };

  return (
    <AppContext.Provider value={{ latestInsight, setLatestInsight, addChatMessage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
