import { Toaster } from "sonner"
import AiChatbot from "@/components/ai-chatbot"
import { TooltipProvider } from "@/components/ui/tooltip"

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

  // The chat's buttons show tooltips, which need a TooltipProvider above them.
  return (
    <TooltipProvider>
      <div className="h-svh w-full overflow-hidden">
        <AiChatbot />
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
