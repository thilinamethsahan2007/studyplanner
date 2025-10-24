import { Syllabus } from '../types';

export const calculateOverallProgress = (syllabus: Syllabus | undefined): number => {
    if (!syllabus) return 0;

    let totalTasks = 0;
    let completedTasks = 0;

    syllabus.units.forEach(unit => {
        unit.subunits.forEach(sub => {
            if (sub.tuteDone !== undefined) {
                totalTasks++;
                if (sub.tuteDone) completedTasks++;
            }
            if (sub.pastDone !== undefined) {
                totalTasks++;
                if (sub.pastDone) completedTasks++;
            }
        });
    });

    if (totalTasks === 0) return 0;

    return Math.round((completedTasks / totalTasks) * 100);
};