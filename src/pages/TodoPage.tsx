import React, { useState, useCallback, useEffect } from 'react';
import { TodoItem, Day, Class, LogEntry } from '../types';
import TodoList from '../components/TodoList';
import SmartTodoInput from '../components/SmartTodoInput';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import LogTimeModal from '../components/LogTimeModal';
import PomodoroTimer from '../components/PomodoroTimer';
import JournalModal from '../components/JournalModal';
import { BookHeart, Repeat, BookOpen, History } from 'lucide-react';
import { getJournalEntry } from '../services/journalClient';
import { mockSubjects } from '../mockData';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import apiClient from '../services/apiClient';

interface TodoPageProps {
    day: Day | null;
    onDayChange: (newDay: Day) => void;
    classes: Class[];
    logs: LogEntry[];
    onLogsChange: (newLogs: LogEntry[]) => void;
}

const getExamCountdown = () => {
    const today = new Date();
    let examYear = today.getFullYear();
    // Month is 0-indexed, 7 = August. Target is Aug 3.
    let examDate = new Date(examYear, 7, 3);

    // If today is after Aug 3, target next year's exam.
    if (today.getTime() > examDate.getTime()) {
        examDate.setFullYear(examYear + 1);
    }

    let diffYears = examDate.getFullYear() - today.getFullYear();
    let diffMonths = examDate.getMonth() - today.getMonth();
    let diffDays = examDate.getDate() - today.getDate();

    if (diffDays < 0) {
        diffMonths--;
        const prevMonthLastDay = new Date(examDate.getFullYear(), examDate.getMonth(), 0).getDate();
        diffDays += prevMonthLastDay;
    }
    
    if (diffMonths < 0) {
        diffYears--;
        diffMonths += 12;
    }
    
    const totalMonths = diffYears * 12 + diffMonths;
    const totalDays = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { months: totalMonths, days: diffDays, totalDays };
};

const AnimatedCountdownNumber: React.FC<{ value: number; from: number; className?: string }> = ({ value, from, className = '' }) => {
    const ref = React.useRef<HTMLSpanElement>(null);
    const spring = useSpring(from, { stiffness: 45, damping: 18 });

    React.useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    React.useEffect(() => {
        const unsubscribe = spring.on('change', (latest) => {
            if (ref.current) {
                ref.current.textContent = `${Math.round(latest)}`;
            }
        });
        return unsubscribe;
    }, [spring]);

    return (
        <span ref={ref} className={className}>
            {from}
        </span>
    );
};

