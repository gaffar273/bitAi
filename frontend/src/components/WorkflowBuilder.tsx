import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Globe, Palette, Target, Play, Plus, X, ArrowDown, ChevronRight, Info } from 'lucide-react';
import type { WorkflowStep, WorkflowResult, Agent } from '../types';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const SERVICE_CONFIGS = {
  scraper: { icon: Search, name: 'Web Scraper', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', price: 0.02 },
  summarizer: { icon: FileText, name: 'Summarizer', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', price: 0.03 },
  translation: { icon: Globe, name: 'Translator', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', price: 0.05 },
  image_gen: { icon: Palette, name: 'Image Generator', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', price: 0.10 },
  orchestrator: { icon: Target, name: 'Orchestrator', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', price: 0.00 },
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
    if (steps.length === 0) return;

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
    } finally {
      setExecuting(false);
    }
  };

  const totalCost = steps.reduce((sum, step) => {
    return sum + SERVICE_CONFIGS[step.serviceType].price;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Target className="w-8 h-8 text-primary" />
          Workflow Builder
        </h1>
        <p className="text-gray-400">
          Orchestrate multi-agent autonomous workflows
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Service Palette */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Services</CardTitle>
              <CardDescription>Click to add tasks to workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(SERVICE_CONFIGS).map(([key, config]) => {
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
                          ${config.price.toFixed(2)} / task
                        </div>
                      </div>
                    </div>
                    <Plus className={`w-5 h-5 ${config.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </button>
                );
              })}
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
                    ? `${steps.length} steps · Est. Cost: $${totalCost.toFixed(2)}`
                    : 'Build your agent pipeline'}
                </CardDescription>
              </div>
              {steps.length > 0 && (
                <Button
                  onClick={executeWorkflow}
                  disabled={executing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {executing ? (
                    <>Running Pipeline...</>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      Execute
                    </>
                  )}
                </Button>
              )}
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
                                  ${config.price.toFixed(2)}
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
                </div>

                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-800" />
                  <div className="space-y-6 relative">
                    {result.steps.map((step, index) => {
                      const config = SERVICE_CONFIGS[step.serviceType];
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
                              <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white mb-1">
                                    Step {step.step}: {config.name}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="font-mono">{step.agentWallet.slice(0, 8)}...</span>
                                    <span>•</span>
                                    <span>{step.duration}ms</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="outline" className={`${config.color} ${config.border} bg-transparent`}>
                                    Success
                                  </Badge>
                                </div>
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

// Importing missing lucide icon
import { CheckCircle2 } from 'lucide-react';