import { useState } from "react";
const steps = [
  "Bienvenue sur UInova ! Commence par créer ton premier projet.",
  "Découvre l’éditeur visuel, dépose des composants à droite.",
  "Teste le mode Preview live sur tous tes devices.",
  "Génère des interfaces avec l’assistant IA !"
];
export default function OnboardingCoach({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  return (
    <div className="onboarding-coach">
      <p>{steps[i]}</p>
      <button onClick={() => (i < steps.length - 1 ? setI(i + 1) : onDone())}>
        {i < steps.length - 1 ? "Suivant" : "Terminer"}
      </button>
    </div>
  );
}
