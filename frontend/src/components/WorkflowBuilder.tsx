import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCheckmarkCircle, IoFolderOpen, IoTime } from 'react-icons/io5';
import { Workflow, X, Play, Loader2, Sparkles, CheckCircle2, AlertTriangle, Search, FileText, Globe, Palette, FileUp } from 'lucide-react';
import type { WorkflowStep, WorkflowResult, Agent } from '../types';
import { api } from '../services/api';
import type { WalletState } from '../hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SERVICE_CONFIGS = {
  scraper: { icon: Search, name: 'Web Scraper', gradient: 'from-blue-500 to-cyan-500', price: 0.02, placeholder: 'Enter URL to scrape...' },
  summarizer: { icon: FileText, name: 'Summarizer', gradient: 'from-yellow-500 to-amber-500', price: 0.03, placeholder: 'Enter text to summarize...' },
  translation: { icon: Globe, name: 'Translator', gradient: 'from-emerald-500 to-teal-500', price: 0.05, placeholder: 'Enter text to translate...' },
  image_gen: { icon: Palette, name: 'Image Generator', gradient: 'from-pink-500 to-rose-500', price: 0.05, placeholder: 'Describe the image...' },
  pdf_loader: { icon: FileUp, name: 'PDF Loader', gradient: 'from-amber-500 to-orange-500', price: 0.01, placeholder: 'PDF files will be auto-loaded...' },
};

type ServiceType = keyof typeof SERVICE_CONFIGS;

interface WorkflowBuilderProps {
  wallet: WalletState;
  onConnectWallet: () => void;
}

