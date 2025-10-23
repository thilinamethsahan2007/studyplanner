import React, { useState, useCallback, useEffect } from 'react';
import { TodoItem, Day, Class, LogEntry } from '../types';
import TodoList from '../components/TodoList';
import SmartTodoInput from '../components/SmartTodoInput';
import LogTimeModal from '../components/LogTimeModal';
import PomodoroTimer from '../components/PomodoroTimer';
import { mockSubjects } from '../mockData';
import HistoryModal from '../components/HistoryModal';

interface TodoPageProps {
    day: Day | null;
    onDayChange: (newDay: Day) => void;
    classes: Class[];
    logs: LogEntry[];
    onLogsChange: (newLogs: LogEntry[]) => void;
}

const TodoPage: React.FC<TodoPageProps> = ({ day, onDayChange, classes, logs, onLogsChange }) => {
  const [countdown, setCountdown] = useState({ months: 0, days: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [taskToLog, setTaskToLog] = useState<TodoItem | null>(null);

  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [taskForPomodoro, setTaskForPomodoro] = useState<TodoItem | null>(null);
  const [pomodoroDuration, setPomodoroDuration] = useState(45); // in minutes
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update current time every minute

    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

  useEffect(() => {
    const calculateCountdown = () => {
        const today = new Date();
        let examYear = today.getFullYear();
        // Month is 0-indexed, 7 = August. Target is Aug 10.
        let examDate = new Date(examYear, 7, 10);

        // If today is after Aug 10, target next year's exam.
        if (today.getTime() > examDate.getTime()) {
            examDate.setFullYear(examYear + 1);
        }

        let diffYears = examDate.getFullYear() - today.getFullYear();
        let diffMonths = examDate.getMonth() - today.getMonth();
        let diffDays = examDate.getDate() - today.getDate();

        // Adjust for negative days (when today's date is > exam date's day)
        if (diffDays < 0) {
            // Borrow from months
            diffMonths--;
            // Get the last day of the month before the exam month
            const prevMonthLastDay = new Date(examDate.getFullYear(), examDate.getMonth(), 0).getDate();
            diffDays += prevMonthLastDay;
        }
        
        // Adjust for negative months
        if (diffMonths < 0) {
            diffYears--;
            diffMonths += 12;
        }
        
        const totalMonths = diffYears * 12 + diffMonths;

        setCountdown({ months: totalMonths, days: diffDays });
    };

    calculateCountdown();
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

  const addTodos = useCallback((newTodos: Partial<TodoItem>[]) => {
    if (!day) return;
    const fullNewTodos: TodoItem[] = newTodos.map((todo, index) => ({
      id: `ai-${Date.now()}-${index}`,
      title: todo.title || 'Untitled AI Task',
      subjectId: todo.subjectId || 'personal',
      note: todo.note || '',
      done: false,
    }));

    const newDay: Day = {
      ...day,
      items: [...day.items, ...fullNewTodos],
    };
    updateDayState(newDay);
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

    return `${getOrdinal(day)} ${weekday} ${yearNum}`;
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
  
  const handleLogSubmit = (taskId: string, startTime: string, endTime: string) => {
    const task = day?.items.find(item => item.id === taskId);
    if (!task || !day) return;

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        date: day.date,
        todoItemId: task.id,
        todoItemTitle: task.title,
        subjectId: task.subjectId,
        startTime,
        endTime,
        durationMinutes,
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

  return (
    <div className="mx-auto max-w-3xl w-full">
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
        <HistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            logs={logs}
            subjects={mockSubjects}
        />


        {/* Header Section */}
        <div className="mb-8 flex justify-center relative">
            <div className="grid grid-cols-[max-content_max-content] items-center gap-x-2 sm:gap-x-4">
                <div className="row-span-2 text-8xl sm:text-[10rem] font-bold text-indigo-600 dark:text-indigo-400 tracking-tighter leading-[0.8]">
                    TO
                </div>
                <div className="self-end text-4xl sm:text-6xl font-bold text-slate-800 dark:text-slate-100 tracking-tighter leading-none">
                    DAY
                </div>
                <div className="self-start text-4xl sm:text-6xl font-bold text-slate-700 dark:text-slate-300 tracking-tighter leading-none">
                    DO
                </div>
            </div>
            <div className="absolute top-0 right-0">
                <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="p-3 bg-white dark:bg-slate-800/50 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    aria-label="View task history"
                    title="View task history"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </div>

        {/* Countdown Section */}
        <div className="text-center mb-8 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">A/L Exam Countdown</h3>
            <div className="flex justify-center items-baseline gap-4 mt-2">
                <div>
                    <span className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{countdown.months}</span>
                    <span className="text-lg font-medium text-slate-600 dark:text-slate-300 ml-1">months</span>
                </div>
                <div>
                    <span className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{countdown.days}</span>
                    <span className="text-lg font-medium text-slate-600 dark:text-slate-300 ml-1">days</span>
                </div>
            </div>
             <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 font-medium">
                {`That's ${countdown.months} months and ${countdown.days} days to go.`}
            </p>
        </div>

        {/* Date, Tags */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                <p className="text-lg sm:text-xl font-semibold text-slate-600 dark:text-slate-300">
                    {formatDate(day.date)}
                </p>
                {todaysClasses.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {todaysClasses.map((c, index) => {
                            const color = classColors[index % classColors.length];
                            return (
                                <span key={c.id} className={`${color.bg} ${color.text} ${color.border} text-sm font-semibold px-3 py-1 rounded-full border`}>
                                    {c.name}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* New Smart Input */}
        <SmartTodoInput onAddTodos={addTodos} />

        {/* Todo List Container */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm mb-8">
            <TodoList todos={day.items} onToggle={toggleTodo} subjects={mockSubjects} onStartPomodoro={handleStartPomodoro} />
        </div>
    </div>
  );
};

export default TodoPage;
