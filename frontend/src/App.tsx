import { useState } from "react";
import type { AppStep, UserInput, WorkoutData } from "./types";
import { generateWorkout } from "./api";
import Step1Goal from "./components/Step1Goal";
import Step2Constraints from "./components/Step2Constraints";
import Step3AhaMoment from "./components/Step3AhaMoment";
import Step4FakeDoor from "./components/Step4FakeDoor";
import "./App.css";

export default function App() {
  const [step, setStep] = useState<AppStep>(1);
  const [userInput, setUserInput] = useState<Partial<UserInput>>({});
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoalNext = (goal: string) => {
    setUserInput({ goal });
    setStep(2);
  };

  const handleConstraintsNext = async (
    daysPerWeek: number,
    energyLevel: UserInput["energyLevel"]
  ) => {
    const input: UserInput = {
      goal: userInput.goal!,
      daysPerWeek,
      energyLevel,
    };
    setUserInput(input);
    setStep(3);
    setIsLoading(true);
    setError(null);
    setWorkoutData(null);

    try {
      const data = await generateWorkout(input);
      setWorkoutData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (userInput.goal && userInput.daysPerWeek && userInput.energyLevel) {
      handleConstraintsNext(userInput.daysPerWeek, userInput.energyLevel);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          SyncMotion<span className="logo-dot">.</span>
        </div>
      </header>

      <main className="app-main">
        {step === 1 && <Step1Goal onNext={handleGoalNext} />}

        {step === 2 && (
          <Step2Constraints
            onNext={handleConstraintsNext}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3AhaMoment
            workoutData={workoutData}
            isLoading={isLoading}
            error={error}
            onNext={() => setStep(4)}
            onRetry={handleRetry}
          />
        )}

        {step === 4 && workoutData && (
          <Step4FakeDoor
            workoutData={workoutData}
            userGoal={userInput.goal!}
          />
        )}
      </main>
    </div>
  );
}
