import { AiPanel } from "@/components/shared/ai-panel";

export function StudyAdvisor({ aiEnabled }: { aiEnabled: boolean }) {
  return (
    <AiPanel
      endpoint="/api/ai/study-advice"
      title="Od czego zacząć naukę?"
      description="AI przeanalizuje Twoje terminy z najbliższych 30 dni i zaproponuje kolejność."
      buttonLabel="Zaproponuj kolejność"
      aiEnabled={aiEnabled}
    />
  );
}
