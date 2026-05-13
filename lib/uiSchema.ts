/** UI Schema types for the Prompt-to-Interface Builder */

export interface UISchema {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  theme: UITheme;
  sections: UIComponent[];
  meta?: UIMeta;
}

export interface UITheme {
  primaryColor: string;
  secondaryColor?: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  fontFamily: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  spacing: 'compact' | 'normal' | 'relaxed';
}

export interface UIMeta {
  title?: string;
  favicon?: string;
  ogImage?: string;
  analytics?: string;
}

export type UIComponent =
  | HeroComponent
  | FeaturesComponent
  | FormComponent
  | NavbarComponent
  | FooterComponent
  | StatsComponent
  | TestimonialsComponent
  | PricingComponent
  | FAQComponent
  | CTAComponent
  | TeamComponent
  | GalleryComponent
  | LogosComponent
  | TextComponent
  | DividerComponent;

export interface HeroComponent {
  type: 'hero';
  title: string;
  subtitle?: string;
  description?: string;
  cta?: CTA;
  secondaryCta?: CTA;
  image?: string;
  video?: string;
  layout: 'center' | 'split' | 'full';
  badge?: string;
}

export interface FeaturesComponent {
  type: 'features';
  title?: string;
  description?: string;
  layout: 'grid' | 'list' | 'cards' | 'bento';
  columns?: 2 | 3 | 4;
  items: FeatureItem[];
}

export interface FeatureItem {
  id: string;
  icon?: string;
  title: string;
  description: string;
  image?: string;
  cta?: CTA;
}

export interface FormComponent {
  type: 'form';
  title?: string;
  description?: string;
  fields: FormField[];
  submitLabel: string;
  submitAction: 'email' | 'webhook' | 'showMessage';
  successMessage?: string;
  successRedirect?: string;
  layout: 'stacked' | 'inline' | 'card';
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'tel' | 'url';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface NavbarComponent {
  type: 'navbar';
  logo?: {
    text?: string;
    image?: string;
    href?: string;
  };
  links: NavLink[];
  cta?: CTA;
  sticky: boolean;
  transparent: boolean;
  mobileMenu: 'drawer' | 'dropdown' | 'sheet';
}

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
  children?: NavLink[];
}