export function WorkflowBuilder({ wallet }: Omit<WorkflowBuilderProps, 'onConnectWallet'>) {
  const [steps, setSteps] = useState<{ serviceType: ServiceType }[]>([]);
  const [inputText, setInputText] = useState('');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAgents()
      .then(res => {
        if (res.data.success) {
          setAgents(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load agents:', err);
        setError('Failed to load agents. Is the backend running?');
      });
  }, []);

  const addStep = (serviceType: ServiceType) => {
    setSteps([...steps, { serviceType }]);
    setResult(null);
    setError(null);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const executeWorkflow = async () => {
    if (steps.length === 0) {
      setError('Add at least one step to the workflow!');
      return;
    }

    if (!inputText.trim()) {
      setError('Please enter some input text to process!');
      return;
    }

    if (agents.length === 0) {
      setError('No agents available. Please register agents first.');
      return;
    }

    // Check for wallet connection
    if (!wallet.address) {
      setError('Please connect your wallet first! Click the wallet icon in the header.');
      return;
    }

    // Check for open payment channel
    const openChannel = wallet.channels.find(ch => ch.status === 'open');
    if (!openChannel) {
      setError('No open payment channel! Please open a channel in the Wallet section before running workflows.');
      return;
    }

    setExecuting(true);
    setResult(null);
    setError(null);

    try {
      const workflowSteps: WorkflowStep[] = steps.map((step, index) => ({
        serviceType: step.serviceType,
        input: index === 0 ? { text: inputText, url: inputText, prompt: inputText } : undefined,
      }));



      const response = await api.executeWorkflow({
        orchestratorWallet: agents[0].wallet,
        steps: workflowSteps,
        userWallet: wallet.address,
        channelId: openChannel.channelId
      });

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError(response.data.error || 'Workflow execution failed');
      }
    } catch (err: unknown) {
      console.error('Workflow failed:', err);
      const message = err instanceof Error ? err.message : 'Workflow execution failed';
      setError(message);
    } finally {
      setExecuting(false);
    }
  };

  const totalCost = steps.reduce((sum, step) => {
    return sum + SERVICE_CONFIGS[step.serviceType].price;
  }, 0);

  const getPlaceholder = () => {
    if (steps.length === 0) return 'Add a step first, then enter your input here...';
    return SERVICE_CONFIGS[steps[0].serviceType].placeholder;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Workflow Builder</h1>
        </div>
        <p className="text-gray-400 ml-13">
          Build multi-agent workflows and execute them with real payments
        </p>

      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass rounded-xl p-4 border border-red-500/30 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 border border-amber-500/20"
      >
        <label className="block text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Enter Your Prompt
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={getPlaceholder()}
          className="w-full h-40 p-4 glass rounded-xl text-white text-lg placeholder-gray-500 focus:border-amber-500/50 focus:outline-none resize-none border border-white/10"
        />

      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Service Palette */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Available Services
          </h2>
          <div className="space-y-3">
            {Object.entries(SERVICE_CONFIGS).map(([key, config]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addStep(key as ServiceType)}
                className="w-full glass rounded-xl p-4 hover-glow text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                    <config.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{config.name}</div>
                    <div className="text-sm text-gray-400">
                      ${config.price.toFixed(2)} per task
                    </div>
                  </div>
                </div>
                <span className="text-2xl text-gray-600 group-hover:text-yellow-400 transition-colors">+</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Right: Workflow Canvas */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Your Workflow
            </h2>
            {steps.length > 0 && (
              <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400">
                {steps.length} step{steps.length !== 1 ? 's' : ''} - ${totalCost.toFixed(2)} total
              </Badge>
            )}
          </div>

          {/* Workflow Steps */}
          <div className="glass rounded-2xl p-6 min-h-[200px]">
            {steps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl mb-4">+</div>
                <p>Click a service on the left to add it</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {steps.map((step, index) => {
                    const config = SERVICE_CONFIGS[step.serviceType];
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="glass rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center font-bold text-white`}>
                            {index + 1}
                          </div>
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                            <config.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{config.name}</div>
                            <div className="text-sm text-gray-400">
                              ${config.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeStep(index)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {steps.length > 1 && (
                  <div className="text-center text-gray-600 text-sm pt-2">
                    Output flows from step 1 → step {steps.length}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Execute Button */}
          {steps.length > 0 && (
            <Button
              onClick={executeWorkflow}
              disabled={executing || !inputText.trim()}
              className="w-full mt-6 h-14 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25 rounded-xl font-bold text-lg text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {executing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Executing Workflow...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  Execute Workflow
                </span>
              )}
            </Button>
          )}
        </motion.div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass rounded-2xl p-8 border border-emerald-500/20"
          >
            <h2 className="text-2xl font-bold mb-6 text-emerald-400 flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7" />
              Workflow Complete!
            </h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Steps Executed', value: result.steps.length, color: 'from-blue-500 to-cyan-500' },
                { label: 'Total Cost (USDC)', value: `$${result.totalCost.toFixed(4)}`, color: 'from-emerald-500 to-teal-500' },
                { label: 'Total Time', value: `${(result.totalDuration / 1000).toFixed(1)}s`, color: 'from-orange-500 to-red-500' },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-5 text-center">
                  <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Step Results */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step Details</h3>
              {result.steps.map((step, index) => (
                <div key={index} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const config = SERVICE_CONFIGS[step.serviceType as ServiceType];
                        const IconComponent = config?.icon;
                        return IconComponent ? (
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white">?</div>
                        );
                      })()}
                      <div>
                        <div className="font-semibold">Step {step.step}</div>
                        <div className="text-sm text-gray-400 capitalize">
                          {step.serviceType.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-emerald-400">
                        ${step.cost.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {step.duration}ms
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2 font-mono">
                    Agent: {step.agentWallet.slice(0, 10)}...{step.agentWallet.slice(-8)}
                  </div>
                  {step.output !== null && step.output !== undefined && (
                    <div className="mt-2 glass rounded-lg p-3 text-sm text-gray-300 max-h-48 overflow-y-auto">
                      {typeof step.output === 'object' ? JSON.stringify(step.output, null, 2) : String(step.output)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Settlement Status */}
            {result.settlement && (
              <div className={`mt-6 glass rounded-xl p-4 border ${result.settlement.autoSettled
                ? 'border-emerald-500/30'
                : result.settlement.status === 'open'
                  ? 'border-blue-500/30'
                  : 'border-yellow-500/30'
                }`}>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  {result.settlement.autoSettled ? <IoCheckmarkCircle className="w-5 h-5 text-emerald-400" /> : result.settlement.status === 'open' ? <IoFolderOpen className="w-5 h-5 text-blue-400" /> : <IoTime className="w-5 h-5 text-yellow-400" />}
                  Payment Channel
                </h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={
                      result.settlement.status === 'settled_onchain' || result.settlement.status === 'settled_offchain'
                        ? 'text-emerald-400'
                        : result.settlement.status === 'open'
                          ? 'text-blue-400'
                          : 'text-yellow-400'
                    }>
                      {result.settlement.status === 'settled_onchain'
                        ? 'Settled On-Chain'
                        : result.settlement.status === 'settled_offchain'
                          ? 'Settled Off-Chain'
                          : result.settlement.status === 'open'
                            ? 'Open (payments batched)'
                            : result.settlement.status === 'pending'
                              ? 'Pending Settlement'
                              : result.settlement.status}
                    </span>
                  </div>
                  {result.settlement.status === 'open' && (
                    <div className="glass rounded-lg p-3 text-blue-300 text-xs">
                      Gas Savings: All {result.steps.length} payments are batched in this channel.
                      Settle when ready via your Wallet page.
                    </div>
                  )}
                  {result.settlement.txHash && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tx Hash</span>
                      <a
                        href={result.settlement.explorerUrl || `https://sepolia.basescan.org/tx/${result.settlement.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline font-mono text-xs"
                      >
                        {result.settlement.txHash.slice(0, 16)}...
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Channel</span>
                    <span className="font-mono text-xs text-gray-300">
                      {result.settlement.channelId.slice(0, 12)}...
                    </span>
                  </div>
                  {result.settlement.error && (
                    <div className="text-red-400 text-xs mt-1">
                      Note: {result.settlement.error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Revenue Distribution */}
            {result.revenueDistribution && (
              <div className="mt-6 glass rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-3">Revenue Distribution</h3>
                <div className="space-y-2">
                  {result.revenueDistribution.participants.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-400 font-mono">
                        {p.wallet.slice(0, 10)}...
                      </span>
                      <span className="text-emerald-400">
                        ${p.payment.toFixed(4)} ({(p.share * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}