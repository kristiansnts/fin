import Image from "next/image";
import Link from "next/link";

interface WelcomeScreenProps {
  apiKey: string;
  handleSend: (prompt: string) => void
}

const EXAMPLE_PROMPT = "What's on my schedule for today?";

export function WelcomeScreen({ apiKey, handleSend }: WelcomeScreenProps) {
  // Always show the welcome screen to establish purpose and identity

  return (<>
    <div className="flex flex-col items-center text-center p-4">
      {/* 
      <Image
        src="/langchain.png"
        alt="Fin AI Logo"
        width={80}
        height={80}
        className="mb-6 rounded-2xl"
        priority
      />
      */}
      <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl mb-6 flex items-center justify-center shadow-lg">
        <span className="text-4xl text-white font-bold">F</span>
      </div>

      <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-3">
        Welcome to Fin AI
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-md text-lg leading-relaxed">
        Your personal AI assistant designed to help you organize your life, manage schedules, and find information quickly and securely.
      </p>

      <div className="mt-8 flex gap-4 text-sm text-gray-500">
        <Link href="/privacy-policy" className="hover:text-blue-600 underline">Privacy Policy</Link>
        <span>•</span>
        <Link href="/terms-of-service" className="hover:text-blue-600 underline">Terms of Service</Link>
      </div>
    </div>
  </>)
}
