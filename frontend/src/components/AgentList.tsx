import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { api } from '../services/api';
import type { Agent, ServiceType } from '../types';
import { AgentCard } from './AgentCard';
import { Card, CardContent } from '@/components/ui/card';
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
        // Fetch all agents first, then filter client-side for better search UX
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
    // 1. Service Type Filter
    const matchesType = filter === 'all'
      ? true
      : agent.services.some(s => s.type === filter);

    // 2. Search Query Filter (Name/Type, Wallet, ID, Description)
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === ''
      ? true
      : agent.wallet.toLowerCase().includes(normalizedQuery) ||
      agent.id.toLowerCase().includes(normalizedQuery) ||
      // Search by "Name" (Service Type)
      agent.services.some(s => s.type.replace('_', ' ').toLowerCase().includes(normalizedQuery)) ||
      // Search by Description
      agent.services.some(s => s.description.toLowerCase().includes(normalizedQuery));

    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Agent Marketplace</h1>
          <p className="text-gray-400">Browse autonomous AI agents available for hire</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, wallet or capability..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-900/50 border-gray-800"
          />
        </div>
        <div className="w-full sm:w-[240px]">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full bg-gray-900/50 border-gray-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Agent Grid */}
      {!loading && filteredAgents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.wallet} agent={agent} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAgents.length === 0 && (
        <Card className="max-w-md mx-auto">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Agents Found</h3>
            <p className="text-gray-400 text-sm">
              {filter === 'all'
                ? 'No agents have been registered yet.'
                : `No ${filter.replace('_', ' ')} agents available.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Footer */}
      {!loading && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {agents.length}
              </div>
              <div className="text-sm text-gray-400">
                Total Agents
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                {filteredAgents.length}
              </div>
              <div className="text-sm text-gray-400">Visible Agents</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {agents.length > 0
                  ? Math.round(agents.reduce((sum, a) => sum + a.reputation, 0) / agents.length / 200)
                  : 0}/5
              </div>
              <div className="text-sm text-gray-400">Average Rating</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}