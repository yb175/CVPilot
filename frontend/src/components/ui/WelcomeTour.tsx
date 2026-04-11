import { useState, useEffect } from 'react';
import { Button } from './Button';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface WelcomeTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  storageKey?: string;
}

export function WelcomeTour({ steps, onComplete, storageKey = 'cvpilot_tour_completed' }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetPos, setTargetPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    try {
      const completed = localStorage.getItem(storageKey);
      if (!completed && steps.length > 0) {
        // Delay showing tour until page is fully loaded
        setTimeout(() => setIsVisible(true), 1000);
      }
    } catch (err) {
      console.error('Failed to check tour completion:', err);
      // Proceed with tour even if localStorage fails
      if (steps.length > 0) {
        setTimeout(() => setIsVisible(true), 1000);
      }
    }
  }, [storageKey, steps]);

  useEffect(() => {
    if (!isVisible || currentStep >= steps.length) return;

    const updatePosition = () => {
      try {
        const target = steps[currentStep]?.target;
        if (!target || typeof target !== 'string' || target.trim() === '') {
          console.warn('Invalid tour target:', target);
          return;
        }

        const element = document.querySelector(target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetPos({
            top: rect.top + window.scrollY - 10,
            left: rect.left + window.scrollX - 10,
          });
        }
      } catch (err) {
        console.error('Failed to find tour target element:', err);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep, isVisible, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (err) {
      console.error('Failed to save tour completion:', err);
      // Still proceed if localStorage fails
    }
    onComplete?.();
  };

  if (!isVisible || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const positionClass = step.position === 'top' ? 'bottom-full mb-4' : 'top-full mt-4';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 pointer-events-none" />

      {/* Tooltip */}
      <div
        className={`fixed z-50 max-w-xs bg-bg-surface border border-border-normal rounded-lg shadow-xl p-4 animate-fade-in ${positionClass}`}
        style={{ top: `${targetPos.top}px`, left: `${targetPos.left}px` }}
      >
        <h3 className="text-sm font-semibold text-text-primary mb-1">{step.title}</h3>
        <p className="text-xs text-text-secondary mb-4">{step.description}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-text-tertiary">
            {currentStep + 1} of {steps.length}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep((prev) => prev - 1)}>
                Back
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
