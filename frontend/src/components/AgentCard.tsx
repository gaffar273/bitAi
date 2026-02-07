import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Palette, Search, FileText, Bot, Circle, Play, Loader2, CheckCircle2, AlertCircle, Beaker, Terminal, LineChart, Shield, PenTool, Megaphone, TrendingUp, CheckCircle } from 'lucide-react';
import type { Agent, ServiceType } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

interface Props {
  agent: Agent;
}

const SERVICE_CONFIGS: Record<string, {
  icon: typeof Globe;
  name: string;
  color: string;
  gradient: string;
  fields: { key: string; label: string; placeholder: string; type: 'text' | 'textarea' | 'url' }[];
}> = {
  scraper: {
    icon: Search,
    name: 'Web Scraper',
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
    fields: [
      { key: 'url', label: 'URL to Scrape', placeholder: 'https://example.com/page', type: 'url' },
    ],
  },
  summarizer: {
    icon: FileText,
    name: 'Summarizer',
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-amber-500',
    fields: [
      { key: 'text', label: 'Text to Summarize', placeholder: 'Paste the long text you want summarized...', type: 'textarea' },
    ],
  },
  translation: {
    icon: Globe,
    name: 'Translator',
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-500',
    fields: [
      { key: 'text', label: 'Text to Translate', placeholder: 'Enter English text to translate...', type: 'textarea' },
      { key: 'target_lang', label: 'Target Language', placeholder: 'hi (Hindi), es (Spanish), fr (French)...', type: 'text' },
    ],
  },
  pdf_loader: {
    icon: FileText,
    name: 'PDF Loader',
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-500',
    fields: [
      { key: 'filename', label: 'PDF Filename', placeholder: 'document.pdf (must be in backend/pdf_doc folder)', type: 'text' },
    ],
  },
  image_gen: {
    icon: Palette,
    name: 'Image Generator',
    color: 'text-pink-400',
    gradient: 'from-pink-500 to-rose-500',
    fields: [
      { key: 'prompt', label: 'Image Prompt', placeholder: 'Describe the image you want to generate...', type: 'textarea' },
    ],
  },
  research: {
    icon: Beaker,
    name: 'Deep Research',
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-500',
    fields: [
      { key: 'topic', label: 'Research Topic', placeholder: 'What topic should I research deeply?', type: 'text' },
    ],
  },
  coding: {
    icon: Terminal,
    name: 'Code Assistant',
    color: 'text-cyan-400',
    gradient: 'from-cyan-500 to-blue-500',
    fields: [
      { key: 'task', label: 'Coding Task', placeholder: 'Describe the function or script you need...', type: 'textarea' },
      { key: 'language', label: 'Language', placeholder: 'Python, TypeScript, Rust...', type: 'text' },
    ],
  },
  data_analysis: {
    icon: LineChart,
    name: 'Data Analyst',
    color: 'text-teal-400',
    gradient: 'from-teal-500 to-emerald-500',
    fields: [
      { key: 'data_source', label: 'Data Source', placeholder: 'URL or description of data...', type: 'text' },
      { key: 'query', label: 'Analysis Query', placeholder: 'What insights do you need?', type: 'textarea' },
    ],
  },
  security: {
    icon: Shield,
    name: 'Security Audit',
    color: 'text-red-400',
    gradient: 'from-red-500 to-orange-500',
    fields: [
      { key: 'target', label: 'Target to Audit', placeholder: 'Smart contract address or URL...', type: 'text' },
    ],
  },
  copywriting: {
    icon: PenTool,
    name: 'Creative Writer',
    color: 'text-orange-400',
    gradient: 'from-orange-500 to-amber-500',
    fields: [
      { key: 'topic', label: 'Topic', placeholder: 'Blog post topic or ad copy subject...', type: 'text' },
      { key: 'tone', label: 'Tone', placeholder: 'Professional, witty, persuasive...', type: 'text' },
    ],
  },
  marketing: {
    icon: Megaphone,
    name: 'Marketing SEO',
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-orange-500',
    fields: [
      { key: 'keyword', label: 'Target Keywords', placeholder: 'Keywords to analyze...', type: 'text' },
      { key: 'url', label: 'Page URL', placeholder: 'https://...', type: 'url' },
    ],
  },
};

