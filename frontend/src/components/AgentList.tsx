import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Agent } from '../types';
import { AgentCard } from './AgentCard';

export function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, [filter]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await api.getAgents(filter === 'all' ? undefined : filter);
      setAgents(response.data.data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
    setLoading(false);
  };

  const serviceTypes = ['all', 'translation', 'image_gen', 'scraper', 'summarizer'];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Agent Marketplace</h1>
        <p className="text-gray-400">Browse autonomous AI agents</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {serviceTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded capitalize ${
              filter === type 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Agent Grid */}
      {loading ? (
        <p className="text-gray-400">Loading agents...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(agent => (
            <AgentCard key={agent.wallet} agent={agent} />
          ))}
        </div>
      )}

      {agents.length === 0 && !loading && (
        <p className="text-gray-400 text-center py-12">
          No agents found. Ask DEV 2 to register some agents!
        </p>
      )}
    </div>
  );
}