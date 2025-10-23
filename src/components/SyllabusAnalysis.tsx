import React from 'react';
import { Syllabus, Subject } from '../types';
import { calculateOverallProgress } from '../utils/progress';
import ProgressDisplay from './ProgressDisplay';

interface SyllabusAnalysisProps {
    syllabusData: Syllabus[];
    subjects: Subject[];
}

const SyllabusAnalysis: React.FC<SyllabusAnalysisProps> = ({ syllabusData, subjects }) => {
    const academicSubjects = subjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id));

    const getProgressData = () => {
        const progressItems: { id: string; name: string; color: string; progress: number }[] = [];

        const physicsSubject = academicSubjects.find(s => s.id === 'physics');
        if (physicsSubject) {
            const syllabus = syllabusData.find(s => s.subjectId === 'physics');
            progressItems.push({
                ...physicsSubject,
                progress: calculateOverallProgress(syllabus),
            });
        }

        const chemistrySubject = academicSubjects.find(s => s.id === 'chemistry');
        if (chemistrySubject) {
            const syllabus = syllabusData.find(s => s.subjectId === 'chemistry');
            progressItems.push({
                ...chemistrySubject,
                progress: calculateOverallProgress(syllabus),
            });
        }

        const combinedSubject = academicSubjects.find(s => s.id === 'combined');
        if (combinedSubject) {
            const pureSyllabus = syllabusData.find(s => s.subjectId === 'combined');
            const appliedSyllabus = syllabusData.find(s => s.subjectId === 'combined-applied');
            progressItems.push({
                id: 'combined-pure',
                name: 'Pure Maths',
                color: combinedSubject.color,
                progress: calculateOverallProgress(pureSyllabus),
            });
            progressItems.push({
                id: 'combined-applied',
                name: 'Applied Maths',
                color: combinedSubject.color,
                progress: calculateOverallProgress(appliedSyllabus),
            });
        }
        
        return progressItems;
    };
    
    const progressData = getProgressData();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {progressData.map(item => (
                <ProgressDisplay 
                    key={item.id}
                    title={item.name}
                    progress={item.progress}
                    color={item.color}
                />
            ))}
        </div>
    );
};

export default SyllabusAnalysis;