import React, { useState } from 'react';
import { Subject, Syllabus, Test, Class, Unit, Subunit } from '../types';
import { BookOpen, FileSignature, CalendarClock, Plus, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CmsPageProps {
    subjects: Subject[];
    syllabus: Syllabus[];
    tests: Test[];
    classes: Class[];
    onSyllabusChange: (data: Syllabus[]) => void;
    onTestsChange: (data: Test[]) => void;
    onClassesChange: (data: Class[]) => void;
}

const SyllabusManager: React.FC<Pick<CmsPageProps, 'syllabus' | 'subjects' | 'onSyllabusChange'>> = ({ syllabus, subjects, onSyllabusChange }) => {
    const academicSubjects = subjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id));
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(academicSubjects[0]?.id || '');
    
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
        setNewSubunit({ ...newSubunit, [unitId]: { english: '', sinhala: '' } });
    };

    const handleDeleteUnit = (unitId: string) => {
        if(!currentSyllabus) return;
        const updatedSyllabus = syllabus.map(s => {
            if (s.subjectId === currentSyllabus.subjectId) {
                return { ...s, units: s.units.filter(u => u.id !== unitId) };
            }
            return s;
        });
        onSyllabusChange(updatedSyllabus);
    };

    const handleDeleteSubunit = (unitId: string, subunitId: string) => {
        if(!currentSyllabus) return;
        const updatedSyllabus = syllabus.map(s => {
            if(s.subjectId === currentSyllabus.subjectId) {
                return {
                    ...s,
                    units: s.units.map(u => {
                        if(u.id === unitId) {
                            return { ...u, subunits: u.subunits.filter(su => su.id !== subunitId) };
                        }
                        return u;
                    })
                };
            }
            return s;
        });
        onSyllabusChange(updatedSyllabus);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-4 mb-6 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-x-auto scrollbar-hide">
                {academicSubjects.map(subject => (
                    <button
                        key={subject.id}
                        onClick={() => setSelectedSubjectId(subject.id)}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                            selectedSubjectId === subject.id
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        {subject.name}
                    </button>
                ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-500" /> Add New Unit
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                        placeholder="Unit Name (English)" 
                        value={newUnit.english} 
                        onChange={e => setNewUnit({ ...newUnit, english: e.target.value })} 
                        className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                    />
                    <input 
                        placeholder="Unit Name (Sinhala)" 
                        value={newUnit.sinhala} 
                        onChange={e => setNewUnit({ ...newUnit, sinhala: e.target.value })} 
                        className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                    />
                    <button onClick={handleAddUnit} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap px-8">Add Unit</button>
                </div>
            </div>

            <div className="space-y-4">
                {currentSyllabus?.units.map(unit => (
                    <div key={unit.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-black text-lg text-slate-800 dark:text-slate-100">{unit.name} <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-2">({unit.sinhala_name})</span></h4>
                            <button onClick={() => handleDeleteUnit(unit.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input placeholder="Subunit (English)" value={newSubunit[unit.id]?.english || ''} onChange={e => setNewSubunit({ ...newSubunit, [unit.id]: { ...newSubunit[unit.id], english: e.target.value }})} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                <input placeholder="Subunit (Sinhala)" value={newSubunit[unit.id]?.sinhala || ''} onChange={e => setNewSubunit({ ...newSubunit, [unit.id]: { ...newSubunit[unit.id], sinhala: e.target.value }})} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                                <button onClick={() => handleAddSubunit(unit.id)} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">Add Subunit</button>
                            </div>
                        </div>

                        <ul className="space-y-2">
                            {unit.subunits.map(su => (
                                <li key={su.id} className="flex justify-between items-center p-3 bg-slate-100/50 dark:bg-slate-800 rounded-lg group">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{su.name} <span className="text-slate-400 text-sm ml-2">({su.sinhala_name})</span></span>
                                    <button onClick={() => handleDeleteSubunit(unit.id, su.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TestManager: React.FC<Pick<CmsPageProps, 'tests' | 'subjects' | 'onTestsChange'>> = ({ tests, subjects, onTestsChange }) => {
    const academicSubjects = subjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id));
    const [newTest, setNewTest] = useState({ subjectId: academicSubjects[0]?.id || '', name: '', date: '', score: '', total: '' });

    const handleAddTest = () => {
        if (!newTest.subjectId || !newTest.name || !newTest.date || !newTest.score || !newTest.total) return;
        const testToAdd: Test = {
            id: `t-${Date.now()}`,
            subjectId: newTest.subjectId,
            name: newTest.name,
            date: newTest.date,
            score: Number(newTest.score),
            total: Number(newTest.total)
        };
        onTestsChange([...tests, testToAdd]);
        setNewTest({ subjectId: academicSubjects[0]?.id || '', name: '', date: '', score: '', total: '' });
    };

    const handleDeleteTest = (id: string) => {
        onTestsChange(tests.filter(t => t.id !== id));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Subject</label>
                    <select value={newTest.subjectId} onChange={e => setNewTest({ ...newTest, subjectId: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                        {academicSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Test Name</label>
                    <input placeholder="e.g., Term Test 1" value={newTest.name} onChange={e => setNewTest({ ...newTest, name: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                 <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Date</label>
                    <input type="date" value={newTest.date} onChange={e => setNewTest({ ...newTest, date: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                 <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Score</label>
                    <input type="number" placeholder="85" value={newTest.score} onChange={e => setNewTest({ ...newTest, score: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                 <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Total</label>
                    <input type="number" placeholder="100" value={newTest.total} onChange={e => setNewTest({ ...newTest, total: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                <div className="lg:col-span-5 flex justify-end mt-2">
                    <button onClick={handleAddTest} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto px-8">Add Test Result</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map(test => (
                    <div key={test.id} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm group">
                        <button onClick={() => handleDeleteTest(test.id)} className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1 pr-8">{test.name}</h4>
                        <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> {subjects.find(s=>s.id === test.subjectId)?.name}</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div> {test.date}</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Score</span>
                            <span className="font-black text-2xl text-indigo-500">{test.score}<span className="text-lg text-slate-400">/{test.total}</span></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ClassManager: React.FC<Pick<CmsPageProps, 'classes' | 'onClassesChange'>> = ({ classes, onClassesChange }) => {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const [newClass, setNewClass] = useState({ name: '', weekday: '0', start: '', end: '' });

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
        setNewClass({ name: '', weekday: '0', start: '', end: '' });
    };

    const handleDeleteClass = (id: string) => onClassesChange(classes.filter(c => c.id !== id));
    
     return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Class Name</label>
                    <input placeholder="e.g., Physics Masterclass" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Day of Week</label>
                    <select value={newClass.weekday} onChange={e => setNewClass({ ...newClass, weekday: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                        {weekdays.map((day, index) => <option key={index} value={index}>{day}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Start Time</label>
                    <input type="time" value={newClass.start} onChange={e => setNewClass({ ...newClass, start: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">End Time</label>
                    <input type="time" value={newClass.end} onChange={e => setNewClass({ ...newClass, end: e.target.value })} className="block w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                <div className="lg:col-span-4 flex justify-end mt-2">
                    <button onClick={handleAddClass} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto px-8">Add Schedule</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.sort((a,b) => a.weekday - b.weekday).map(c => (
                    <div key={c.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <span className="text-xs font-black uppercase">{weekdays[c.weekday].substring(0,3)}</span>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100">{c.name}</p>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{c.start} - {c.end}</p>
                            </div>
                        </div>
                        <button onClick={() => handleDeleteClass(c.id)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

const CmsPage: React.FC<CmsPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'syllabus' | 'tests' | 'classes'>('syllabus');

    const tabs = [
        { id: 'syllabus', label: 'Syllabus Editor', icon: BookOpen },
        { id: 'tests', label: 'Test Records', icon: FileSignature },
        { id: 'classes', label: 'Class Schedule', icon: CalendarClock },
    ] as const;

    return (
        <div className="max-w-5xl mx-auto flex flex-col h-full min-h-[80vh]">
            

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-slate-800 dark:bg-white rounded-2xl shadow-xl flex items-center justify-center rotate-3">
                    <Settings className="w-6 h-6 text-white dark:text-slate-900" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Configuration</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage backend data and schedules.</p>
                </div>
            </div>

            {/* Glowing Gamified Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl mb-8 border border-white/20 dark:border-white/5 w-fit">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${
                                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="cms-tab-pill"
                                    className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 -z-10"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'syllabus' && <SyllabusManager {...props} />}
                        {activeTab === 'tests' && <TestManager {...props} />}
                        {activeTab === 'classes' && <ClassManager {...props} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CmsPage;