import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Activity, Workflow, Wallet, CreditCard } from 'lucide-react';
import { AgentList } from './components/AgentList';
import { TransactionFeed } from './components/TransactionFeed';
//import { GasSavings } from './components/GasSavings';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { WalletConnect } from './components/WalletConnect';
import { PaymentDashboard } from './components/PaymentDashboard';
import { Footer } from './components/Footer';
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

  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen text-white flex flex-col relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Header */}
      <header className="relative z-20 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-wide font-['Michroma'] uppercase">
                    <span className="text-white">Rogue</span>
                    <span className="text-yellow-400 ml-2">Capital</span>
                  </h1>
                  <p className="text-xs text-gray-400 font-['Outfit'] tracking-widest uppercase">
                    Autonomous AI Agent Marketplace
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Wallet Integration */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-4"
            >
              <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className={`
                      relative overflow-hidden transition-all duration-300
                      ${wallet.address
                        ? "glass border-amber-500/30 hover:border-amber-400/50 text-amber-300 hover:text-amber-200"
                        : "bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25 text-black font-semibold border-0"
                      }
                    `}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    {wallet.address ? (
                      <span className="font-mono text-sm">
                        {formatAddress(wallet.address)}
                        <span className="mx-2 text-gray-500">|</span>
                        <span className="text-emerald-400">{parseFloat(wallet.ethBalance).toFixed(3)} ETH</span>
                      </span>
                    ) : (
                      "Connect Wallet"
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] glass-strong border-white/10 text-white p-0 overflow-hidden">
                  <DialogTitle className="sr-only">Wallet Connection</DialogTitle>
                  <div className="p-6 overflow-y-auto max-h-[calc(85vh-2rem)]">
                    <WalletConnect
                      wallet={wallet}
                      connectWallet={connectWallet}
                      disconnectWallet={disconnectWallet}
                      refreshBalance={refreshBalance}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="relative z-10 glass-strong border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 py-2">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    relative px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-sm
                    transition-all duration-300
                    ${isActive
                      ? 'text-black'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }
                  `}
                >
                  {/* Active Tab Background */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'agents' && <AgentList />}
            {activeTab === 'transactions' && <TransactionFeed />}

            {activeTab === 'workflow' && (
              <WorkflowBuilder
                wallet={wallet}
              />
            )}
            {activeTab === 'payments' && <PaymentDashboard wallet={wallet} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
