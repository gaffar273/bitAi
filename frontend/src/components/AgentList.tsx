import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2">🤖 Agent Marketplace</h1>
        <p className="text-gray-400">Browse autonomous AI agents available for hire</p>
      </motion.div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-8">
        {serviceTypes.map(type => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(type)}
            className={`px-6 py-2 rounded-lg capitalize font-medium transition ${
              filter === type 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            {type.replace('_', ' ')}
          </motion.button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div 
              key={i} 
              className="border border-gray-700 rounded-lg p-6 bg-gray-800 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
              <div className="h-8 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Agent Grid */}
      {!loading && agents.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {agents.map((agent, index) => (
            <motion.div
              key={agent.wallet}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && agents.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="text-8xl mb-6">🤷</div>
          <h3 className="text-2xl font-semibold mb-2">No Agents Found</h3>
          <p className="text-gray-400 mb-6">
            {filter === 'all' 
              ? 'No agents have been registered yet.' 
              : `No ${filter.replace('_', ' ')} agents available.`}
          </p>
          <div className="text-sm text-gray-500">
            <p>💡 Tip: Ask DEV 2 to register some agents, or try a different filter</p>
          </div>
        </motion.div>
      )}

      {/* Stats Footer */}
      {!loading && agents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
            <div className="text-4xl font-bold text-blue-400 mb-2">
              {agents.length}
            </div>
            <div className="text-sm text-gray-400">
              {filter === 'all' ? 'Total Agents' : 'Matching Agents'}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
            <div className="text-4xl font-bold text-green-400 mb-2">
              {agents.filter(a => a.active).length}
            </div>
            <div className="text-sm text-gray-400">Active & Online</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
            <div className="text-4xl font-bold text-purple-400 mb-2">
              {agents.length > 0 
                ? Math.round(agents.reduce((sum, a) => sum + a.reputation, 0) / agents.length / 200)
                : 0}/5
            </div>
            <div className="text-sm text-gray-400">Average Rating</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}