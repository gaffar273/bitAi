import type { Agent } from '../types';

interface Props {
  agent: Agent;
}

export function AgentCard({ agent }: Props) {
  // Handle both possible data structures
  const firstService = agent.services[0];
  const firstPricing = agent.pricing[0];
  
  // Extract service type safely
  const serviceType = typeof firstService === 'string' 
    ? firstService 
    : (firstService as any)?.type || 'unknown';
  
  // Extract price safely
  const price = typeof firstPricing === 'number'
    ? firstPricing
    : (firstPricing as any)?.priceUsdc 
      ? (firstPricing as any).priceUsdc * 1000000 
      : 50000;

  const serviceEmoji: Record<string, string> = {
    'translation': '🌍',
    'image_gen': '🎨',
    'scraper': '🔍',
    'summarizer': '📝',
  };

  return (
    <div className="border border-gray-700 rounded-lg p-6 bg-gray-800 hover:bg-gray-750 transition">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{serviceEmoji[serviceType] || '🤖'}</span>
        <div>
          <h3 className="text-lg font-semibold capitalize">
            {serviceType.replace('_', ' ')} Agent
          </h3>
          <p className="text-sm text-gray-400">
            {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-green-400">
            ${(price / 1000000).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">per task</p>
        </div>
        
        <div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">⭐</span>
            <span className="text-sm">{(agent.reputation / 200).toFixed(1)}/5</span>
          </div>
          <p className="text-xs text-gray-400">reputation</p>
        </div>
      </div>
      
      <div className="mt-4">
        <span className={`inline-block px-2 py-1 rounded text-xs ${
          agent.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
        }`}>
          {agent.active ? '🟢 Online' : '🔴 Offline'}
        </span>
      </div>
    </div>
  );
}