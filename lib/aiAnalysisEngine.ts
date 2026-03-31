interface OnboardingData {
    projectName: string;
    problemStatement: string;
    targetAudience: string;
    primaryGoal: string;
    timeline: string;
    resources: string;
    industry: string;
    valueProposition: string;
    challenges: string;
}

interface StrategyPlan {
    mission: string;
    vision: string;
    objectives: string[];
    roadmap: RoadmapItem[];
    actionItems: ActionItem[];
}

interface RoadmapItem {
    quarter: string;
    milestones: string[];
}

interface ActionItem {
    title: string;
    priority: 'High' | 'Medium' | 'Low';
    timeline: string;
}

interface CompetitorAnalysis {
    name: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
}

interface MarketIntelligence {
    competitors: CompetitorAnalysis[];
    marketTrends: string[];
    opportunities: string[];
    threats: string[];
    strengths: string[];
    weaknesses: string[];
}

interface FinancialAnalysis {
    expenses: ExpenseBreakdown;
    revenue: RevenueProjection;
    scalingAnalysis: ScalingAnalysis;
    metrics: FinancialMetrics;
}

interface ExpenseBreakdown {
    startup: ExpenseItem[];
    monthly: ExpenseItem[];
    total: number;
}

interface ExpenseItem {
    category: string;
    amount: number;
    description: string;
}

interface RevenueProjection {
    year1: number;
    year2: number;
    year3: number;
    breakEvenMonth: number;
}

interface ScalingAnalysis {
    score: number;
    stages: ScalingStage[];
    capitalRequirements: CapitalRequirement[];
}

interface ScalingStage {
    name: string;
    userRange: string;
    requirements: string[];
}

interface CapitalRequirement {
    stage: string;
    amount: number;
    purpose: string;
}

interface FinancialMetrics {
    burnRate: number;
    runway: number;
    cac: number;
    ltv: number;
    grossMargin: number;
}

interface AnalysisResult {
    strategy: StrategyPlan;
    market: MarketIntelligence;
    financial: FinancialAnalysis;
}

export class AIAnalysisEngine {
    private apiUrl: string = '/api/chat';

    async analyzeProject(data: OnboardingData): Promise<AnalysisResult> {
        try {
            // Run all analyses in parallel for faster processing
            const [strategy, market, financial] = await Promise.all([
                this.generateStrategy(data),
                this.conductMarketResearch(data),
                this.generateFinancials(data)
            ]);

            return { strategy, market, financial };
        } catch (error) {
            console.error('Analysis failed:', error);
            throw new Error('Failed to analyze project. Please try again.');
        }
    }

    private async generateStrategy(data: OnboardingData): Promise<StrategyPlan> {
        const prompt = `Based on the following project information, generate a comprehensive strategic plan:

Project: ${data.projectName}
Problem: ${data.problemStatement}
Target Audience: ${data.targetAudience}
Primary Goal: ${data.primaryGoal}
Timeline: ${data.timeline}
Resources: ${data.resources}
Industry: ${data.industry}
Value Proposition: ${data.valueProposition}
Challenges: ${data.challenges}

Generate a strategic plan in JSON format with:
1. Mission statement (1-2 sentences)
2. Vision statement (1-2 sentences)
3. 5 core strategic objectives
4. Quarterly roadmap for the next 4 quarters with specific milestones
5. 8-10 prioritized action items with timelines

Format as JSON with keys: mission, vision, objectives (array), roadmap (array of {quarter, milestones}), actionItems (array of {title, priority, timeline})`;

        const response = await this.callAI(prompt);
        return this.parseStrategyResponse(response);
    }

    private async conductMarketResearch(data: OnboardingData): Promise<MarketIntelligence> {
        const prompt = `Research and analyze the market for the following project:

Project: ${data.projectName}
Industry: ${data.industry}
Target Market: ${data.targetAudience}
Value Proposition: ${data.valueProposition}

Provide comprehensive market intelligence in JSON format:
1. Top 5-7 competitors with SWOT analysis for each
2. 5-7 key market trends
3. 5 market opportunities
4. 5 potential threats
5. 5 project strengths (areas of resilience)
6. 5 project weaknesses (vulnerable areas)

Format as JSON with keys: competitors (array of {name, strengths, weaknesses, opportunities, threats}), marketTrends (array), opportunities (array), threats (array), strengths (array), weaknesses (array)`;

        const response = await this.callAI(prompt);
        return this.parseMarketResponse(response);
    }

    private async generateFinancials(data: OnboardingData): Promise<FinancialAnalysis> {
        const prompt = `Generate detailed financial projections for:

Project: ${data.projectName}
Industry: ${data.industry}
Resources: ${data.resources}
Timeline: ${data.timeline}
Primary Goal: ${data.primaryGoal}

Provide financial analysis in JSON format:
1. Startup expenses breakdown (5-8 categories with amounts)
2. Monthly operational expenses (5-8 categories with amounts)
3. Revenue projections for years 1, 2, and 3
4. Break-even analysis (month number)
5. Scaling analysis:
   - Scalability score (1-10)
   - 4 scaling stages with user ranges and requirements
   - Capital requirements for each stage
6. Key financial metrics:
   - Monthly burn rate
   - Runway (months)
   - Customer Acquisition Cost (CAC)
   - Lifetime Value (LTV)
   - Gross margin percentage

Format as JSON with keys: expenses {startup, monthly, total}, revenue {year1, year2, year3, breakEvenMonth}, scalingAnalysis {score, stages, capitalRequirements}, metrics {burnRate, runway, cac, ltv, grossMargin}`;

        const response = await this.callAI(prompt);
        return this.parseFinancialResponse(response);
    }

