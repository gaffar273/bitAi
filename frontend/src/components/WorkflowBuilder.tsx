import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Globe, Target, Play, Plus, X, ArrowDown, CheckCircle2, AlertCircle, Trash2, Wallet } from 'lucide-react';
import type { WorkflowStep, WorkflowResult, Agent } from '../types';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaymentChannelCard } from './PaymentChannelCard';
import type { WalletState } from '../hooks/use-wallet';

// Storage keys for persistence
const STORAGE_KEYS = {
  STEPS: 'workflow_steps',
  INPUT: 'workflow_input',
  RESULT: 'workflow_result',
};

const SERVICE_CONFIGS: Record<string, { icon: typeof Search; name: string; color: string; bg: string; border: string; priceEth: number; priceUsd: number; inputLabel: string; placeholder: string }> = {
  scraper: {
    icon: Search,
    name: 'Web Scraper',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    priceEth: 0.0002, // Actual ETH cost for the channel
    priceUsd: 0.02,   // Display USD - original price
    inputLabel: 'URL to Scrape',
    placeholder: 'https://example.com/article-to-scrape',
  },
  summarizer: {
    icon: FileText,
    name: 'Summarizer',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    priceEth: 0.0003, // Actual ETH cost
    priceUsd: 0.03,   // Display USD - original price
    inputLabel: 'Text to Summarize',
    placeholder: 'Paste the long text you want summarized here...',
  },
  translation: {
    icon: Globe,
    name: 'Translator',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    priceEth: 0.0005, // Actual ETH cost
    priceUsd: 0.05,   // Display USD - original price
    inputLabel: 'Text to Translate (English to Hindi)',
    placeholder: 'Enter the English text to translate...',
  },
  pdf_loader: {
    icon: FileText,
    name: 'PDF Loader',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    priceEth: 0.0001, // Actual ETH cost
    priceUsd: 0.01,   // Display USD - original price
    inputLabel: 'PDF Upload',
    placeholder: 'Upload a PDF file to extract text from.',
  },
};

// Extended workflow result with channel info
interface ExtendedWorkflowResult extends WorkflowResult {
  channelId?: string;
}

interface WorkflowBuilderProps {
  wallet?: WalletState;
  onConnectWallet?: () => void;
}

