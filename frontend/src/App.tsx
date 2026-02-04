import { useState } from 'react';
import { AgentList } from './components/AgentList';
import { TransactionFeed } from './components/TransactionFeed';
import { GasSavings } from './components/GasSavings';
import { WorkflowBuilder } from './components/WorkflowBuilder';

type Tab = 'agents' | 'transactions' | 'savings' | 'workflow';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('agents');

  const tabs = [
    { id: 'agents' as Tab, icon: '🤖', label: 'Agents' },
    { id: 'transactions' as Tab, icon: '💸', label: 'Live Feed' },
    { id: 'savings' as Tab, icon: '💰', label: 'Gas Savings' },
    { id: 'workflow' as Tab, icon: '🔨', label: 'Workflow' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">⚡</span>
                AgentSwarm
              </h1>
              <p className="text-sm text-gray-400">
                Autonomous AI Agent Marketplace
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Powered by</div>
              <div className="text-xl font-bold text-yellow-400">Yellow Network</div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-8 flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main>
        {activeTab === 'agents' && <AgentList />}
        {activeTab === 'transactions' && <TransactionFeed />}
        {activeTab === 'savings' && <GasSavings />}
        {activeTab === 'workflow' && <WorkflowBuilder />}
      </main>
    </div>
  );
}

export default App;