    private async callAI(prompt: string): Promise<string> {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: prompt,
                    role: 'ceo' // Use CEO role for strategic analysis
                }),
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.response || '';
        } catch (error) {
            console.error('AI API call failed:', error);
            throw error;
        }
    }

    private parseStrategyResponse(response: string): StrategyPlan {
        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // Fallback: create structured response from text
            return {
                mission: this.extractSection(response, 'mission') || 'To deliver innovative solutions that solve real problems.',
                vision: this.extractSection(response, 'vision') || 'To become a leader in our industry.',
                objectives: this.extractList(response, 'objective') || [
                    'Achieve product-market fit',
                    'Build a strong team',
                    'Establish market presence',
                    'Generate sustainable revenue',
                    'Scale operations efficiently'
                ],
                roadmap: [
                    { quarter: 'Q1', milestones: ['MVP Development', 'Initial Testing'] },
                    { quarter: 'Q2', milestones: ['Beta Launch', 'User Feedback'] },
                    { quarter: 'Q3', milestones: ['Full Launch', 'Marketing Campaign'] },
                    { quarter: 'Q4', milestones: ['Scale Operations', 'Expand Features'] }
                ],
                actionItems: [
                    { title: 'Complete MVP', priority: 'High', timeline: '3 months' },
                    { title: 'Hire key team members', priority: 'High', timeline: '2 months' },
                    { title: 'Develop marketing strategy', priority: 'Medium', timeline: '1 month' },
                    { title: 'Secure initial funding', priority: 'High', timeline: '2 months' },
                    { title: 'Build partnerships', priority: 'Medium', timeline: '4 months' }
                ]
            };
        } catch (error) {
            console.error('Failed to parse strategy response:', error);
            throw error;
        }
    }

    private parseMarketResponse(response: string): MarketIntelligence {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // Fallback
            return {
                competitors: [
                    {
                        name: 'Competitor A',
                        strengths: ['Established brand', 'Large user base'],
                        weaknesses: ['Outdated technology', 'Poor UX'],
                        opportunities: ['Market expansion', 'New features'],
                        threats: ['New entrants', 'Changing regulations']
                    }
                ],
                marketTrends: [
                    'Increasing digital adoption',
                    'Focus on user experience',
                    'AI integration',
                    'Mobile-first approach',
                    'Sustainability concerns'
                ],
                opportunities: [
                    'Underserved market segment',
                    'Technology advancement',
                    'Partnership potential',
                    'Geographic expansion',
                    'Product diversification'
                ],
                threats: [
                    'Intense competition',
                    'Market saturation',
                    'Regulatory changes',
                    'Economic downturn',
                    'Technology disruption'
                ],
                strengths: [
                    'Innovative solution',
                    'Strong value proposition',
                    'Experienced team',
                    'Market timing',
                    'Scalable model'
                ],
                weaknesses: [
                    'Limited resources',
                    'Brand awareness',
                    'Market entry barriers',
                    'Technical challenges',
                    'Competition intensity'
                ]
            };
        } catch (error) {
            console.error('Failed to parse market response:', error);
            throw error;
        }
    }

    private parseFinancialResponse(response: string): FinancialAnalysis {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // Fallback
            return {
                expenses: {
                    startup: [
                        { category: 'Technology & Infrastructure', amount: 50000, description: 'Servers, software licenses' },
                        { category: 'Legal & Incorporation', amount: 10000, description: 'Business registration, IP' },
                        { category: 'Marketing & Branding', amount: 25000, description: 'Website, branding, initial campaigns' },
                        { category: 'Product Development', amount: 75000, description: 'MVP development costs' },
                        { category: 'Office & Equipment', amount: 15000, description: 'Workspace setup' }
                    ],
                    monthly: [
                        { category: 'Personnel', amount: 30000, description: 'Salaries and benefits' },
                        { category: 'Technology', amount: 5000, description: 'Cloud services, tools' },
                        { category: 'Marketing', amount: 10000, description: 'Advertising, content' },
                        { category: 'Operations', amount: 5000, description: 'Utilities, misc' }
                    ],
                    total: 175000
                },
                revenue: {
                    year1: 250000,
                    year2: 750000,
                    year3: 2000000,
                    breakEvenMonth: 18
                },
                scalingAnalysis: {
                    score: 7,
                    stages: [
                        { name: 'MVP Stage', userRange: '0-100', requirements: ['Core team', 'Basic infrastructure'] },
                        { name: 'Growth Stage', userRange: '100-1K', requirements: ['Expanded team', 'Marketing budget'] },
                        { name: 'Scale Stage', userRange: '1K-10K', requirements: ['Automation', 'Customer support'] },
                        { name: 'Enterprise Stage', userRange: '10K+', requirements: ['Full team', 'Advanced infrastructure'] }
                    ],
                    capitalRequirements: [
                        { stage: 'Seed', amount: 250000, purpose: 'MVP development' },
                        { stage: 'Series A', amount: 2000000, purpose: 'Market expansion' },
                        { stage: 'Series B', amount: 10000000, purpose: 'Scaling operations' }
                    ]
                },
                metrics: {
                    burnRate: 50000,
                    runway: 12,
                    cac: 150,
                    ltv: 1200,
                    grossMargin: 70
                }
            };
        } catch (error) {
            console.error('Failed to parse financial response:', error);
            throw error;
        }
    }

    private extractSection(text: string, keyword: string): string | null {
        const regex = new RegExp(`${keyword}[:\\s]+(.*?)(?=\\n\\n|$)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }

    private extractList(text: string, keyword: string): string[] | null {
        const regex = new RegExp(`${keyword}[s]?[:\\s]+([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
        const match = text.match(regex);
        if (!match) return null;

        return match[1]
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[-*•]\s*/, '').trim());
    }
}

// Export singleton instance
export const aiAnalysisEngine = new AIAnalysisEngine();