export function WorkflowBuilder({ wallet, onConnectWallet }: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExtendedWorkflowResult | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load agents on mount
  useEffect(() => {
    api.getAgents().then(res => setAgents(res.data.data || [])).catch(console.error);
  }, []);

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedSteps = localStorage.getItem(STORAGE_KEYS.STEPS);
      const savedInput = localStorage.getItem(STORAGE_KEYS.INPUT);
      const savedResult = localStorage.getItem(STORAGE_KEYS.RESULT);

      if (savedSteps) setSteps(JSON.parse(savedSteps));
      if (savedInput) setUserInput(savedInput);
      if (savedResult) setResult(JSON.parse(savedResult));
    } catch (e) {
      console.error('Failed to load saved workflow:', e);
    }
  }, []);

  // Save steps to localStorage
  useEffect(() => {
    if (steps.length > 0) {
      localStorage.setItem(STORAGE_KEYS.STEPS, JSON.stringify(steps));
    } else {
      localStorage.removeItem(STORAGE_KEYS.STEPS);
    }
  }, [steps]);

  // Save input to localStorage
  useEffect(() => {
    if (userInput) {
      localStorage.setItem(STORAGE_KEYS.INPUT, userInput);
    } else {
      localStorage.removeItem(STORAGE_KEYS.INPUT);
    }
  }, [userInput]);

  // Save result to localStorage
  useEffect(() => {
    if (result) {
      localStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(result));
    } else {
      localStorage.removeItem(STORAGE_KEYS.RESULT);
    }
  }, [result]);

  // Filter services to only show ones with registered agents
  const availableServices = useMemo(() => {
    const registeredTypes = new Set<string>(agents.flatMap(a => a.services.map(s => s.type)));
    return Object.entries(SERVICE_CONFIGS).filter(([key]) => registeredTypes.has(key)) as [string, typeof SERVICE_CONFIGS[keyof typeof SERVICE_CONFIGS]][];
  }, [agents]);

  // Get input config based on first step
  const inputConfig = useMemo(() => {
    if (steps.length === 0) return null;
    return SERVICE_CONFIGS[steps[0].serviceType] || null;
  }, [steps]);

  const addStep = (serviceType: WorkflowStep['serviceType']) => {
    setSteps([...steps, { serviceType }]);
    setError(null);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const clearWorkflow = useCallback(() => {
    setSteps([]);
    setUserInput('');
    setResult(null);
    setChannelId(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEYS.STEPS);
    localStorage.removeItem(STORAGE_KEYS.INPUT);
    localStorage.removeItem(STORAGE_KEYS.RESULT);
  }, []);

  const executeWorkflow = async () => {
    console.log('[WorkflowBuilder] Execute clicked', { steps, wallet, agents });
    if (steps.length === 0) return;
    setError(null);

    // Check wallet connection
    if (!wallet?.address) {
      setError('Please connect your wallet to pay for workflow execution');
      onConnectWallet?.();
      return;
    }

    // Check if user has a payment channel
    if (!wallet.channels || wallet.channels.length === 0) {
      setError('Please open a payment channel first (click your wallet balance above)');
      onConnectWallet?.();
      return;
    }

    // Check if active channel has sufficient balance
    const activeChannel = wallet.channels.find(c => c.status === 'open');
    if (!activeChannel) {
      setError('No open payment channel found. Please open a new channel.');
      onConnectWallet?.();
      return;
    }

    const totalCostWei = totalCost * 1e18; // Convert to wei
    if (activeChannel.balance < totalCostWei) {
      setError(`Insufficient channel balance. Need ${totalCost.toFixed(4)} ETH, have ${(activeChannel.balance / 1e18).toFixed(4)} ETH`);
      return;
    }

    if (agents.length === 0) {
      setError('No agents available. Please register agents first.');
      return;
    }

    // Validate input based on first service type
    const firstService = steps[0].serviceType;
    if (firstService !== 'pdf_loader' && !userInput.trim()) {
      setError('Please enter input for the workflow');
      return;
    }

    setExecuting(true);
    setResult(null);

    try {
      // Build steps with input - first step gets user input
      const stepsWithInput = steps.map((step, i) => ({
        ...step,
        input: i === 0 ? userInput : undefined
      }));

      const response = await api.executeWorkflow({
        orchestratorWallet: wallet.address, // Use user's wallet - they opened the channel and pay for services
        steps: stepsWithInput,
        channelId: activeChannel.channelId, // Use user's payment channel
      });
      const workflowResult = response.data.data as ExtendedWorkflowResult;
      setResult(workflowResult);

      // Store channel ID from workflow result
      if (workflowResult.channelId) {
        setChannelId(workflowResult.channelId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Workflow execution failed';
      setError(errorMessage);
      console.error('Workflow failed:', err);
    } finally {
      setExecuting(false);
    }
  };

  const handleSettleChannel = async () => {
    if (!channelId) return;
    try {
      if (!wallet?.address) return;

      const response = await api.settleChannel({ channel_id: channelId });
      const data = response.data;

      if ('data' in data && 'requires_signing' in data.data && data.data.requires_signing) {
        const txData = data.data.tx_data;

        if (!window.ethereum) {
          setError('MetaMask is required to sign');
          return;
        }

        const params = [{
          from: wallet.address,
          to: txData.to,
          data: txData.data,
          chainId: '0x' + txData.chainId.toString(16),
        }];

        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params,
        });

        await api.settleCallback(wallet.address, channelId, txHash, '', txHash);

        // Clear state
        setChannelId(null);
        clearWorkflow();
      } else {
        setChannelId(null);
        clearWorkflow();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Settlement failed';
      setError(errorMessage);
      console.error('Settlement failed:', err);
    }
  };

  const totalCost = steps.reduce((sum, step) => {
    const config = SERVICE_CONFIGS[step.serviceType];
    return sum + (config?.priceEth || 0);
  }, 0);

  // Total cost in USD for display
  const totalCostUsd = steps.reduce((sum, step) => {
    const config = SERVICE_CONFIGS[step.serviceType];
    return sum + (config?.priceUsd || 0);
  }, 0);

  // Calculate gas savings
  const gasSaved = result ? result.steps.length * 5 : 0; // $5 per on-chain tx

  // Format output for display
  const formatOutput = (output: unknown): string => {
    if (typeof output === 'string') return output;
    if (typeof output === 'object' && output !== null) {
      if ('output' in output) return String((output as { output: unknown }).output);
      if ('translated' in output) return String((output as { translated: unknown }).translated);
      if ('summary' in output) return String((output as { summary: unknown }).summary);
      if ('data' in output) return JSON.stringify((output as { data: unknown }).data, null, 2);
      return JSON.stringify(output, null, 2);
    }
    return String(output);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Header with Wallet Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Workflow Builder
          </h1>
          <p className="text-gray-400">
            Orchestrate multi-agent autonomous workflows
          </p>
        </div>

        {/* Wallet Status */}
        <div className="flex items-center gap-4">
          {wallet?.address ? (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
              <Wallet className="w-4 h-4 text-green-400" />
              <div className="text-sm">
                <div className="text-gray-400">Balance</div>
                <div className="font-mono text-green-400">
                  {parseFloat(wallet.ethBalance || '0').toFixed(4)} ETH
                </div>
              </div>
              {wallet.channels && wallet.channels.length > 0 && (
                <div className="pl-3 border-l border-gray-700 text-sm">
                  <div className="text-gray-400">Channel</div>
                  <div className="font-mono text-blue-400">
                    {(wallet.channels[0].balance / 1e18).toFixed(4)} ETH
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={onConnectWallet}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet to Pay
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-red-500/30 bg-red-950/10">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-red-400 font-medium">Error</div>
                  <div className="text-sm text-red-400/70">{error}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Service Palette + Input */}
        <div className="lg:col-span-4 space-y-4">
          {/* Dynamic Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {inputConfig?.inputLabel || 'Input'}
              </CardTitle>
              <CardDescription>
                {steps.length === 0
                  ? 'Add a service first to see input requirements'
                  : `Provide input for ${SERVICE_CONFIGS[steps[0].serviceType]?.name || 'workflow'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {steps.length > 0 && steps[0].serviceType === 'pdf_loader' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-900 hover:bg-gray-800 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileText className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload PDF</span></p>
                        <p className="text-xs text-gray-500">PDFs processed by agent</p>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setUserInput('Uploading...');
                              const res = await api.uploadFile(file);
                              // Store file ID in input for backend to use
                              const inputData = JSON.stringify({
                                fileId: res.data.data.id,
                                filename: res.data.data.filename
                              });
                              setUserInput(inputData);
                            } catch (err) {
                              console.error(err);
                              setUserInput('Upload failed');
                              alert('Failed to upload file');
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  {userInput && (
                    <div className="text-sm text-center text-green-400 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {(() => {
                        try {
                          const data = JSON.parse(userInput);
                          return data.filename ? `File uploaded: ${data.filename}` : userInput;
                        } catch {
                          return userInput;
                        }
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={inputConfig?.placeholder || 'Select a service to see input requirements...'}
                  disabled={steps.length === 0}
                  className="w-full h-32 p-4 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              )}
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Services</CardTitle>
              <CardDescription>
                {availableServices.length > 0
                  ? 'Click to add tasks to workflow'
                  : 'No agents registered yet'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableServices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Run `npm run register-agents` in backend</p>
                </div>
              ) : (
                availableServices.map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => addStep(key as WorkflowStep['serviceType'])}
                      className={`
                        w-full p-4 rounded-lg border transition-all duration-200
                        hover:scale-[1.02] active:scale-[0.98]
                        flex items-center justify-between group
                        ${config.bg} ${config.border}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md bg-gray-900/50 ${config.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-white group-hover:text-blue-200 transition-colors">
                            {config.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            ${config.priceUsd.toFixed(2)} / task
                          </div>
                        </div>
                      </div>
                      <Plus className={`w-5 h-5 ${config.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Workflow Canvas */}
        <div className="lg:col-span-8">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <div>
                <CardTitle>Workflow Sequence</CardTitle>
                <CardDescription>
                  {steps.length > 0
                    ? `${steps.length} steps | Est. Cost: $${totalCostUsd.toFixed(2)}`
                    : 'Build your agent pipeline'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {steps.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearWorkflow}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                    <Button
                      onClick={executeWorkflow}
                      disabled={executing || !wallet?.address}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {executing ? (
                        <>Running Pipeline...</>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2 fill-current" />
                          Execute (${totalCostUsd.toFixed(2)})
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ScrollArea className="h-[500px] pr-4">
                {steps.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-lg min-h-[300px]">
                    <div className="p-4 bg-gray-900/50 rounded-full mb-4">
                      <Target className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="font-medium mb-1">Workflow is empty</p>
                    <p className="text-sm">Select services from the left panel to begin</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    <AnimatePresence mode='popLayout'>
                      {steps.map((step, index) => {
                        const config = SERVICE_CONFIGS[step.serviceType];
                        if (!config) return null;
                        const Icon = config.icon;

                        return (
                          <div key={index} className="relative group">
                            {index > 0 && (
                              <div className="flex justify-center py-2 relative z-0">
                                <ArrowDown className="w-5 h-5 text-gray-700" />
                              </div>
                            )}

                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={`
                                relative z-10 p-4 rounded-lg border bg-gray-900/50 backdrop-blur-sm
                                flex items-center justify-between group/card
                                ${config.border}
                              `}
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-mono border border-gray-700">
                                  {index + 1}
                                </div>
                                <div className={`p-2 rounded-md bg-gray-950 ${config.color}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-medium">{config.name}</div>
                                  <div className="text-xs text-gray-500 font-mono">
                                    Agent Task
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="text-sm font-mono text-gray-400">
                                  ${config.priceUsd.toFixed(2)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeStep(index)}
                                  className="text-gray-500 hover:text-red-400 hover:bg-red-950/30"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-green-500/30 bg-green-950/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full text-green-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-green-400">Execution Successful</CardTitle>
                    <CardDescription>Workflow completed in {(result.totalDuration / 1000).toFixed(2)}s</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800 text-center">
                    <div className="text-2xl font-bold text-white">{result.steps.length}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Steps</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800 text-center">
                    <div className="text-2xl font-bold text-green-400">${result.totalCost.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Total Cost</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800 text-center">
                    <div className="text-2xl font-bold text-blue-400">{(result.totalDuration / 1000).toFixed(2)}s</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Duration</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 text-center">
                    <div className="text-2xl font-bold text-green-400">${gasSaved.toFixed(2)}</div>
                    <div className="text-xs text-green-400/70 uppercase tracking-wider">Gas Saved</div>
                  </div>
                </div>

                {/* Payment Channel Section */}
                {channelId && (
                  <div className="mb-6">
                    <PaymentChannelCard
                      channelId={channelId}
                      onSettle={handleSettleChannel}
                      showTransactions={true}
                    />
                  </div>
                )}

                {/* Step Results with OUTPUT */}
                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-800" />
                  <div className="space-y-6 relative">
                    {result.steps.map((step, index) => {
                      const config = SERVICE_CONFIGS[step.serviceType];
                      if (!config) return null;
                      const Icon = config.icon;

                      return (
                        <div key={index} className="flex items-start gap-4">
                          <div className={`
                            relative z-10 w-16 h-16 rounded-xl flex items-center justify-center border-4 border-gray-950
                            ${config.bg} ${config.color}
                          `}>
                            <Icon className="w-6 h-6" />
                          </div>

                          <div className="flex-1 pt-1.5">
                            <Card className="bg-gray-900/50 border-gray-800">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <div className="font-medium text-white mb-1">
                                      Step {step.step}: {config.name}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <span className="font-mono">{step.agentWallet.slice(0, 8)}...</span>
                                      <span>|</span>
                                      <span>{step.duration}ms</span>
                                      <span>|</span>
                                      <span className="text-green-400">${step.cost.toFixed(3)}</span>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className={`${config.color} ${config.border} bg-transparent`}>
                                    Success
                                  </Badge>
                                </div>

                                {/* OUTPUT DISPLAY */}
                                {!!step.output && (
                                  <div className="mt-3 p-4 bg-gray-950/80 rounded-lg border border-gray-800">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Output</div>
                                    <div className="text-sm text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                                      {formatOutput(step.output)}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
