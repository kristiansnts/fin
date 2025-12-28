"use client";

import { useState } from "react";
import Link from "next/link";
import ChatInterface from "./components/ChatInterface";

export default function Home() {
  const [apiKey, setApiKey] = useState<string>("");

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black font-sans">
      <header className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-black z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Fin AI</h1>
        </div>
        <nav className="flex gap-4">
          <Link href="/privacy-policy" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300">Privacy</Link>
          <Link href="/terms-of-service" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300">Terms</Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <ChatInterface apiKey={apiKey} />
      </main>
    </div>
  );
}
