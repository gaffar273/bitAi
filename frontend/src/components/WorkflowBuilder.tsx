import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkflowStep, WorkflowResult, Agent } from '../types';
import { api } from '../services/api';

const SERVICE_CONFIGS = {
  scraper: { emoji: '🔍', name: 'Web Scraper', color: 'blue', price: 0.01, placeholder: 'Enter URL to scrape...' },
  summarizer: { emoji: '📝', name: 'Summarizer', color: 'purple', price: 0.02, placeholder: 'Enter text to summarize...' },
  translation: { emoji: '🌍', name: 'Translator', color: 'green', price: 0.02, placeholder: 'Enter text to translate...' },
  image_gen: { emoji: '🎨', name: 'Image Generator', color: 'pink', price: 0.05, placeholder: 'Describe the image...' },
  pdf_loader: { emoji: '📄', name: 'PDF Loader', color: 'orange', price: 0.01, placeholder: 'PDF files will be auto-loaded...' },
};

type ServiceType = keyof typeof SERVICE_CONFIGS;

export function WorkflowBuilder() {
  const [steps, setSteps] = useState<{ serviceType: ServiceType }[]>([]);
  const [inputText, setInputText] = useState('');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load agents on mount - FIXED: using useEffect instead of useState
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

    setExecuting(true);
    setResult(null);
    setError(null);

    try {
      // Build workflow steps with input - first step gets the text, others chain
      const workflowSteps: WorkflowStep[] = steps.map((step, index) => ({
        serviceType: step.serviceType,
        input: index === 0 ? { text: inputText, url: inputText, prompt: inputText } : undefined,
      }));

      // Get connected user wallet
      const userWallet = localStorage.getItem('agentswarm_wallet_address');

      const response = await api.executeWorkflow({
        orchestratorWallet: agents[0].wallet,
        steps: workflowSteps,
        userWallet: userWallet || undefined // Pass user wallet if connected
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
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Workflow Builder</h1>
        <p className="text-gray-400">
          Build multi-agent workflows and execute them with real payments
        </p>
        {agents.length > 0 && (
          <p className="text-sm text-green-400 mt-2">
            {agents.length} agents available for hire
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* PROMPT INPUT - Main input area at the top */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-xl">
        <label className="block text-lg font-semibold text-white mb-3">
          Enter Your Prompt
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={getPlaceholder()}
          className="w-full h-40 p-4 bg-gray-900 border-2 border-gray-600 rounded-lg text-white text-lg placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
        />
        <p className="text-sm text-gray-400 mt-2">
          Type what you want to process, then add services below and click Execute
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Service Palette */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Available Services</h2>
          <div className="space-y-3">
            {Object.entries(SERVICE_CONFIGS).map(([key, config]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addStep(key as ServiceType)}
                className="w-full p-4 rounded-lg border-2 border-gray-600 bg-gray-800 hover:bg-gray-700 transition text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{config.emoji}</span>
                  <div>
                    <div className="font-semibold">{config.name}</div>
                    <div className="text-sm text-gray-400">
                      ${config.price.toFixed(2)} per task
                    </div>
                  </div>
                </div>
                <span className="text-2xl text-gray-500">+</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right: Workflow Canvas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Your Workflow</h2>
            {steps.length > 0 && (
              <div className="text-sm text-gray-400">
                {steps.length} step{steps.length !== 1 ? 's' : ''} - ${totalCost.toFixed(2)} total
              </div>
            )}
          </div>

          {/* Workflow Steps */}
          <div className="bg-gray-800 rounded-lg p-6 min-h-[200px]">
            {steps.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-center">
                <div>
                  <div className="text-4xl mb-4">+</div>
                  <p>Click a service on the left to add it</p>
                </div>
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
                        className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <span className="text-2xl">{config.emoji}</span>
                          <div>
                            <div className="font-semibold">{config.name}</div>
                            <div className="text-sm text-gray-400">
                              ${config.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeStep(index)}
                          className="text-red-400 hover:text-red-300 text-xl"
                        >
                          X
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {steps.length > 1 && (
                  <div className="text-center text-gray-600 text-sm">
                    Output flows from step 1 to step {steps.length}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Execute Button */}
          {steps.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={executeWorkflow}
              disabled={executing || !inputText.trim()}
              className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Executing Workflow...
                </span>
              ) : (
                'Execute Workflow'
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 bg-green-900/20 border-2 border-green-500 rounded-xl p-8"
        >
          <h2 className="text-3xl font-bold mb-6 text-green-400">
            Workflow Complete!
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400">
                {result.steps.length}
              </div>
              <div className="text-sm text-gray-400">Steps Executed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400">
                ${result.totalCost.toFixed(4)}
              </div>
              <div className="text-sm text-gray-400">Total Cost (USDC)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400">
                {(result.totalDuration / 1000).toFixed(1)}s
              </div>
              <div className="text-sm text-gray-400">Total Time</div>
            </div>
          </div>

          {/* Step Results */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Step Details</h3>
            {result.steps.map((step, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {SERVICE_CONFIGS[step.serviceType as ServiceType]?.emoji || '?'}
                    </span>
                    <div>
                      <div className="font-semibold">Step {step.step}</div>
                      <div className="text-sm text-gray-400 capitalize">
                        {step.serviceType.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-400">
                      ${step.cost.toFixed(4)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {step.duration}ms
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  Agent: {step.agentWallet.slice(0, 10)}...{step.agentWallet.slice(-8)}
                </div>
                {/* Show output preview */}
                {step.output && (
                  <div className="mt-2 p-3 bg-gray-900 rounded text-sm text-gray-300 max-h-32 overflow-y-auto">
                    {String(typeof step.output === 'string'
                      ? (step.output as string).slice(0, 500) + ((step.output as string).length > 500 ? '...' : '')
                      : JSON.stringify(step.output, undefined, 2).slice(0, 500))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Revenue Distribution */}
          {result.revenueDistribution && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Revenue Distribution</h3>
              <div className="space-y-2">
                {result.revenueDistribution.participants.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      {p.wallet.slice(0, 10)}...
                    </span>
                    <span className="text-green-400">
                      ${p.payment.toFixed(4)} ({(p.share * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}