import React from 'react';
import { Home, Search, Plus, Clock, Folder, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../utils/haptics';

export type TabType = 'home' | 'search' | 'timeline' | 'collections';

export interface TabBarProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenCapture: () => void;
  isCaptureOpen?: boolean;
}

export const TabBar: React.FC<TabBarProps> = ({
  currentTab,
  onChangeTab,
  onOpenCapture,
  isCaptureOpen = false,
}) => {
  const handleTabClick = (tab: TabType) => {
    haptics.impactLight();
    onChangeTab(tab);
  };

  const handleCaptureClick = () => {
    haptics.impactMedium();
    onOpenCapture();
  };

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'search', label: 'Cari', icon: Search },
    { id: 'timeline', label: 'Linimasa', icon: Clock },
    { id: 'collections', label: 'Koleksi', icon: Folder },
  ];

  const renderTabButton = (tab: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = currentTab === tab.id;
    const Icon = tab.icon;

    return (
      <motion.button
        key={tab.id}
        whileTap={{ scale: 0.88 }}
        onClick={() => handleTabClick(tab.id)}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 cursor-pointer relative z-10 transition-colors ${
          isActive ? 'text-[#165a4c] font-extrabold' : 'text-stone-400 hover:text-stone-600'
        }`}
      >
        {/* Sliding Active Pill Background */}
        {isActive && (
          <motion.div
            layoutId="activeTabPill"
            className="absolute inset-x-2 inset-y-1 bg-emerald-700/10 rounded-2xl -z-10 border border-emerald-600/15"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}

        <motion.div
          animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
          className="relative"
        >
          <Icon
            className={`w-5 h-5 transition-transform ${
              isActive ? 'stroke-[2.5] fill-[#165a4c]/15 text-[#165a4c]' : 'stroke-[1.7]'
            }`}
          />
        </motion.div>

        <span className="text-[10px] tracking-tight">{tab.label}</span>

        {/* Sliding Active Glowing Dot Indicator */}
        {isActive && (
          <motion.div
            layoutId="activeTabDot"
            className="w-1.5 h-1.5 rounded-full bg-[#165a4c] shadow-xs shadow-emerald-700/50 -mb-1"
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          />
        )}
      </motion.button>
    );
  };

  return (
    <nav
      className="shrink-0 w-full z-40 md:hidden bg-gradient-to-t from-emerald-50/95 via-white/95 to-white/95 backdrop-blur-xl border-t border-emerald-800/15 select-none shadow-sm"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <div className="max-w-md mx-auto px-3 h-16 flex items-center justify-between relative">
        {/* Tab 1: Beranda */}
        {renderTabButton(tabs[0])}

        {/* Tab 2: Cari */}
        {renderTabButton(tabs[1])}

        {/* Center Action: Floating Deep Pulse (+) or (X) Button */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-6 relative z-20">
          <div className="relative flex items-center justify-center">
            {/* Multi-layer Outer Luminous Pulse Waves */}
            {!isCaptureOpen && (
              <>
                <motion.div
                  className="absolute rounded-full bg-emerald-500/35 pointer-events-none -inset-3"
                  animate={{
                    scale: [1, 1.55, 1.95],
                    opacity: [0.75, 0.25, 0],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
                <motion.div
                  className="absolute rounded-full bg-teal-400/30 pointer-events-none -inset-2"
                  animate={{
                    scale: [1, 1.35, 1.7],
                    opacity: [0.65, 0.2, 0],
                  }}
                  transition={{
                    duration: 2.4,
                    delay: 0.5,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
                <motion.div
                  className="absolute rounded-full bg-emerald-400/25 pointer-events-none -inset-1"
                  animate={{
                    scale: [1, 1.2, 1.45],
                    opacity: [0.55, 0.15, 0],
                  }}
                  transition={{
                    duration: 2.4,
                    delay: 1.0,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              </>
            )}

            {/* Core Animated Button with Floating Bounce & Dynamic Glow */}
            <motion.button
              onClick={handleCaptureClick}
              animate={
                isCaptureOpen
                  ? { scale: 1, y: 0, boxShadow: '0 8px 20px -3px rgba(22, 90, 76, 0.4)' }
                  : {
                      scale: [1, 1.1, 1],
                      y: [0, -3.5, 0],
                      boxShadow: [
                        '0 10px 24px -3px rgba(22, 90, 76, 0.4), 0 0 16px rgba(16, 185, 129, 0.35)',
                        '0 20px 40px -2px rgba(22, 90, 76, 0.7), 0 0 32px rgba(16, 185, 129, 0.65)',
                        '0 10px 24px -3px rgba(22, 90, 76, 0.4), 0 0 16px rgba(16, 185, 129, 0.35)',
                      ],
                    }
              }
              transition={
                isCaptureOpen
                  ? { duration: 0.2 }
                  : {
                      duration: 2.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
              whileHover={{ scale: 1.14 }}
              whileTap={{ scale: 0.86 }}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#0d3b31] via-[#165a4c] to-[#228b74] text-white flex flex-col items-center justify-center border-4 border-[#FAF9F6] relative z-10 cursor-pointer overflow-hidden shadow-xl"
              aria-label={isCaptureOpen ? 'Tutup' : 'Simpan Baru'}
            >
              {/* Subtle glass reflection highlight */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent pointer-events-none rounded-full" />

              <AnimatePresence mode="wait" initial={false}>
                {isCaptureOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="flex items-center justify-center"
                  >
                    <X className="w-6 h-6 stroke-[3]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="plus"
                    initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="flex items-center justify-center"
                  >
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {isCaptureOpen && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-bold text-[#165a4c] mt-0.5"
            >
              Tutup
            </motion.span>
          )}
        </div>

        {/* Tab 3: Linimasa */}
        {renderTabButton(tabs[2])}

        {/* Tab 4: Koleksi */}
        {renderTabButton(tabs[3])}
      </div>
    </nav>
  );
};