const TodoPage: React.FC<TodoPageProps> = ({ day, onDayChange, classes, logs, onLogsChange }) => {
  const { width, height } = useWindowSize();
  const isAllDone = day?.items?.length > 0 && day.items.every(item => item.done);
  const [countdown, setCountdown] = useState(getExamCountdown);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [taskToLog, setTaskToLog] = useState<TodoItem | null>(null);

  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [taskForPomodoro, setTaskForPomodoro] = useState<TodoItem | null>(null);
  const [pomodoroDuration, setPomodoroDuration] = useState(45); // in minutes
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalTargetDate, setJournalTargetDate] = useState<string | undefined>(undefined);
  const [hasYesterdayEntry, setHasYesterdayEntry] = useState(true);

  useEffect(() => {
    if (!day?.date) return;
    const [y, m, d] = day.date.split('-').map(Number);
    const prevDate = new Date(y, m - 1, d);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
    getJournalEntry(prevStr).then(res => setHasYesterdayEntry(!!res)).catch(() => {});
  }, [day?.date]);
  const [habitToast, setHabitToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update current time every minute

    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

  useEffect(() => {
    setCountdown(getExamCountdown());
  }, []);

  const updateDayState = (newDay: Day) => {
    onDayChange(newDay);
  };

  const toggleTodo = useCallback((id: string) => {
    if (!day) return;
    const task = day.items.find(item => item.id === id);
    if (!task) return;

    if (!task.done) {
        const isAlreadyLogged = logs.some(log => log.todoItemId === id && log.date === day.date);
        if (isAlreadyLogged) {
            const newDay: Day = { ...day, items: day.items.map(item => item.id === id ? { ...item, done: true } : item) };
            updateDayState(newDay);
        } else {
            setTaskToLog(task);
            setIsLogModalOpen(true);
        }
    } else {
        const newDay: Day = {
            ...day,
            items: day.items.map(item =>
                item.id === id ? { ...item, done: false } : item
            ),
        };
        updateDayState(newDay);
    }
  }, [day, logs, onDayChange]);

  const addTodos = useCallback(async (newTodos: Partial<TodoItem>[]) => {
    if (!day) return;

    const recurringTodos = newTodos.filter(t => t.recurring);

    const fullNewTodos: TodoItem[] = newTodos.map((todo, index) => ({
      id: `ai-${Date.now()}-${index}`,
      title: todo.title || 'Untitled Task',
      subjectId: todo.subjectId || 'personal',
      note: todo.note || '',
      estimatedMinutes: todo.estimatedMinutes,
      done: false,
      recurring: todo.recurring,
    }));

    const newDay: Day = {
      ...day,
      items: [...day.items, ...fullNewTodos],
    };
    updateDayState(newDay);

    // If any tasks are recurring habits, automatically inject into all days of the current week!
    if (recurringTodos.length > 0) {
      try {
        const todayDate = day.date ? new Date(day.date + 'T00:00:00') : new Date();
        const dayOfWeek = todayDate.getDay(); // 0 is Sunday, 1 is Monday...
        const diff = todayDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(todayDate);
        monday.setDate(diff);

        const weekDates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          weekDates.push(d.toISOString().split('T')[0]);
        }

        const otherDates = weekDates.filter(d => d !== day.date);
        const existingWeekData = await apiClient.getWeekTodos(weekDates[0], weekDates[6]);
        const weekMap: Record<string, TodoItem[]> = {};
        existingWeekData.forEach(d => {
          weekMap[d.date] = d.items;
        });

        const daysToSave: Day[] = otherDates.map(dateStr => {
          const existing = weekMap[dateStr] || [];
          const injected: TodoItem[] = recurringTodos.map((todo, idx) => ({
            id: `rec-${dateStr}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            title: todo.title || 'Untitled Recurring Task',
            subjectId: todo.subjectId || 'personal',
            note: todo.note || '[recurring]',
            estimatedMinutes: todo.estimatedMinutes,
            done: false,
            recurring: true,
          }));
          return {
            date: dateStr,
            items: [...existing, ...injected]
          };
        });

        await apiClient.saveWeekTodos(daysToSave);
        setHabitToast(`Injected "${recurringTodos[0].title}" into all 7 days of the week!`);
        setTimeout(() => setHabitToast(null), 4500);
      } catch (err) {
        console.error('Failed to inject recurring tasks for the week:', err);
      }
    }
  }, [day, onDayChange]);
  
  const formatDate = (dateString: string) => {
    // dateString is 'YYYY-MM-DD'
    const [year, month, dayNum] = dateString.split('-').map(Number);
    // new Date(year, monthIndex, day) creates a date in the local timezone
    const date = new Date(year, month - 1, dayNum);
    
    const day = date.getDate();
    const yearNum = date.getFullYear();
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${weekday}, ${date.toLocaleDateString('en-US', { month: 'long' })} ${getOrdinal(day)}, ${yearNum}`;
  }

  const todayWeekday = currentTime.getDay(); // Sunday - 0, Monday - 1, ...
  const todaysClasses = classes.filter(c => {
    if (c.weekday !== todayWeekday) {
        return false;
    }
    const [endHour, endMinute] = c.end.split(':').map(Number);
    const classEndTime = new Date(currentTime);
    classEndTime.setHours(endHour, endMinute, 0, 0);
    return currentTime.getTime() < classEndTime.getTime();
  });
  
  const handleLogSubmit = (taskId: string, startTime: string, endTime: string, breakMinutes: number) => {
    const task = day?.items.find(item => item.id === taskId);
    if (!task || !day) return;

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    
    let durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    durationMinutes = Math.max(0, durationMinutes - (breakMinutes || 0));

    const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        date: day.date,
        todoItemId: task.id,
        todoItemTitle: task.title,
        subjectId: task.subjectId,
        startTime,
        endTime,
        durationMinutes,
        breakMinutes
    };
    
    onLogsChange([...logs, newLog]);
    
    if (day) {
        const newDay: Day = {
            ...day,
            items: day.items.map(item =>
                item.id === taskId ? { ...item, done: true } : item
            ),
        };
        updateDayState(newDay);
    }
    
    setIsLogModalOpen(false);
    setTaskToLog(null);
  };
  
  const handleModalClose = () => {
    setIsLogModalOpen(false);
    setTaskToLog(null);
  };

  const handleStartPomodoro = (task: TodoItem) => {
    setTaskForPomodoro(task);
    setIsPomodoroOpen(true);
  };

  const handleClosePomodoro = () => {
      setIsPomodoroOpen(false);
      // A small delay to allow the modal to animate out before clearing the task
      setTimeout(() => setTaskForPomodoro(null), 300);
  };

  const handlePomodoroLog = (task: TodoItem, startTime: Date, endTime: Date) => {
    if (!day) return;
    
    const formatTime = (date: Date) => date.toTimeString().slice(0, 5); // HH:MM format
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));

    const newLog: LogEntry = {
        id: `log-pomodoro-${Date.now()}`,
        date: day.date,
        todoItemId: task.id,
        todoItemTitle: task.title,
        subjectId: task.subjectId,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        durationMinutes,
    };
    
    onLogsChange([...logs, newLog]);
    
    const newDay: Day = {
        ...day,
        items: day.items.map(item =>
            item.id === task.id ? { ...item, done: true } : item
        ),
    };
    updateDayState(newDay);
    handleClosePomodoro();
  };


  const classColors = [
      { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
      { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
      { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
      { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
      { bg: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-800 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  ];
  
  if (!day) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 dark:text-slate-400">Loading today's tasks...</p>
      </div>
    );
  }

  const totalTasks = day.items.length;
  const completedTasks = day.items.filter(i => i.done).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl w-full">
        {isAllDone && <Confetti width={width} height={height} recycle={false} numberOfPieces={800} gravity={0.15} />}
        <JournalModal 
            isOpen={isJournalModalOpen}
            onClose={() => setIsJournalModalOpen(false)}
            day={day}
            initialDate={journalTargetDate}
            onSaved={() => setHasYesterdayEntry(true)}
        />
        <LogTimeModal 
            isOpen={isLogModalOpen}
            task={taskToLog}
            onClose={handleModalClose}
            onSubmit={handleLogSubmit}
        />
        <PomodoroTimer
            isOpen={isPomodoroOpen}
            task={taskForPomodoro}
            duration={pomodoroDuration}
            onClose={handleClosePomodoro}
            onLog={handlePomodoroLog}
            onDurationChange={setPomodoroDuration}
        />
        

        {/* Modern Apple-style Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20">
                        Today's Agenda
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        {totalTasks > 0 ? `${completedTasks} of ${totalTasks} completed (${completionRate}%)` : 'No tasks yet'}
                    </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {formatDate(day.date)}
                </h1>
                
                {todaysClasses.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2.5">
                        {todaysClasses.map((c, index) => {
                            const color = classColors[index % classColors.length];
                            return (
                                <span key={c.id} className={`${color.bg} ${color.text} ${color.border} text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm`}>
                                    {c.name} ({c.start} - {c.end})
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                    onClick={() => { setJournalTargetDate(day.date); setIsJournalModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 shadow-sm transition-all press-scale"
                >
                    <BookHeart className="w-4 h-4 text-rose-500" />
                    <span>Diary</span>
                </button>
                <button
                    onClick={() => handleStartPomodoro(day.items.find(i => !i.done) || day.items[0] || { id: 'focus', title: 'Focus Session', subjectId: 'physics', done: false, note: '' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-500/25 transition-all press-scale"
                >
                    <span className="text-sm">⏱️</span>
                    <span>Focus Timer</span>
                </button>
            </div>
        </div>

        {/* Countdown Section - Apple Health / Activity Glass Widget */}
        <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mb-6 p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden"
        >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <span className="text-lg">🎯</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                A/L Exam Countdown
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Target: August Examination</p>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <div className="flex items-baseline gap-1">
                        <AnimatedCountdownNumber from={24} value={countdown.months} className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight" />
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">months</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700 text-lg font-light">:</span>
                    <div className="flex items-baseline gap-1">
                        <AnimatedCountdownNumber from={30} value={countdown.days} className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight" />
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">days</span>
                    </div>
                    <div className="hidden sm:block pl-4 border-l border-slate-200 dark:border-slate-800 text-right">
                        <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                            <AnimatedCountdownNumber from={730} value={countdown.totalDays} /> days
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Remaining</span>
                    </div>
                </div>
            </div>
            {/* Daily Task Completion Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0))}%` }}
                />
            </div>
        </motion.div>

        {/* New Smart Input */}
        <SmartTodoInput onAddTodos={addTodos} />

                {/* Time-Gated Journal Prompt (9:00 PM - 11:30 PM) */}
        {(() => {
            const hours = currentTime.getHours();
            const mins = currentTime.getMinutes();
            const timeInMins = hours * 60 + mins;
            const isTimeWindow = timeInMins >= 21 * 60 && timeInMins <= 23 * 60 + 30;
            const isToday = day.date === new Date().toISOString().split('T')[0];
            
            if (isTimeWindow && isToday) {
                return (
                    <div className="glass-card border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 rounded-3xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
                                <BookHeart className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">How was your day?</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">Take a moment to reflect and write down your thoughts before bed.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => { setJournalTargetDate(day.date); setIsJournalModalOpen(true); }}
                            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-2xl shadow-sm shadow-blue-500/20 transition-all press-scale text-xs sm:text-sm"
                        >
                            Write Journal
                        </button>
                    </div>
                );
            }
            return null;
        })()}

        {/* Forgotten Yesterday Journal Reminder */}
        {!hasYesterdayEntry && (
            <div className="mb-6 p-4 glass-card border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                            Missed yesterday's journal?
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Capture your thoughts, reflections, and accomplishments before you forget.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (day?.date) {
                            const [y, m, d] = day.date.split('-').map(Number);
                            const prevDate = new Date(y, m - 1, d);
                            prevDate.setDate(prevDate.getDate() - 1);
                            const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
                            setJournalTargetDate(prevStr);
                        }
                        setIsJournalModalOpen(true);
                    }}
                    className="shrink-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-xl shadow-sm transition-all press-scale flex items-center gap-1.5"
                >
                    <History className="w-3.5 h-3.5" /> Backfill Yesterday
                </button>
            </div>
        )}

        {/* Todo List Container */}
        <div className="glass-panel p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-white/10 mb-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <TodoList todos={day.items} onToggle={toggleTodo} subjects={mockSubjects} onStartPomodoro={handleStartPomodoro} />
        </div>

        {/* Recurring Habit Injection Toast */}
        <AnimatePresence>
            {habitToast && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl border border-white/15 dark:border-slate-200/80 text-sm font-semibold backdrop-blur-xl"
                >
                    <div className="p-1.5 bg-blue-500/20 text-blue-400 dark:text-blue-600 rounded-xl">
                        <Repeat className="w-4 h-4 animate-spin-slow" />
                    </div>
                    <span>{habitToast}</span>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default TodoPage;






