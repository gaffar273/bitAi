export function Footer() {
    return (
        <footer className="border-t border-gray-700/60 bg-gray-800/80 backdrop-blur-xl mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Team Name */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">Team:</span>
                        <span className="text-white font-bold text-lg">bitAi</span>
                    </div>

                    {/* Center: Event Info */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Built for</span>
                        <a
                            href="https://ethglobal.com/events/hackmoney"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 transition-all"
                        >
                            HackMoney
                        </a>
                        <span className="text-gray-400">by</span>
                        <a
                            href="https://ethglobal.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            ETHGlobal
                        </a>
                    </div>

                    {/* Right: Powered by Yellow */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Powered by</span>
                        <a
                            href="https://www.yellow.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center hover:opacity-80 transition-opacity"
                        >
                            <img
                                src="/src/Screenshot_2026-02-07_235743-removebg-preview.png"
                                alt="Yellow"
                                className="h-10 object-contain"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
