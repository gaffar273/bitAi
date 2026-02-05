import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkflowStep, WorkflowResult, Agent } from '../types';
import { api } from '../services/api';

const SERVICE_CONFIGS = {
  scraper: { emoji: '🔍', name: 'Web Scraper', color: 'blue', price: 0.02 },
  summarizer: { emoji: '📝', name: 'Summarizer', color: 'purple', price: 0.03 },
  translation: { emoji: '🌍', name: 'Translator', color: 'green', price: 0.05 },
  image_gen: { emoji: '🎨', name: 'Image Generator', color: 'pink', price: 0.10 },
  orchestrator: { emoji: '🎯', name: 'Orchestrator', color: 'orange', price: 0.00 },
};

export function WorkflowBuilder() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Load agents on mount
  useState(() => {
    api.getAgents().then(res => setAgents(res.data.data));
  });

  const addStep = (serviceType: WorkflowStep['serviceType']) => {
    setSteps([...steps, { serviceType }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const executeWorkflow = async () => {
    if (steps.length === 0) {
      alert('Add at least one step to the workflow!');
      return;
    }

    // Get any agent as orchestrator (in real app, user would select)
    if (agents.length === 0) {
      alert('No agents available. Please register agents first.');
      return;
    }

    setExecuting(true);
    setResult(null);

    try {
      const response = await api.executeWorkflow({
        orchestratorWallet: agents[0].wallet,
        steps
      });
      setResult(response.data.data);
    } catch (error) {
      console.error('Workflow failed:', error);
      alert('Workflow execution failed. Check console for details.');
    } finally {
      setExecuting(false);
    }
  };

  const totalCost = steps.reduce((sum, step) => {
    return sum + SERVICE_CONFIGS[step.serviceType].price;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🔨 Workflow Builder</h1>
        <p className="text-gray-400">
          Build multi-agent workflows with drag-and-drop simplicity
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
                onClick={() => addStep(key as WorkflowStep['serviceType'])}
                className={`w-full p-4 rounded-lg border-2 border-${config.color}-500 bg-${config.color}-900/20 hover:bg-${config.color}-900/40 transition text-left flex items-center justify-between`}
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
                {steps.length} step{steps.length !== 1 ? 's' : ''} · ${totalCost.toFixed(2)} total
              </div>
            )}
          </div>

          {/* Workflow Steps */}
          <div className="bg-gray-800 rounded-lg p-6 min-h-[400px]">
            {steps.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-center">
                <div>
                  <div className="text-6xl mb-4">👈</div>
                  <p>Add services from the left to build your workflow</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
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
                          ✕
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Arrow connector */}
                {steps.length > 1 && (
                  <div className="text-center text-gray-600">
                    ↓ Output flows to next step
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
              disabled={executing}
              className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Executing Workflow...
                </span>
              ) : (
                '▶️ Execute Workflow'
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
            ✅ Workflow Complete!
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
                ${result.totalCost.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400">
                {(result.totalDuration / 1000).toFixed(1)}s
              </div>
              <div className="text-sm text-gray-400">Total Time</div>
            </div>
          </div>

          <div className="space-y-4">
            {result.steps.map((step, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {SERVICE_CONFIGS[step.serviceType as keyof typeof SERVICE_CONFIGS].emoji}
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
                      ${step.cost.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {step.duration}ms
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Agent: {step.agentWallet.slice(0, 10)}...
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}