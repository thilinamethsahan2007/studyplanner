import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { TodoItem } from '../types';
import { generateTodoSuggestions } from '../services/smartParser';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CheckCircle2, Circle, Trash2, Repeat } from 'lucide-react';
import { mockSubjects } from '../mockData';
import { Day } from '../types';

const WeeklyPlannerPage: React.FC = () => {
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};
  const [weekDays, setWeekDays] = useState<{ date: Date, dateStr: string, title: string, subtitle: string }[]>([]);
  const [weekData, setWeekData] = useState<{ [dateStr: string]: TodoItem[] }>({});
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<{ [dateStr: string]: string }>({});
  const [weekStartStr, setWeekStartStr] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    
    const startStr = monday.toISOString().split('T')[0];
    setWeekStartStr(startStr);
    
    const unscheduledKey = `${startStr}-unscheduled`;
    
    const cols = [{
      date: monday,
      dateStr: unscheduledKey,
      title: 'Weekly Inbox',
      subtitle: 'Unscheduled Workload'
    }];
    
    const endOfWeek = new Date(monday);
    endOfWeek.setDate(monday.getDate() + 6);
    const endStr = endOfWeek.toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      cols.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        title: d.toLocaleDateString('en-US', { weekday: 'long' }),
        subtitle: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    setWeekDays(cols);

    apiClient.getWeekTodos(startStr, endStr).then(data => {
      const mapped: { [dateStr: string]: TodoItem[] } = {};
      cols.forEach(col => mapped[col.dateStr] = []);
      data.forEach(d => {
        if (mapped[d.date] !== undefined) {
          mapped[d.date] = d.items;
        } else if (d.date === unscheduledKey) {
          mapped[unscheduledKey] = d.items;
        }
      });
      setWeekData(mapped);
      setLoading(false);
    });
  }, []);

  const handleToggleDone = async (dateStr: string, itemId: string) => {
    const dayItems = weekData[dateStr] || [];
    const updatedItems = dayItems.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setWeekData({ ...weekData, [dateStr]: updatedItems });
    await apiClient.saveWeekTodos([{ date: dateStr, items: updatedItems }]);
  };

  const handleDelete = async (dateStr: string, itemId: string) => {
    const dayItems = weekData[dateStr] || [];
    const updatedItems = dayItems.filter(item => item.id !== itemId);
    setWeekData({ ...weekData, [dateStr]: updatedItems });
    await apiClient.deleteTodo(itemId);
  };

  const handleSmartAdd = async (dateStr: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = inputs[dateStr];
    if (!text?.trim()) return;
    setInputs({ ...inputs, [dateStr]: '' });

    const suggestions = await generateTodoSuggestions(text);
    if (suggestions && suggestions.length > 0) {
      const recurringSuggestions = suggestions.filter(s => s.recurring);
      const regularSuggestions = suggestions.filter(s => !s.recurring);

      let newWeekData = { ...weekData };
      const daysToSave: Day[] = [];

      // If recurring habits are present, automatically inject across ALL 7 days of the week!
      if (recurringSuggestions.length > 0) {
        const calendarCols = weekDays.slice(1);
        calendarCols.forEach(col => {
          const colDateStr = col.dateStr;
          const existing = newWeekData[colDateStr] || [];
          const newRecurringTodos: TodoItem[] = recurringSuggestions.map((s, idx) => ({
            id: `rec-${colDateStr}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            title: s.title || 'Untitled Habit',
            subjectId: s.subjectId || 'personal',
            note: s.note ? `${s.note} [recurring]` : '[recurring]',
            estimatedMinutes: s.estimatedMinutes,
            done: false,
            recurring: true,
          }));
          const updated = [...existing, ...newRecurringTodos];
          newWeekData[colDateStr] = updated;
          daysToSave.push({ date: colDateStr, items: updated });
        });
      }

      // Add regular tasks to targeted column
      if (regularSuggestions.length > 0) {
        const existing = newWeekData[dateStr] || [];
        const newRegularTodos: TodoItem[] = regularSuggestions.map((s, idx) => ({
          id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          title: s.title || 'Untitled',
          subjectId: s.subjectId || 'personal',
          note: s.note || '',
          estimatedMinutes: s.estimatedMinutes,
          done: false,
          recurring: false,
        }));
        const updated = [...existing, ...newRegularTodos];
        newWeekData[dateStr] = updated;
        const saveIdx = daysToSave.findIndex(d => d.date === dateStr);
        if (saveIdx >= 0) {
          daysToSave[saveIdx] = { date: dateStr, items: updated };
        } else {
          daysToSave.push({ date: dateStr, items: updated });
        }
      }

      setWeekData(newWeekData);
      await apiClient.saveWeekTodos(daysToSave);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    const sourceItems = Array.from(weekData[sourceCol] || []);
    const destItems = sourceCol === destCol ? sourceItems : Array.from(weekData[destCol] || []);

    const [movedItem] = sourceItems.splice(source.index, 1);

    if (sourceCol === destCol) {
      sourceItems.splice(destination.index, 0, movedItem);
      setWeekData({ ...weekData, [sourceCol]: sourceItems });
    } else {
      destItems.splice(destination.index, 0, movedItem);
      setWeekData({
        ...weekData,
        [sourceCol]: sourceItems,
        [destCol]: destItems
      });
      await apiClient.saveWeekTodos([{ date: destCol, items: [movedItem] }]);
    }
  };

  const getSubjectColor = (subjectId: string) => {
    switch (subjectId) {
      case 'physics': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'chemistry': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'combined': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'microcredentials': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'exercise': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'entertainment': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading weekly planner...</div>;

  return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden flex flex-col">
        <div className="mb-6 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20">
              Schedule & Backlog
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Weekly Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Brain dump your workload into the Inbox, then drag to schedule across the week.</p>
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:overflow-hidden">
            
            {/* LEFT PANE: MASTER INBOX */}
            <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col h-[50vh] lg:h-full bg-slate-100/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden shrink-0">
              {(() => {
                const col = weekDays[0];
                if (!col) return null;
                const items = weekData[col.dateStr] || [];
                return (
                  <>
                    <div className="shrink-0 p-5 border-b border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        {col.title}
                        <span className="text-xs bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-bold">{items.length}</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {col.subtitle}
                      </p>
                    </div>
                    
                    <div className="shrink-0 p-3.5 border-b border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                      <form onSubmit={(e) => handleSmartAdd(col.dateStr, e)}>
                        <input
                          type="text"
                          placeholder="Dump workload here..."
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 shadow-sm transition-all placeholder-slate-400"
                          value={inputs[col.dateStr] || ''}
                          onChange={e => setInputs({ ...inputs, [col.dateStr]: e.target.value })}
                        />
                      </form>
                    </div>

                    <Droppable droppableId={col.dateStr}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-3.5 overflow-y-auto scrollbar-hide transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        >
                          {items.map((item, index) => {
                            const subject = mockSubjects.find(s => s.id === item.subjectId) || { color: '#94a3b8', name: 'Personal' };
                            return (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{ ...provided.draggableProps.style, borderLeftColor: subject.color }}
                                  className={`p-3 mb-2.5 rounded-2xl text-sm border-y border-r border-l-[4px] shadow-sm backdrop-blur-xl transition-all overflow-hidden ${snapshot.isDragging ? 'bg-white dark:bg-slate-800 border-y-blue-500 border-r-blue-500 shadow-xl z-50 ring-2 ring-blue-500/20' : 'bg-white/90 dark:bg-slate-900/80 border-y-slate-200/80 border-r-slate-200/80 dark:border-y-white/10 dark:border-r-white/10 hover:shadow-md'}`}
                                >
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-start gap-2.5">
                                      <button onClick={() => handleToggleDone(col.dateStr, item.id)} className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-500 transition-colors">
                                        {item.done ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : <Circle className="w-4 h-4" />}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-medium text-xs sm:text-sm leading-snug ${item.done ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                                          {item.title}
                                        </p>
                                      </div>
                                      <button onClick={() => handleDelete(col.dateStr, item.id)} className="shrink-0 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="pl-6 flex flex-wrap gap-1.5 items-center mt-0.5">
                                      {(item.recurring || item.note?.includes('[recurring]')) && (
                                        <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-sm" title="Daily Recurring Habit">
                                          <Repeat className="w-3 h-3" />
                                        </span>
                                      )}
                                      {!item.done && item.subjectId !== 'personal' && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                                          {subject.name}
                                        </span>
                                      )}
                                      {!item.done && item.estimatedMinutes && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10">
                                          ⏳ {formatTime(item.estimatedMinutes)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );})}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </>
                );
              })()}
            </div>

            {/* RIGHT PANE: HORIZONTAL KANBAN DAYS */}
            <div className="flex-1 flex gap-5 overflow-x-auto pb-4 min-h-[50vh] lg:min-h-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {weekDays.slice(1).map((col) => {
                const isToday = new Date().toISOString().split('T')[0] === col.dateStr;
                const items = weekData[col.dateStr] || [];

                return (
                  <div key={col.dateStr} className={`w-[320px] min-w-[320px] flex flex-col h-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-sm border transition-all ${isToday ? 'border-blue-500/60 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200/80 dark:border-white/10'}`}>
                    
                    {/* Header */}
                    <div className={`shrink-0 p-5 border-b border-slate-200/80 dark:border-white/10 rounded-t-3xl ${isToday ? 'bg-blue-500/10 dark:bg-blue-500/15' : 'bg-slate-50/60 dark:bg-slate-900/40'}`}>
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        {col.title}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm ${isToday ? 'bg-blue-500 text-white' : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{items.length}</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {col.subtitle}
                      </p>
                    </div>

                    {/* Smart Input */}
                    <div className="shrink-0 p-3 border-b border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
                      <form onSubmit={(e) => handleSmartAdd(col.dateStr, e)}>
                        <input
                          type="text"
                          placeholder="Add task..."
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 transition-all placeholder-slate-400"
                          value={inputs[col.dateStr] || ''}
                          onChange={e => setInputs({ ...inputs, [col.dateStr]: e.target.value })}
                        />
                      </form>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={col.dateStr}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-3 overflow-y-auto scrollbar-hide transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                        >
                          {items.map((item, index) => {
                            const subject = mockSubjects.find(s => s.id === item.subjectId) || { color: '#94a3b8', name: 'Personal' };
                            return (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{ ...provided.draggableProps.style, borderLeftColor: subject.color }}
                                  className={`group p-3 mb-2 rounded-2xl text-sm border-y border-r border-l-[4px] shadow-sm backdrop-blur-xl transition-all overflow-hidden ${snapshot.isDragging ? 'bg-white dark:bg-slate-800 border-y-blue-500 border-r-blue-500 shadow-xl z-50 ring-2 ring-blue-500/20' : 'bg-white/90 dark:bg-slate-900/80 border-y-slate-200/80 border-r-slate-200/80 dark:border-y-white/10 dark:border-r-white/10 hover:shadow-md'}`}
                                >
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-start gap-2.5">
                                      <button onClick={() => handleToggleDone(col.dateStr, item.id)} className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-500 transition-colors">
                                        {item.done ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : <Circle className="w-4 h-4" />}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-medium text-xs sm:text-sm leading-snug ${item.done ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                                          {item.title}
                                        </p>
                                      </div>
                                      <button onClick={() => handleDelete(col.dateStr, item.id)} className="shrink-0 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="pl-6 flex flex-wrap gap-1.5 items-center mt-0.5">
                                      {(item.recurring || item.note?.includes('[recurring]')) && (
                                        <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-sm" title="Daily Recurring Habit">
                                          <Repeat className="w-3 h-3" />
                                        </span>
                                      )}
                                      {!item.done && item.subjectId !== 'personal' && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                                          {subject.name}
                                        </span>
                                      )}
                                      {!item.done && item.estimatedMinutes && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10">
                                          ⏳ {formatTime(item.estimatedMinutes)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );})}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
            
          </div>
        </DragDropContext>
      </div>
    );
};

export default WeeklyPlannerPage;
