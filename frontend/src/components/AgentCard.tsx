import { Globe, Palette, Search, FileText, Bot, Star, Circle } from 'lucide-react';
import type { Agent } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  agent: Agent;
}

export function AgentCard({ agent }: Props) {
  const firstService = agent.services[0];
  const firstPricing = agent.pricing[0];

  const serviceType = typeof firstService === 'string'
    ? firstService
    : (firstService as any)?.type || 'unknown';

  const price = typeof firstPricing === 'number'
    ? firstPricing
    : (firstPricing as any)?.priceUsdc
      ? (firstPricing as any).priceUsdc * 1000000
      : 50000;

  const serviceIcons: Record<string, typeof Globe> = {
    'translation': Globe,
    'image_gen': Palette,
    'scraper': Search,
    'summarizer': FileText,
  };

  const ServiceIcon = serviceIcons[serviceType] || Bot;

  return (
    <Card className="hover:border-blue-500/50 transition-all duration-200 group">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <ServiceIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold capitalize">
              {serviceType.replace('_', ' ')} Agent
            </h3>
            <p className="text-sm text-gray-400 font-mono">
              {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-green-400">
              ${(price / 1000000).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">per task</p>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{(agent.reputation / 200).toFixed(1)}/5</span>
            </div>
            <p className="text-xs text-gray-400">reputation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={agent.active ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            <Circle
              className={`w-2 h-2 ${agent.active ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'}`}
            />
            {agent.active ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}