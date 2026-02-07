import { useState } from 'react';
import { Globe, Palette, Search, FileText, Bot, Star, Circle, Play, Loader2, CheckCircle2, AlertCircle, X, Beaker, Terminal, LineChart, Shield, PenTool, Megaphone } from 'lucide-react';
import type { Agent, ServiceType } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { api } from '../services/api';

interface Props {
  agent: Agent;
}

const SERVICE_CONFIGS: Record<string, {
  icon: typeof Globe;
  name: string;
  color: string;
  bg: string;
  fields: { key: string; label: string; placeholder: string; type: 'text' | 'textarea' | 'url' }[];
}> = {
  scraper: {
    icon: Search,
    name: 'Web Scraper',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    fields: [
      { key: 'url', label: 'URL to Scrape', placeholder: 'https://example.com/page', type: 'url' },
    ],
  },
  summarizer: {
    icon: FileText,
    name: 'Summarizer',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    fields: [
      { key: 'text', label: 'Text to Summarize', placeholder: 'Paste the long text you want summarized...', type: 'textarea' },
    ],
  },
  translation: {
    icon: Globe,
    name: 'Translator',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    fields: [
      { key: 'text', label: 'Text to Translate', placeholder: 'Enter English text to translate...', type: 'textarea' },
      { key: 'target_lang', label: 'Target Language', placeholder: 'hi (Hindi), es (Spanish), fr (French)...', type: 'text' },
    ],
  },
  pdf_loader: {
    icon: FileText,
    name: 'PDF Loader',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    fields: [
      { key: 'filename', label: 'PDF Filename', placeholder: 'document.pdf (must be in backend/pdf_doc folder)', type: 'text' },
    ],
  },
  image_gen: {
    icon: Palette,
    name: 'Image Generator',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    fields: [
      { key: 'prompt', label: 'Image Prompt', placeholder: 'Describe the image you want to generate...', type: 'textarea' },
    ],
  },
  research: {
    icon: Beaker,
    name: 'Deep Research',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    fields: [
      { key: 'topic', label: 'Research Topic', placeholder: 'What topic should I research deeply?', type: 'text' },
    ],
  },
  coding: {
    icon: Terminal,
    name: 'Code Assistant',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    fields: [
      { key: 'task', label: 'Coding Task', placeholder: 'Describe the function or script you need...', type: 'textarea' },
      { key: 'language', label: 'Language', placeholder: 'Python, TypeScript, Rust...', type: 'text' },
    ],
  },
  data_analysis: {
    icon: LineChart,
    name: 'Data Analyst',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    fields: [
      { key: 'data_source', label: 'Data Source', placeholder: 'URL or description of data...', type: 'text' },
      { key: 'query', label: 'Analysis Query', placeholder: 'What insights do you need?', type: 'textarea' },
    ],
  },
  security: {
    icon: Shield,
    name: 'Security Audit',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    fields: [
      { key: 'target', label: 'Target to Audit', placeholder: 'Smart contract address or URL...', type: 'text' },
    ],
  },
  copywriting: {
    icon: PenTool,
    name: 'Creative Writer',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    fields: [
      { key: 'topic', label: 'Topic', placeholder: 'Blog post topic or ad copy subject...', type: 'text' },
      { key: 'tone', label: 'Tone', placeholder: 'Professional, witty, persuasive...', type: 'text' },
    ],
  },
  marketing: {
    icon: Megaphone,
    name: 'Marketing SEO',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    fields: [
      { key: 'keyword', label: 'Target Keywords', placeholder: 'Keywords to analyze...', type: 'text' },
      { key: 'url', label: 'Page URL', placeholder: 'https://...', type: 'url' },
    ],
  },
};

// Execution history entry
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
    // Keep last 50 entries
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch {
    // ignore
  }
}



