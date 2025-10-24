import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Subject, Syllabus, Unit } from '../types';
import UnitSidePanel from '../components/UnitSidePanel';
import SubunitChecklist from '../components/SubunitChecklist';
import ToggleSwitch from '../components/ToggleSwitch';
import { calculateOverallProgress } from '../utils/progress';
import ProgressDisplay from '../components/ProgressDisplay';
import AiHelperModal from '../components/AiHelperModal';

interface SubjectPageProps {
  syllabusData: Syllabus[];
  subjects: Subject[];
  onSyllabusChange: (newSyllabusData: Syllabus[]) => void;
}

const SubjectPage: React.FC<SubjectPageProps> = ({ syllabusData, subjects, onSyllabusChange }) => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [combinedMode, setCombinedMode] = useState<'pure' | 'applied'>('pure');
  
  const [isAiHelperOpen, setIsAiHelperOpen] = useState(false);
  const [selectedSubunitForAi, setSelectedSubunitForAi] = useState<{ unitName: string; subunitName: string; } | null>(null);


  const subject = subjects.find(s => s.id === subjectId);
  
  let currentSyllabus: Syllabus | undefined;
  if (subjectId === 'combined') {
    const combinedAppliedSyllabus = syllabusData.find(s => s.subjectId === 'combined-applied');
    const combinedPureSyllabus = syllabusData.find(s => s.subjectId === 'combined');
    currentSyllabus = combinedMode === 'pure' ? combinedPureSyllabus : combinedAppliedSyllabus;
  } else {
    currentSyllabus = syllabusData.find(s => s.subjectId === subjectId);
  }

  useEffect(() => {
    setSelectedUnit(null);
  }, [subjectId, combinedMode]);

  useEffect(() => {
    // When the main syllabusData prop changes (e.g., after a checkbox is ticked),
    // we need to update our local selectedUnit state to reflect that change.
    // Otherwise, the component would keep showing the old, stale data.
    if (selectedUnit && currentSyllabus) {
      const updatedUnit = currentSyllabus.units.find(u => u.id === selectedUnit.id);
      if (updatedUnit && JSON.stringify(updatedUnit) !== JSON.stringify(selectedUnit)) {
        setSelectedUnit(updatedUnit);
      }
    }
  }, [syllabusData, selectedUnit, currentSyllabus]);


  if (!subject || !currentSyllabus) {
    return <div>Subject not found.</div>;
  }

  const handleUnitSelect = (unit: Unit) => {
    setSelectedUnit(unit);
  };

  const handleSubunitChange = (unitId: string, subunitId: string, field: 'tuteDone' | 'pastDone', value: boolean) => {
    const newSyllabusData = syllabusData.map(syllabus => {
        if (syllabus.subjectId === currentSyllabus?.subjectId) {
            return {
                ...syllabus,
                units: syllabus.units.map(unit => {
                    if (unit.id === unitId) {
                        return {
                            ...unit,
                            subunits: unit.subunits.map(subunit => {
                                if (subunit.id === subunitId) {
                                    return { ...subunit, [field]: value };
                                }
                                return subunit;
                            })
                        };
                    }
                    return unit;
                })
            };
        }
        return syllabus;
    });
    onSyllabusChange(newSyllabusData);
  };
  
  const handleAiHelp = (unitName: string, subunitName: string) => {
    setSelectedSubunitForAi({ unitName, subunitName });
    setIsAiHelperOpen(true);
  };

  const calculateProgress = (unit: Unit) => {
    const totalTasks = unit.subunits.reduce((acc, sub) => {
        if (sub.tuteDone !== undefined) acc++;
        if (sub.pastDone !== undefined) acc++;
        return acc;
    }, 0);

    if (totalTasks === 0) return 100;

    const completedTasks = unit.subunits.reduce((acc, sub) => {
        if (sub.tuteDone) acc++;
        if (sub.pastDone) acc++;
        return acc;
    }, 0);

    return Math.round((completedTasks / totalTasks) * 100);
  };

  const getStatusColor = (status: Unit['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'ongoing': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  };

  let progressElements = null;
    if (subjectId === 'combined') {
        const pureMathsSyllabus = syllabusData.find(s => s.subjectId === 'combined');
        const appliedMathsSyllabus = syllabusData.find(s => s.subjectId === 'combined-applied');
        const pureMathsProgress = calculateOverallProgress(pureMathsSyllabus);
        const appliedMathsProgress = calculateOverallProgress(appliedMathsSyllabus);
        progressElements = (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProgressDisplay title="Pure Maths Progress" progress={pureMathsProgress} color={subject.color} />
                <ProgressDisplay title="Applied Maths Progress" progress={appliedMathsProgress} color={subject.color} />
            </div>
        );
    } else if (currentSyllabus) {
        const progress = calculateOverallProgress(currentSyllabus);
        progressElements = (
            <div>
                 <ProgressDisplay title="Overall Progress" progress={progress} color={subject.color} />
            </div>
        );
    }

  const combinedToggleOptions = [
    { value: 'pure', label: 'Pure' },
    { value: 'applied', label: 'Applied' },
  ];

  return (
    <>
    <AiHelperModal
      isOpen={isAiHelperOpen}
      onClose={() => setIsAiHelperOpen(false)}
      subjectName={subject.name}
      unitName={selectedSubunitForAi?.unitName || ''}
      subunitName={selectedSubunitForAi?.subunitName || ''}
    />
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Unit List View */}
      <div className={`w-full lg:w-1/3 ${selectedUnit ? 'hidden lg:block' : 'block'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{subject.name}</h1>
          {subjectId === 'combined' && <ToggleSwitch options={combinedToggleOptions} value={combinedMode} onChange={(val) => setCombinedMode(val as 'pure' | 'applied')} />}
        </div>

        <div className="mb-6">
            {progressElements}
        </div>

        <div className="space-y-3">
          {currentSyllabus.units.map(unit => (
            <button
              key={unit.id}
              onClick={() => handleUnitSelect(unit)}
              className={`w-full text-left p-4 rounded-lg flex items-start gap-4 transition-all ${
                selectedUnit?.id === unit.id ? 'bg-indigo-100 dark:bg-indigo-500/20 shadow-lg' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md'
              }`}
            >
              <UnitSidePanel unit={unit} progress={calculateProgress(unit)}/>
              <div className="flex-grow">
                 <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(unit.status)}`}></span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{unit.name}</p>
                 </div>
                 <p className="text-sm text-slate-500 dark:text-slate-400 ml-4">{unit.sinhala_name}</p>
                 <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 ml-4">{unit.subunits.length} subunits</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Subunit Checklist View */}
      <div className={`w-full lg:w-2/3 ${selectedUnit ? 'block' : 'hidden lg:block'}`}>
        {selectedUnit ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-8 h-full">
            <button onClick={() => setSelectedUnit(null)} className="lg:hidden mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Units
            </button>
            <SubunitChecklist
              subjectId={subjectId}
              unit={selectedUnit}
              onSubunitChange={handleSubunitChange}
              onAiHelp={handleAiHelp}
            />
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.747l9 5.747 9-5.747-9-5.747z" />
               <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0l2-2m-2 2l-2-2" />
            </svg>
            <h3 className="text-xl font-semibold mt-4">Select a Unit</h3>
            <p>Choose a unit from the list to see its subunits and track your progress.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default SubjectPage;
