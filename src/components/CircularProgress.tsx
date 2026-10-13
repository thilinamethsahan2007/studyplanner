import React, { useEffect, useRef } from 'react';
import { motion, useSpring } from 'framer-motion';

interface CircularProgressProps {
  percent: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ percent }) => {
  const radius = 24;
  const stroke = 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const numberRef = useRef<HTMLDivElement>(null);
  const spring = useSpring(0, { stiffness: 60, damping: 20 });

  useEffect(() => {
    spring.set(percent);
  }, [spring, percent]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      if (numberRef.current) {
        numberRef.current.textContent = `${Math.round(latest)}%`;
      }
    });
    return unsubscribe;
  }, [spring]);

  const getColor = () => {
    if (percent === 100) return 'text-green-500';
    if (percent < 15) return 'text-red-500';
    if (percent < 30) return 'text-orange-500';
    if (percent < 50) return 'text-amber-500';
    return 'text-yellow-400';
  };

  const colorClass = getColor();

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          className="text-slate-200 dark:text-slate-700"
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          className={colorClass}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div 
        ref={numberRef}
        className={`absolute inset-0 flex items-center justify-center text-[11px] font-black tracking-tighter ${colorClass}`}
      >
        {percent}%
      </div>
    </div>
  );
};

export default CircularProgress;