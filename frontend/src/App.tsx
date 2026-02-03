import { useState } from 'react';
import { AgentList } from './components/AgentList';
import { TransactionFeed } from './components/TransactionFeed';

function App() {
  const [activeTab, setActiveTab] = useState<'agents' | 'transactions'>('agents');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <h1 className="text-2xl font-bold">⚡ AgentSwarm</h1>
          <p className="text-sm text-gray-400">Autonomous AI Agent Marketplace</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-8 flex gap-6">
          <button
            onClick={() => setActiveTab('agents')}
            className={`py-4 px-2 border-b-2 transition ${
              activeTab === 'agents'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            🤖 Agents
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-4 px-2 border-b-2 transition ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            💸 Live Feed
          </button>
        </div>
      </nav>

      {/* Content */}
      <main>
        {activeTab === 'agents' && <AgentList />}
        {activeTab === 'transactions' && <TransactionFeed />}
      </main>
    </div>
  );
}

export default App;