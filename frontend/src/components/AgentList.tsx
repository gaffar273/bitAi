import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Zap } from 'lucide-react';
import { api } from '../services/api';
import type { Agent } from '../types';
import { AgentCard } from './AgentCard';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAgents = async () => {
      setLoading(true);
      try {
        const response = await api.getAgents();
        if (isMounted) {
          setAgents(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    loadAgents();

    return () => {
      isMounted = false;
    };
  }, []);

  const serviceTypes = [
    { value: 'all', label: 'All Categories' },
    { value: 'research', label: 'Deep Research' },
    { value: 'coding', label: 'Coding Assistant' },
    { value: 'data_analysis', label: 'Data Analysis' },
    { value: 'scraper', label: 'Web Scraper' },
    { value: 'translation', label: 'Translation' },
    { value: 'summarizer', label: 'Summarizer' },
    { value: 'image_gen', label: 'Image Generation' },
    { value: 'security', label: 'Security Audit' },
    { value: 'copywriting', label: 'Copywriting' },
    { value: 'marketing', label: 'Marketing SEO' },
    { value: 'pdf_loader', label: 'PDF Processing' },
  ];

  const filteredAgents = agents.filter(agent => {
    const matchesType = filter === 'all'
      ? true
      : agent.services.some(s => s.type === filter);

    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === ''
      ? true
      : agent.wallet.toLowerCase().includes(normalizedQuery) ||
      agent.id.toLowerCase().includes(normalizedQuery) ||
      agent.services.some(s => s.type.replace('_', ' ').toLowerCase().includes(normalizedQuery)) ||
      agent.services.some(s => s.description.toLowerCase().includes(normalizedQuery));

    return matchesType && matchesSearch;
  });

  // Stagger animation for cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-white">Agent</span>
              <span className="text-yellow-400 ml-2">Marketplace</span>
            </h1>
          </div>
          <p className="text-gray-400 ml-13">Discover and hire autonomous AI agents for any task</p>
        </div>
      </motion.div>

      {/* Search & Filter Bar - Glass Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass rounded-2xl p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, wallet or capability..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-amber-500/50"
            />
          </div>
          <div className="w-full sm:w-[240px]">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl text-white">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/10">
                {serviceTypes.map(type => (
                  <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass rounded-2xl p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/10 rounded-xl" />
                <div className="flex-1">
                  <div className="h-5 bg-white/10 rounded-lg mb-2 w-2/3" />
                  <div className="h-4 bg-white/10 rounded-lg w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-white/10 rounded-lg mb-3" />
              <div className="h-8 bg-white/10 rounded-lg w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Agent Grid */}
      {!loading && filteredAgents.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAgents.map((agent) => (
            <motion.div key={agent.wallet} variants={itemVariants}>
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && filteredAgents.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-16 text-center max-w-md mx-auto"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-yellow-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Agents Found</h3>
          <p className="text-gray-400 text-sm">
            {filter === 'all'
              ? 'No agents have been registered yet.'
              : `No ${filter.replace('_', ' ')} agents available.`}
          </p>
        </motion.div>
      )}

      {/* Stats Footer */}
      {!loading && agents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="glass rounded-2xl p-6 text-center hover-glow">
            <div className="text-4xl font-bold text-yellow-400 mb-2">
              {agents.length}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-wider">
              Total Agents
            </div>
          </div>

          <div className="glass rounded-2xl p-6 text-center hover-glow">
            <div className="text-4xl font-bold text-emerald-400 mb-2">
              {filteredAgents.length}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-wider">
              Matching Results
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}