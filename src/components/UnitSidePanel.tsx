import React from 'react';
import { Unit } from '../types';
import CircularProgress from './CircularProgress';

interface UnitSidePanelProps {
  unit: Unit;
  progress: number;
}

const UnitSidePanel: React.FC<UnitSidePanelProps> = ({ unit, progress }) => {
  return (
    <div className="flex-shrink-0">
        <CircularProgress percent={progress} />
    </div>
  );
};

export default UnitSidePanel;