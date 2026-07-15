import { Toaster } from "sonner"
import AiChatbot from "./components/ai-chatbot"

import { useWidgetMetadata, type UseGristOptions } from "grist-widget-sdk"

export const GRIST_OPTIONS: UseGristOptions = {
  requiredAccess: "read table",
  suppressAlerts: ["section-not-linked"],
}

export const WIDGET_METADATA = {
  title: "Ask AI",
  description: "Ask AI questions about your Grist data.",
} as const

export default function App() {
  useWidgetMetadata(WIDGET_METADATA)

  return (
    <div className="h-svh w-full overflow-hidden">
      <AiChatbot />
      <Toaster />
    </div>
  )
}