export function AgentCard({ agent }: Props) {
  const [open, setOpen] = useState(false);
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
    'translation': Globe,
    'image_gen': Palette,
    'scraper': Search,
    'summarizer': FileText,
    'pdf_loader': FileText,
    'research': Beaker,
    'coding': Terminal,
    'data_analysis': LineChart,
    'security': Shield,
    'copywriting': PenTool,
    'marketing': Megaphone,
  };

  const ServiceIcon = serviceIcons[serviceType] || Bot;
  const config = SERVICE_CONFIGS[serviceType];

  // Helper function to format output based on service type
  const formatOutput = (output: unknown, currentServiceType: string) => {
    if (!output) return <div className="text-gray-500">No output</div>;

    // Special formatting for scraper output
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
          {/* Title */}
          {title && (
            <div>
              <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">Page Title</div>
              <div className="text-lg font-semibold text-white">{title}</div>
            </div>
          )}

          {/* Meta info */}
          <div className="flex gap-4 text-sm">
            {word_count && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Words:</span>
                <span className="text-green-400 font-medium">{word_count.toLocaleString()}</span>
              </div>
            )}
            {status && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Status:</span>
                <span className="text-green-400 font-medium capitalize">{status}</span>
              </div>
            )}
          </div>

          {/* Content preview */}
          {content && (
            <div>
              <div className="text-xs text-purple-400 uppercase tracking-wider mb-2">Extracted Content</div>
              <div className="bg-gray-900/50 p-4 rounded border border-gray-800 max-h-96 overflow-y-auto">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {content.length > 1000 ? `${content.substring(0, 1000)}...` : content}
                </p>
              </div>
            </div>
          )}

          {/* URL */}
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

    // Default JSON formatting for other services
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
      // Set defaults for translation if not provided
      if (serviceType === 'translation' && !inputPayload.target_lang) {
        inputPayload.target_lang = 'hi';
      }

      const response = await api.executeService(agent.wallet, {
        service_type: serviceType as ServiceType,
        input: inputPayload,
      });

      const data = response.data.data;
      setResult({
        output: data.output,
        cost: data.cost,
        duration: data.duration,
      });

      // Save to history
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

  const handleOpen = () => {
    setInputs({});
    setResult(null);
    setError(null);
    setOpen(true);
  };

  const hasRequiredInput = config?.fields.every(f => {
    if (f.key === 'target_lang') return true; // optional, defaults to 'hi'
    return inputs[f.key]?.trim();
  }) ?? false;

  return (
    <>
      <Card className="hover:border-blue-500/50 transition-all duration-200 group cursor-pointer" onClick={handleOpen}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <ServiceIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold capitalize">
                {serviceType.replace('_', ' ')} Agent
              </h3>
              <p className="text-sm text-gray-400 font-mono">
                {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold text-green-400">
                ${(price / 1000000).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">per task</p>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">{(agent.reputation / 200).toFixed(1)}/5</span>
              </div>
              <p className="text-xs text-gray-400">reputation</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge
              variant={agent.active ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              <Circle
                className={`w-2 h-2 ${agent.active ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'}`}
              />
              {agent.active ? 'Online' : 'Offline'}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); handleOpen(); }}
            >
              <Play className="w-3 h-3 mr-1 fill-current" />
              Try Agent
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Execution Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-white p-0 overflow-hidden max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Execute {config?.name || serviceType} Agent</DialogTitle>
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config?.bg || 'bg-gray-800'}`}>
                <ServiceIcon className={`w-6 h-6 ${config?.color || 'text-white'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold capitalize">{config?.name || serviceType.replace('_', ' ')} Agent</h2>
                <p className="text-sm text-gray-400 font-mono">{agent.wallet.slice(0, 10)}...{agent.wallet.slice(-6)}</p>
              </div>
            </div>

            {/* Input Fields */}
            {config ? (
              <div className="space-y-4">
                {config.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={inputs[field.key] || ''}
                        onChange={e => setInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={4}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={inputs[field.key] || ''}
                        onChange={e => setInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Input</label>
                  <textarea
                    value={inputs['text'] || ''}
                    onChange={e => setInputs(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter your input..."
                    rows={4}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* Execute Button */}
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={handleExecute}
              disabled={executing || !hasRequiredInput || !agent.active}
            >
              {executing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : !agent.active ? (
                'Agent Offline'
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Execute (${(price / 1000000).toFixed(2)})
                </>
              )}
            </Button>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-950/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-400">Execution Failed</div>
                  <div className="text-sm text-red-400/70 mt-1">{error}</div>
                </div>
                <button onClick={() => setError(null)}>
                  <X className="w-4 h-4 text-gray-500 hover:text-white" />
                </button>
              </div>
            )}

            {/* Result Output */}
            {result && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Execution Successful</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                    <div className="text-lg font-bold text-green-400">${result.cost.toFixed(4)}</div>
                    <div className="text-xs text-gray-500 uppercase">Cost</div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                    <div className="text-lg font-bold text-blue-400">{(result.duration / 1000).toFixed(2)}s</div>
                    <div className="text-xs text-gray-500 uppercase">Duration</div>
                  </div>
                </div>

                {/* Output */}
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Output</div>
                  <div className="p-4 bg-gray-950 rounded-lg border border-gray-800">
                    {formatOutput(result.output, serviceType)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
