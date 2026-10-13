import React, { useEffect, useRef } from 'react';
import { motion, useSpring } from 'framer-motion';

const AnimatedPercent: React.FC<{ value: number; color: string }> = ({ value, color }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const spring = useSpring(0, { stiffness: 60, damping: 20 });

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    useEffect(() => {
        const unsubscribe = spring.on('change', (latest) => {
            if (ref.current) {
                ref.current.textContent = `${Math.round(latest)}%`;
            }
        });
        return unsubscribe;
    }, [spring]);

    return (
        <span ref={ref} className="text-sm font-bold tracking-tight" style={{ color }}>
            {value}%
        </span>
    );
};

const ProgressDisplay: React.FC<{ title: string; progress: number; color: string; }> = ({ title, progress, color }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
            <AnimatedPercent value={progress} color={color} />
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="h-2.5 rounded-full relative" 
                style={{ 
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}50` 
                }}
            />
        </div>
    </div>
);

export default ProgressDisplay;