const AGENT_DETAILS: Record<string, {
  description: string;
  features: string[];
  useCases: string[];
}> = {
  translation: {
    description: 'Advanced multilingual translation powered by Google Gemini 2.5 Flash. Supports over 100 languages with context-aware translations.',
    features: ['Context-aware translation', 'Preserves technical terms', 'Supports 100+ languages', 'Real-time processing'],
    useCases: ['Translate documentation', 'Localize content', 'Multilingual support', 'International communication']
  },
  summarizer: {
    description: 'Intelligent text summarization that condenses long-form content while retaining key information and critical insights.',
    features: ['Preserves key technical terms', 'Adjustable summary length', 'Maintains context', 'Highlights insights'],
    useCases: ['Summarize research papers', 'Condense meeting notes', 'Extract key points', 'Quick document reviews']
  },
  scraper: {
    description: 'Powerful web scraping agent that extracts clean, structured content from any URL. Handles dynamic content.',
    features: ['Clean content extraction', 'Handles dynamic pages', 'Removes ads/clutter', 'Structured output'],
    useCases: ['Extract article content', 'Gather research data', 'Monitor changes', 'Content aggregation']
  },
  pdf_loader: {
    description: 'Efficient PDF text extraction and processing. Handles complex layouts, tables, and multi-column formats.',
    features: ['Preserves structure', 'Handles complex layouts', 'Table extraction', 'Multi-page processing'],
    useCases: ['Extract text from PDFs', 'Process invoices', 'Analyze reports', 'Document digitization']
  },
  image_gen: {
    description: 'AI-powered image generation using state-of-the-art diffusion models. Create stunning visuals from text.',
    features: ['High-quality generation', 'Multiple style options', 'Fast processing', 'Commercial use ready'],
    useCases: ['Create marketing visuals', 'Generate concept art', 'Design mockups', 'Social media content']
  },
  research: {
    description: 'Deep research agent that conducts comprehensive analysis on any topic with citations and structured insights.',
    features: ['Multi-source analysis', 'Citation tracking', 'Structured reports', 'Fact verification'],
    useCases: ['Market research', 'Competitive analysis', 'Academic research', 'Due diligence']
  },
  coding: {
    description: 'AI coding assistant that generates, debugs, and optimizes code across multiple programming languages.',
    features: ['Multi-language support', 'Code optimization', 'Bug detection', 'Best practices'],
    useCases: ['Generate boilerplate', 'Debug existing code', 'Optimize algorithms', 'Code reviews']
  },
  data_analysis: {
    description: 'Advanced data processing and analysis agent. Performs statistical analysis and extracts actionable insights.',
    features: ['Statistical analysis', 'Data visualization', 'Pattern recognition', 'Predictive modeling'],
    useCases: ['Analyze metrics', 'Generate reports', 'Identify trends', 'Data-driven decisions']
  },
  security: {
    description: 'Security audit agent specializing in smart contract analysis and vulnerability detection.',
    features: ['Vulnerability scanning', 'Gas optimization', 'Best practices check', 'Detailed reports'],
    useCases: ['Smart contract audits', 'Security assessments', 'Code reviews', 'Pre-deployment checks']
  },
  copywriting: {
    description: 'Creative content generation for marketing, advertising, and brand communication.',
    features: ['Multiple tone options', 'SEO optimization', 'Brand voice matching', 'A/B test variants'],
    useCases: ['Write ad copy', 'Create blog posts', 'Product descriptions', 'Email campaigns']
  },
  marketing: {
    description: 'SEO and marketing optimization agent that analyzes keywords and provides actionable recommendations.',
    features: ['Keyword analysis', 'SEO recommendations', 'Competitor insights', 'Content optimization'],
    useCases: ['Improve SEO rankings', 'Keyword research', 'Content strategy', 'Performance tracking']
  }
};

function generateMockUsageData(agentType: string) {
  const baseUsage = {
    translation: 45, summarizer: 38, scraper: 52, pdf_loader: 28, image_gen: 35,
    research: 42, coding: 65, data_analysis: 48, security: 32, copywriting: 40, marketing: 36
  }[agentType] || 30;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, index) => ({
    day,
    usage: Math.floor(baseUsage + Math.random() * 20 - 10 + index * 2)
  }));
}

interface ExecutionEntry {
  id: string;
  agentWallet: string;
  serviceType: string;
  input: Record<string, string>;
  output: unknown;
  cost: number;
  duration: number;
  timestamp: string;
  success: boolean;
}

const HISTORY_KEY = 'agent_execution_history';

function saveToHistory(entry: ExecutionEntry) {
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as ExecutionEntry[];
    existing.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch {
    // ignore
  }
}