export interface FooterComponent {
  type: 'footer';
  logo?: {
    text?: string;
    image?: string;
  };
  tagline?: string;
  columns: FooterColumn[];
  bottomRow?: {
    copyright?: string;
    links?: NavLink[];
    socials?: SocialLink[];
  };
  newsletter?: {
    title: string;
    placeholder: string;
    buttonLabel: string;
  };
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface SocialLink {
  platform: 'twitter' | 'github' | 'linkedin' | 'instagram' | 'youtube' | 'discord' | 'facebook';
  href: string;
}

export interface StatsComponent {
  type: 'stats';
  title?: string;
  description?: string;
  layout: 'grid' | 'row' | 'cards';
  metrics: StatMetric[];
}

export interface StatMetric {
  value: string;
  label: string;
  description?: string;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface TestimonialsComponent {
  type: 'testimonials';
  title?: string;
  description?: string;
  layout: 'grid' | 'carousel' | 'marquee' | 'single';
  quotes: Testimonial[];
}

export interface Testimonial {
  id: string;
  quote: string;
  author: {
    name: string;
    role?: string;
    company?: string;
    image?: string;
  };
  rating?: number;
}

export interface PricingComponent {
  type: 'pricing';
  title?: string;
  description?: string;
  layout: 'cards' | 'table' | 'toggle';
  tiers: PricingTier[];
  frequency?: 'monthly' | 'yearly' | 'both';
}

export interface PricingTier {
  id: string;
  name: string;
  description?: string;
  price: {
    monthly?: number;
    yearly?: number;
  };
  currency?: string;
  features: string[];
  cta?: CTA;
  highlighted?: boolean;
  badge?: string;
}

export interface FAQComponent {
  type: 'faq';
  title?: string;
  description?: string;
  layout: 'accordion' | 'simple' | 'cards';
  questions: FAQItem[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CTAComponent {
  type: 'cta';
  title: string;
  description?: string;
  cta: CTA;
  secondaryCta?: CTA;
  background?: 'default' | 'gradient' | 'image' | 'dark';
  layout: 'center' | 'split';
}

export interface TeamComponent {
  type: 'team';
  title?: string;
  description?: string;
  layout: 'grid' | 'cards' | 'list';
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  image?: string;
  socials?: SocialLink[];
}

export interface GalleryComponent {
  type: 'gallery';
  title?: string;
  description?: string;
  layout: 'grid' | 'masonry' | 'carousel';
  images: GalleryImage[];
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
}

export interface LogosComponent {
  type: 'logos';
  title?: string;
  description?: string;
  layout: 'grid' | 'row' | 'marquee';
  logos: LogoItem[];
  grayscale?: boolean;
}

export interface LogoItem {
  id: string;
  name: string;
  image: string;
  href?: string;
}

export interface TextComponent {
  type: 'text';
  content: string;
  align: 'left' | 'center' | 'right';
  size: 'sm' | 'base' | 'lg' | 'xl';
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
}

export interface DividerComponent {
  type: 'divider';
  style: 'line' | 'gradient' | 'wave' | 'dots';
  spacing: 'sm' | 'md' | 'lg';
}

export interface CTA {
  label: string;
  href?: string;
  variant: 'primary' | 'secondary' | 'ghost' | 'outline';
  action?: 'navigate' | 'scroll' | 'modal' | 'submit';
  external?: boolean;
}

export interface BuildUIRequest {
  prompt: string;
  previousSchema?: UISchema;
  iteration?: boolean;
  refinement?: string;
}

export interface BuildUIResponse {
  schema: UISchema;
  suggestions: string[];
  tokensUsed?: number;
}

export interface BuilderHistoryItem {
  id: string;
  name: string;
  prompt: string;
  schema: UISchema;
  createdAt: number;
}

export type UISectionType = UIComponent['type'];

export const DEFAULT_UI_THEME: UITheme = {
  primaryColor: '#7456ff',
  secondaryColor: '#9d88ff',
  background: '#0c0c0e',
  surface: '#16161a',
  text: '#ececec',
  textMuted: '#b8b8b8',
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: 'lg',
  spacing: 'normal',
};

export const LIGHT_UI_THEME: UITheme = {
  primaryColor: '#7456ff',
  secondaryColor: '#9d88ff',
  background: '#ffffff',
  surface: '#f8f8fa',
  text: '#1a1a1a',
  textMuted: '#6b6b6b',
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: 'lg',
  spacing: 'normal',
};

export const PRESET_THEMES: Record<string, UITheme> = {
  dark: DEFAULT_UI_THEME,
  light: LIGHT_UI_THEME,
  modern: {
    ...DEFAULT_UI_THEME,
    primaryColor: '#0ea5e9',
    secondaryColor: '#38bdf8',
    borderRadius: 'xl',
  },
  warm: {
    ...LIGHT_UI_THEME,
    primaryColor: '#f59e0b',
    secondaryColor: '#fbbf24',
    background: '#fffbeb',
    surface: '#fff7ed',
  },
  forest: {
    ...DEFAULT_UI_THEME,
    primaryColor: '#22c55e',
    secondaryColor: '#4ade80',
    background: '#052e16',
    surface: '#064e3b',
  },
};

export const SUGGESTED_PROMPTS = [
  'A SaaS landing page with dark theme, hero section, feature grid, and pricing',
  'A portfolio website with hero, project gallery, skills section, and contact form',
  'A startup landing page with stats, testimonials, team section, and newsletter signup',
  'An app waitlist page with email capture, feature highlights, and FAQ',
  'A product launch page with countdown, video embed, and early access form',
  'A consultancy website with services, case studies, and booking form',
  'A personal blog homepage with featured posts, categories, and newsletter',
  'An event landing page with schedule, speakers, sponsors, and registration',
];

export function createSchemaId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultSchema(name = 'Generated Interface'): UISchema {
  const now = Date.now();
  return {
    id: createSchemaId(),
    name,
    description: 'AI-generated interface',
    createdAt: now,
    updatedAt: now,
    theme: DEFAULT_UI_THEME,
    sections: [],
  };
}
