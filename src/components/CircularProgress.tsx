import React from 'react';

interface CircularProgressProps {
  percent: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ percent }) => {
  const radius = 20;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

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
        <circle
          className={`${colorClass} transition-all duration-500 ease-in-out`}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className={`absolute text-[10px] font-bold ${colorClass}`}>
        {percent}%
      </span>
    </div>
  );
};

export default CircularProgress;