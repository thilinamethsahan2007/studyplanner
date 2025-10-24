import React, { useState } from 'react';
import { Subject, Syllabus, Test, Class, Unit, Subunit } from '../types';

// Password for CMS
const ADMIN_PASSWORD = 'admin';

interface CmsPageProps {
    subjects: Subject[];
    syllabus: Syllabus[];
    tests: Test[];
    classes: Class[];
    onSyllabusChange: (data: Syllabus[]) => void;
    onTestsChange: (data: Test[]) => void;
    onClassesChange: (data: Class[]) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/20 ring-1 ring-slate-200 dark:ring-slate-700">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{title}</h2>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            {children}
        </div>
    </div>
);

const SyllabusManager: React.FC<Pick<CmsPageProps, 'syllabus' | 'subjects' | 'onSyllabusChange'>> = ({ syllabus, subjects, onSyllabusChange }) => {
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
    
    const [newUnit, setNewUnit] = useState({ english: '', sinhala: '' });
    const [newSubunit, setNewSubunit] = useState<{ [key: string]: { english: string; sinhala: string} }>({});

    const currentSyllabus = syllabus.find(s => s.subjectId === selectedSubjectId || (selectedSubjectId === 'combined' && s.subjectId === 'combined'));

    const handleAddUnit = () => {
        if (!newUnit.english || !newUnit.sinhala || !currentSyllabus) return;
        const newUnitObject: Unit = {
            id: `${currentSyllabus.subjectId}-u${Date.now()}`,
            name: newUnit.english,
            sinhala_name: newUnit.sinhala,
            status: 'not-started',
            subunits: []
        };
        const updatedSyllabus = syllabus.map(s => {
            if (s.subjectId === currentSyllabus.subjectId) {
                return { ...s, units: [...s.units, newUnitObject] };
            }
            return s;
        });
        onSyllabusChange(updatedSyllabus);
        setNewUnit({ english: '', sinhala: '' });
    };

    const handleAddSubunit = (unitId: string) => {
        const subunitData = newSubunit[unitId];
        if (!subunitData || !subunitData.english || !subunitData.sinhala || !currentSyllabus) return;
        
        const newSubunitObject: Subunit = {
            id: `${unitId}-su${Date.now()}`,
            name: subunitData.english,
            sinhala_name: subunitData.sinhala,
        };

        if(currentSyllabus.subjectId === 'chemistry') {
            newSubunitObject.pastDone = false;
        } else {
            newSubunitObject.tuteDone = false;
            newSubunitObject.pastDone = false;
        }

        const updatedSyllabus = syllabus.map(s => {
            if (s.subjectId === currentSyllabus.subjectId) {
                return {
                    ...s,
                    units: s.units.map(u => {
                        if (u.id === unitId) {
                            return { ...u, subunits: [...u.subunits, newSubunitObject] };
                        }
                        return u;
                    })
                };
            }
            return s;
        });
        onSyllabusChange(updatedSyllabus);
        setNewSubunit(prev => ({...prev, [unitId]: { english: '', sinhala: '' }}));
    };

    const handleStatusChange = (unitId: string, status: Unit['status']) => {
        if (!currentSyllabus) return;
        const updatedSyllabus = syllabus.map(s => {
            if (s.subjectId === currentSyllabus.subjectId) {
                return {
                    ...s,
                    units: s.units.map(u => u.id === unitId ? { ...u, status } : u)
                };
            }
            return s;
        });
        onSyllabusChange(updatedSyllabus);
    };
    
    const academicSubjects = subjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id));

    return (
        <div>
            <label className="block mb-6">
                <span className="cms-label">Select Subject to Manage</span>
                <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="select-field">
                    {academicSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </label>

            <div className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
                <h4 className="font-bold mb-2 text-slate-700 dark:text-slate-200">Add New Unit</h4>
                <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-3 items-end">
                    <div>
                        <label className="cms-label">English Name</label>
                        <input type="text" placeholder="e.g., Mechanics" value={newUnit.english} onChange={e => setNewUnit({...newUnit, english: e.target.value})} className="input-field" />
                    </div>
                    <div>
                        <label className="cms-label">Sinhala Name</label>
                        <input type="text" placeholder="e.g., යාන්ත්‍ර විද්‍යාව" value={newUnit.sinhala} onChange={e => setNewUnit({...newUnit, sinhala: e.target.value})} className="input-field" />
                    </div>
                    <button onClick={handleAddUnit} className="btn-primary">Add Unit</button>
                </div>
            </div>

            <div className="space-y-4">
                {currentSyllabus?.units.map(unit => (
                    <div key={unit.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{unit.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{unit.sinhala_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <select 
                                    value={unit.status || 'not-started'} 
                                    onChange={(e) => handleStatusChange(unit.id, e.target.value as Unit['status'])}
                                    className="select-field-sm"
                                >
                                    <option value="not-started">Not Started</option>
                                    <option value="ongoing">Ongoing</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-600 space-y-2">
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {unit.subunits.map(su => (
                                    <div key={su.id} className="flex justify-between items-center py-2">
                                         <div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{su.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{su.sinhala_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                             <div className="pt-2">
                                <h5 className="font-semibold text-sm mb-2 text-slate-600 dark:text-slate-300">Add Subunit to {unit.name}</h5>
                                 <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2 items-end">
                                    <input type="text" placeholder="English Name" value={newSubunit[unit.id]?.english || ''} onChange={e => setNewSubunit(prev => ({...prev, [unit.id]: {...prev[unit.id], english: e.target.value}}))} className="input-field-sm" />
                                    <input type="text" placeholder="Sinhala Name" value={newSubunit[unit.id]?.sinhala || ''} onChange={e => setNewSubunit(prev => ({...prev, [unit.id]: {...prev[unit.id], sinhala: e.target.value}}))} className="input-field-sm" />
                                    <button onClick={() => handleAddSubunit(unit.id)} className="btn-primary-sm">Add</button>
                                 </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const TestManager: React.FC<Pick<CmsPageProps, 'tests' | 'subjects' | 'onTestsChange'>> = ({ tests, subjects, onTestsChange }) => {
    const [newTest, setNewTest] = useState({ name: '', subjectId: subjects[0]?.id || '', date: '', score: '', total: '' });

    const handleAddTest = () => {
        if (!newTest.name || !newTest.date || !newTest.score || !newTest.total) return;
        const testToAdd: Test = {
            id: `t-${Date.now()}`,
            name: newTest.name,
            subjectId: newTest.subjectId,
            date: newTest.date,
            score: Number(newTest.score),
            total: Number(newTest.total)
        };
        onTestsChange([...tests, testToAdd]);
        setNewTest({ name: '', subjectId: subjects[0]?.id || '', date: '', score: '', total: '' });
    };

    const handleDeleteTest = (id: string) => {
        onTestsChange(tests.filter(t => t.id !== id));
    };

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 mb-4 items-end">
                <div>
                    <label className="cms-label">Test Name</label>
                    <input type="text" placeholder="e.g., Physics MCQ 02" value={newTest.name} onChange={e => setNewTest({ ...newTest, name: e.target.value })} className="input-field" />
                </div>
                 <div>
                    <label className="cms-label">Subject</label>
                    <select value={newTest.subjectId} onChange={e => setNewTest({ ...newTest, subjectId: e.target.value })} className="select-field">
                        {subjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="cms-label">Date</label>
                    <input type="date" value={newTest.date} onChange={e => setNewTest({ ...newTest, date: e.target.value })} className="input-field" />
                </div>
                 <div>
                    <label className="cms-label">Score</label>
                    <input type="number" placeholder="85" value={newTest.score} onChange={e => setNewTest({ ...newTest, score: e.target.value })} className="input-field" />
                </div>
                 <div>
                    <label className="cms-label">Total</label>
                    <input type="number" placeholder="100" value={newTest.total} onChange={e => setNewTest({ ...newTest, total: e.target.value })} className="input-field" />
                </div>
            </div>
            <button onClick={handleAddTest} className="btn-primary w-full sm:w-auto">Add Test Result</button>
            <div className="mt-6 space-y-2">
                {tests.map(test => (
                    <div key={test.id} className="flex flex-wrap justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">{test.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {subjects.find(s=>s.id === test.subjectId)?.name} | {test.date} | Score: {test.score}/{test.total}
                            </p>
                        </div>
                        <button onClick={() => handleDeleteTest(test.id)} className="btn-danger-sm">Delete</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ClassManager: React.FC<Pick<CmsPageProps, 'classes' | 'onClassesChange'>> = ({ classes, onClassesChange }) => {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const [newClass, setNewClass] = useState({
        name: '',
        weekday: '0',
        start: '',
        end: '',
    });

    const handleAddClass = () => {
        if (!newClass.name || !newClass.start || !newClass.end) return;
        const classToAdd: Class = {
            id: `c-${Date.now()}`,
            name: newClass.name,
            weekday: Number(newClass.weekday),
            start: newClass.start,
            end: newClass.end,
        };
        onClassesChange([...classes, classToAdd]);
        setNewClass({
             name: '',
             weekday: '0',
             start: '',
             end: '',
        });
    };

    const handleDeleteClass = (id: string) => {
        onClassesChange(classes.filter(c => c.id !== id));
    };
    
     return (
        <div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 items-end">
                <div>
                    <label className="cms-label">Class Name</label>
                    <input 
                        type="text"
                        placeholder="e.g., Physics"
                        value={newClass.name}
                        onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                        className="input-field"
                    />
                </div>
                <div>
                    <label className="cms-label">Day of Week</label>
                    <select value={newClass.weekday} onChange={e => setNewClass({ ...newClass, weekday: e.target.value })} className="select-field">
                        {weekdays.map((day, index) => <option key={index} value={index}>{day}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="cms-label">Start Time</label>
                    <input type="time" value={newClass.start} onChange={e => setNewClass({ ...newClass, start: e.target.value })} className="input-field" />
                </div>
                 <div>
                    <label className="cms-label">End Time</label>
                    <input type="time" value={newClass.end} onChange={e => setNewClass({ ...newClass, end: e.target.value })} className="input-field" />
                </div>
            </div>
            <button onClick={handleAddClass} className="btn-primary w-full sm:w-auto">Add Class</button>

            <div className="mt-6 space-y-2">
                {classes.sort((a,b) => a.weekday - b.weekday).map(c => (
                    <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{c.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{weekdays[c.weekday]}, {c.start} - {c.end}</p>
                        </div>
                        <button onClick={() => handleDeleteClass(c.id)} className="btn-danger-sm">Delete</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

const CmsPage: React.FC<CmsPageProps> = (props) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Incorrect password.');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-full max-w-sm">
                    <form onSubmit={handleLogin} className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7a8 4 0 0116 0M12 11a8 4 0 00-8 4" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-center mb-1 text-slate-800 dark:text-slate-100">CMS Access</h1>
                        <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">Enter password to manage content</p>
                         <div className="mb-4">
                            <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                className="input-field w-full"
                                id="password"
                                type="password"
                                placeholder="Enter admin password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                        <button className="btn-primary w-full" type="submit">
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">Content Management System</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your study planner's data.</p>
      </div>

      <style>{`
        .cms-label { @apply block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1; }
        .input-field { @apply block w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition; }
        .input-field-sm { @apply text-sm block w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm px-2 py-1 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition; }
        .select-field { @apply block w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition; }
        .select-field-sm { @apply text-sm block w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition; }
        .btn-primary { @apply inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed; }
        .btn-primary-sm { @apply inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed; }
        .btn-danger-sm { @apply inline-flex items-center justify-center p-1.5 bg-red-500 text-white font-bold text-xs rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-800 transition-colors; }
      `}</style>

      <Section title="Manage Syllabus">
        <SyllabusManager {...props} />
      </Section>
      
      <Section title="Manage Tests">
        <TestManager {...props} />
      </Section>

      <Section title="Class Schedule">
        <ClassManager {...props} />
      </Section>
    </div>
  );
};

export default CmsPage;