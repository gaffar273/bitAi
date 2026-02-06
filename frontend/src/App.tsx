import { useState } from 'react';
import { Bot, Activity, TrendingDown, Workflow, Wallet, CreditCard } from 'lucide-react';
import { AgentList } from './components/AgentList';
import { TransactionFeed } from './components/TransactionFeed';
import { GasSavings } from './components/GasSavings';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { WalletConnect } from './components/WalletConnect';
import { PaymentDashboard } from './components/PaymentDashboard';
import { useWallet } from './hooks/use-wallet';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';


type Tab = 'agents' | 'transactions' | 'savings' | 'workflow' | 'payments';

const TAB_STORAGE_KEY = 'roguecapital_active_tab';

function getInitialTab(): Tab {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && ['agents', 'transactions', 'savings', 'workflow', 'payments'].includes(saved)) {
      return saved as Tab;
    }
  } catch {
    // ignore
  }
  return 'agents';
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  // Initialize wallet hook
  const { wallet, connectWallet, disconnectWallet, refreshBalance } = useWallet();

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // ignore
    }
  };

  const tabs = [
    { id: 'agents' as Tab, icon: Bot, label: 'Agents' },
    { id: 'workflow' as Tab, icon: Workflow, label: 'Workflow' },
    { id: 'payments' as Tab, icon: CreditCard, label: 'Payments' },
    { id: 'transactions' as Tab, icon: Activity, label: 'Live Feed' },
    { id: 'savings' as Tab, icon: TrendingDown, label: 'Gas Savings' },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-wider font-['Michroma'] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                Rogue Capital
              </h1>
              <p className="text-sm text-gray-400 mt-1 font-['Outfit'] tracking-widest uppercase">
                Autonomous AI Agent Marketplace
              </p>
            </div>

            {/* Wallet Integration */}
            <div className="flex items-center gap-4">
              <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant={wallet.address ? "outline" : "default"}
                    className={wallet.address
                      ? "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                    }
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    {wallet.address ? (
                      <span className="font-mono">
                        {formatAddress(wallet.address)}
                        <span className="mx-2 text-gray-600">|</span>
                        {parseFloat(wallet.ethBalance).toFixed(3)} ETH
                      </span>
                    ) : (
                      "Connect Wallet"
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-white p-0 overflow-hidden">
                  <DialogTitle className="sr-only">Wallet Connection</DialogTitle>
                  <div className="p-6">
                    <WalletConnect
                      wallet={wallet}
                      connectWallet={connectWallet}
                      disconnectWallet={disconnectWallet}
                      refreshBalance={refreshBalance}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-800/50 bg-gray-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    relative px-4 py-3 flex items-center gap-2 font-medium text-sm
                    transition-all duration-200
                    ${isActive
                      ? 'text-blue-400'
                      : 'text-gray-400 hover:text-gray-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>

                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'agents' && <AgentList />}
        {activeTab === 'transactions' && <TransactionFeed />}
        {activeTab === 'savings' && <GasSavings />}
        {activeTab === 'workflow' && (
          <WorkflowBuilder
            wallet={wallet}
            onConnectWallet={() => setWalletDialogOpen(true)}
          />
        )}
        {activeTab === 'payments' && <PaymentDashboard wallet={wallet} />}
      </main>
    </div>
  );
}

export default App;