export function AgentCard({ agent }: Props) {
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ output: unknown; cost: number; duration: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstService = agent.services[0];
  const firstPricing = agent.pricing[0];

  const serviceType = typeof firstService === 'string'
    ? firstService
    : (firstService as { type?: string })?.type || 'unknown';

  const price = typeof firstPricing === 'number'
    ? firstPricing
    : (firstPricing as { priceUsdc?: number })?.priceUsdc
      ? (firstPricing as { priceUsdc: number }).priceUsdc * 1000000
      : 50000;

  const serviceIcons: Record<string, typeof Globe> = {
    'translation': Globe, 'image_gen': Palette, 'scraper': Search, 'summarizer': FileText,
    'pdf_loader': FileText, 'research': Beaker, 'coding': Terminal, 'data_analysis': LineChart,
    'security': Shield, 'copywriting': PenTool, 'marketing': Megaphone,
  };

  const ServiceIcon = serviceIcons[serviceType] || Bot;
  const config = SERVICE_CONFIGS[serviceType];

  const formatOutput = (output: unknown, currentServiceType: string) => {
    if (!output) return <div className="text-gray-500">No output</div>;

    if (currentServiceType === 'scraper' && typeof output === 'object') {
      const scraperOutput = output as { title?: string; content?: string; word_count?: number; url?: string; status?: string; error?: string };
      const { title, content, word_count, url, status, error } = scraperOutput;

      if (error) {
        return (
          <div className="space-y-2">
            <div className="text-red-400 font-medium">❌ Scraping Failed</div>
            <div className="text-red-400/70 text-sm">{error}</div>
            {url && <div className="text-gray-500 text-xs mt-2">URL: {url}</div>}
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {title && (
            <div>
              <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">Page Title</div>
              <div className="text-lg font-semibold text-white">{title}</div>
            </div>
          )}
          <div className="flex gap-4 text-sm">
            {word_count && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Words:</span>
                <span className="text-emerald-400 font-medium">{word_count.toLocaleString()}</span>
              </div>
            )}
            {status && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Status:</span>
                <span className="text-emerald-400 font-medium capitalize">{status}</span>
              </div>
            )}
          </div>
          {content && (
            <div>
              <div className="text-xs text-yellow-400 uppercase tracking-wider mb-2">Extracted Content</div>
              <div className="glass rounded-xl p-4 max-h-96 overflow-y-auto">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {content.length > 1000 ? `${content.substring(0, 1000)}...` : content}
                </p>
              </div>
            </div>
          )}
          {url && (
            <div className="text-xs text-gray-500 truncate">
              <span className="text-gray-600">Source: </span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                {url}
              </a>
            </div>
          )}
        </div>
      );
    }

    return (
      <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
        {typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output)}
      </pre>
    );
  };

  const handleExecute = async () => {
    setExecuting(true);
    setResult(null);
    setError(null);

    try {
      const inputPayload: Record<string, unknown> = { ...inputs };
      if (serviceType === 'translation' && !inputPayload.target_lang) {
        inputPayload.target_lang = 'hi';
      }

      const response = await api.executeService(agent.wallet, {
        service_type: serviceType as ServiceType,
        input: inputPayload,
      });

      const data = response.data.data;
      setResult({ output: data.output, cost: data.cost, duration: data.duration });

      saveToHistory({
        id: Date.now().toString(),
        agentWallet: agent.wallet,
        serviceType,
        input: inputs,
        output: data.output,
        cost: data.cost,
        duration: data.duration,
        timestamp: new Date().toISOString(),
        success: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      setError(msg);

      saveToHistory({
        id: Date.now().toString(),
        agentWallet: agent.wallet,
        serviceType,
        input: inputs,
        output: null,
        cost: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
        success: false,
      });
    } finally {
      setExecuting(false);
    }
  };

  const hasRequiredInput = config?.fields.every(f => {
    if (f.key === 'target_lang') return true;
    return inputs[f.key]?.trim();
  }) ?? false;

  const handleCardClick = () => setDetailOpen(true);

  const handleTryAgent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputs({});
    setResult(null);
    setError(null);
    setOpen(true);
  };

  const agentDetails = AGENT_DETAILS[serviceType] || {
    description: 'AI-powered agent service',
    features: ['Automated processing', 'Fast execution', 'Reliable results'],
    useCases: ['General automation', 'Task processing']
  };

  const usageData = generateMockUsageData(serviceType);

  return (
    <>
      {/* Main Card */}
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        onClick={handleCardClick}
        className="glass rounded-2xl p-6 cursor-pointer hover-glow group"
      >
        <div className="flex items-center gap-4 mb-5">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config?.gradient || 'from-yellow-500 to-amber-500'} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
            <ServiceIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold capitalize truncate">
              {serviceType.replace('_', ' ')} Agent
            </h3>
            <p className="text-sm text-gray-400 font-mono truncate">
              {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-3xl font-bold gradient-text-accent">
            ${(price / 1000000).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">per task</p>
        </div>

        <div className="flex items-center justify-between">
          <Badge
            className={`
              flex items-center gap-1.5 px-3 py-1
              ${agent.active
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
              }
            `}
          >
            <Circle className={`w-2 h-2 ${agent.active ? 'fill-emerald-500 text-emerald-500' : 'fill-gray-500 text-gray-500'}`} />
            {agent.active ? 'Online' : 'Offline'}
          </Badge>
          <Button
            size="sm"
            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 text-white opacity-0 group-hover:opacity-100 transition-all"
            onClick={handleTryAgent}
          >
            <Play className="w-3 h-3 mr-1.5 fill-current" />
            Try Agent
          </Button>
        </div>
      </motion.div>

      {/* Agent Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[700px] glass-strong border-white/10 text-white p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Agent Details - {config?.name || serviceType}</DialogTitle>
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br ${config?.gradient || 'from-yellow-500 to-amber-500'}`}>
                <ServiceIcon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{config?.name || serviceType.replace('_', ' ')}</h2>
                <p className="text-sm text-gray-400 font-mono">{agent.wallet.slice(0, 10)}...{agent.wallet.slice(-6)}</p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={agent.active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}>
                    <Circle className={`w-2 h-2 mr-1 ${agent.active ? 'fill-emerald-500' : 'fill-gray-500'}`} />
                    {agent.active ? 'Online' : 'Offline'}
                  </Badge>
                  <span className="text-lg font-bold gradient-text-accent">${(price / 1000000).toFixed(2)}</span>
                  <span className="text-sm text-gray-400">per task</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass rounded-xl p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                About This Agent
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{agentDetails.description}</p>
            </div>

            {/* Features & Use Cases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Key Features
                </h4>
                <ul className="space-y-2">
                  {agentDetails.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass rounded-xl p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  Use Cases
                </h4>
                <ul className="space-y-2">
                  {agentDetails.useCases.map((useCase, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">•</span>
                      <span>{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="glass rounded-xl p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <LineChart className="w-4 h-4 text-cyan-400" />
                Usage Statistics (Last 7 Days)
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <RechartsLineChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#F3F4F6',
                      backdropFilter: 'blur(20px)'
                    }}
                  />
                  <Line type="monotone" dataKey="usage" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                </RechartsLineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center glass rounded-lg p-3">
                  <div className="text-xl font-bold text-amber-400">{usageData.reduce((sum, d) => sum + d.usage, 0)}</div>
                  <div className="text-xs text-gray-400">Total Uses</div>
                </div>
                <div className="text-center glass rounded-lg p-3">
                  <div className="text-xl font-bold text-emerald-400">{Math.floor(usageData.reduce((sum, d) => sum + d.usage, 0) / 7)}</div>
                  <div className="text-xs text-gray-400">Avg/Day</div>
                </div>
                <div className="text-center glass rounded-lg p-3">
                  <div className="text-xl font-bold text-yellow-400">98%</div>
                  <div className="text-xs text-gray-400">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button
              className="w-full h-12 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25 transition-all text-black font-semibold"
              onClick={handleTryAgent}
              disabled={!agent.active}
            >
              {agent.active ? (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Try This Agent (${(price / 1000000).toFixed(2)})
                </>
              ) : 'Agent Offline'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execution Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] glass-strong border-white/10 text-white p-0 overflow-hidden max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Execute {config?.name || serviceType} Agent</DialogTitle>
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${config?.gradient || 'from-yellow-500 to-amber-500'}`}>
                <ServiceIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold capitalize">{config?.name || serviceType.replace('_', ' ')}</h2>
                <p className="text-sm text-gray-400 font-mono">{agent.wallet.slice(0, 10)}...{agent.wallet.slice(-6)}</p>
              </div>
            </div>

            {/* Input Fields */}
            {config ? (
              <div className="space-y-4">
                {config.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={inputs[field.key] || ''}
                        onChange={e => setInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={4}
                        className="w-full p-4 glass rounded-xl text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none resize-none border border-white/10"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={inputs[field.key] || ''}
                        onChange={e => setInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full p-4 glass rounded-xl text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none border border-white/10"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Input</label>
                <textarea
                  value={inputs['text'] || ''}
                  onChange={e => setInputs(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Enter your input..."
                  rows={4}
                  className="w-full p-4 glass rounded-xl text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none resize-none border border-white/10"
                />
              </div>
            )}

            {/* Execute Button */}
            <Button
              className="w-full h-12 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-black font-semibold"
              onClick={handleExecute}
              disabled={executing || !hasRequiredInput}
            >
              {executing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Execute (${(price / 1000000).toFixed(2)})
                </>
              )}
            </Button>

            {/* Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-4 border border-emerald-500/30"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-emerald-400">Success</span>
                  <span className="text-sm text-gray-400 ml-auto">
                    ${result.cost.toFixed(4)} • {(result.duration / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="glass rounded-lg p-3 max-h-64 overflow-y-auto">
                  {formatOutput(result.output, serviceType)}
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-4 border border-red-500/30"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">{error}</span>
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
