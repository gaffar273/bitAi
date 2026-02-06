import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../services/api';
import type { Agent, ServiceType } from '../types';
import { AgentCard } from './AgentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAgents = async () => {
      setLoading(true);
      try {
        const serviceFilter = filter === 'all' ? undefined : filter as ServiceType;
        const response = await api.getAgents(serviceFilter);
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
  }, [filter]);

  const serviceTypes = ['all', 'translation', 'image_gen', 'scraper', 'summarizer'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Agent Marketplace</h1>
        <p className="text-gray-400">Browse autonomous AI agents available for hire</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {serviceTypes.map(type => (
          <Button
            key={type}
            variant={filter === type ? "default" : "outline"}
            onClick={() => setFilter(type)}
            className="capitalize"
          >
            {type.replace('_', ' ')}
          </Button>
        ))}
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
      {!loading && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent.wallet} agent={agent} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && agents.length === 0 && (
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
                {filter === 'all' ? 'Total Agents' : 'Matching Agents'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                {agents.filter(a => a.active).length}
              </div>
              <div className="text-sm text-gray-400">Active & Online</div>
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