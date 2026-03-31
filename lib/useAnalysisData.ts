import { useEffect, useState } from 'react';
import { useOffice } from './OfficeContext';
import { safeJsonParse } from './utils';

interface AnalysisData {
    strategy?: any;
    market?: any;
    financial?: any;
    productPlan?: any;
}

interface OnboardingData {
    projectName?: string;
    problemStatement?: string;
    targetAudience?: string;
    primaryGoal?: string;
    timeline?: string;
    resources?: string;
    industry?: string;
    valueProposition?: string;
    challenges?: string;
}

export function useAnalysisData() {
    const { activeProject } = useOffice();
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);

        try {
            if (activeProject) {
                // If we have an active project, parse its fields
                const analysis: AnalysisData = {
                    strategy: safeJsonParse(activeProject.strategy),
                    market: safeJsonParse(activeProject.marketInsights),
                    financial: safeJsonParse(activeProject.budget),
                    productPlan: safeJsonParse(activeProject.productPlan),
                };
                setAnalysisData(analysis);

                // Construct onboarding data from project info if available
                const onboarding: OnboardingData = {
                    projectName: activeProject.name,
                    // These might be in the strategy/meta if we store them there later
                };
                setOnboardingData(onboarding);
            } else {
                // Fallback to localStorage for the initial onboarding flow
                const analysis = localStorage.getItem('projectAnalysis');
                const onboarding = localStorage.getItem('onboardingData');

                if (analysis) {
                    setAnalysisData(safeJsonParse(analysis));
                }

                if (onboarding) {
                    setOnboardingData(safeJsonParse(onboarding));
                }
            }
        } catch (error) {
            console.error('Failed to load analysis data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeProject]);

    return { analysis: analysisData, onboardingData, isLoading, isSyncing: isLoading };
}
