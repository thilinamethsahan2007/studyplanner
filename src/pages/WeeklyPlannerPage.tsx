import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { TodoItem } from '../types';
import { generateTodoSuggestions } from '../services/smartParser';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const WeeklyPlannerPage: React.FC = () => {
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

  const handleSmartAdd = async (dateStr: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = inputs[dateStr];
    if (!text?.trim()) return;
    setInputs({ ...inputs, [dateStr]: '' });

    const suggestions = await generateTodoSuggestions(text);
    if (suggestions && suggestions.length > 0) {
      const newTodos: TodoItem[] = suggestions.map(s => ({
        id: Math.random().toString(36).substring(2, 9),
        title: s.title || 'Untitled',
        subjectId: s.subjectId || 'personal',
        note: s.note || '',
        done: false,
      }));
      const existing = weekData[dateStr] || [];
      const updated = [...existing, ...newTodos];
      setWeekData({ ...weekData, [dateStr]: updated });
      await apiClient.saveWeekTodos([{ date: dateStr, items: updated }]);
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
      case 'exercise': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'entertainment': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading weekly planner...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm tracking-tight">Weekly Backlog Planner</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Brain dump your workload into the Inbox, then drag and drop to schedule!</p>
      </div>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-y-auto pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
            {weekDays.map((col, index) => {
              const isInbox = index === 0;
              const isToday = !isInbox && new Date().toISOString().split('T')[0] === col.dateStr;
              const items = weekData[col.dateStr] || [];

              // Bento Grid logic
              let bentoClasses = "col-span-1";
              if (isInbox) {
                bentoClasses = "md:col-span-2 md:row-span-2"; // 2x2 massive block
              } else if (index === 7) {
                bentoClasses = "md:col-span-2 lg:col-span-2"; // Sunday stretches 2 cols on bottom
              }

              return (
                <div key={col.dateStr} className={`${bentoClasses} flex flex-col min-h-[250px] overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-xl shadow-black/5 border transition-all ${isToday ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-[0_0_15px_rgba(20,184,166,0.4)]' : isInbox ? 'border-dashed border-2 border-slate-300 dark:border-slate-600/70 bg-slate-100/50 dark:bg-slate-700/40' : 'border-white/50 dark:border-slate-700/50 hover:bg-white/70 dark:hover:bg-slate-800/80'}`}>
                  
                  {/* Header */}
                  <div className={`shrink-0 p-4 border-b border-slate-100/50 dark:border-slate-700/50 rounded-t-3xl ${isToday ? 'bg-indigo-500/10 dark:bg-indigo-500/20' : 'bg-white/30 dark:bg-slate-900/30'}`}>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                      {col.title}
                      <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{items.length}</span>
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {col.subtitle}
                    </p>
                  </div>

                  {/* Smart Input (Top of list) */}
                  <div className="shrink-0 p-3 border-b border-slate-100/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40">
                    <form onSubmit={(e) => handleSmartAdd(col.dateStr, e)}>
                      <input
                        type="text"
                        placeholder={isInbox ? "Dump workload here..." : "Add specific task..."}
                        className="w-full text-sm px-4 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-200 shadow-inner transition-all placeholder-slate-400/80 dark:placeholder-slate-500/80"
                        value={inputs[col.dateStr] || ''}
                        onChange={e => setInputs({ ...inputs, [col.dateStr]: e.target.value })}
                      />
                    </form>
                  </div>

                  {/* Task List (Droppable) */}
                  <Droppable droppableId={col.dateStr}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-100 dark:bg-slate-700/30' : ''}`}
                      >
                        {items.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group bg-white dark:bg-slate-700 p-3 rounded-lg border shadow-sm ${snapshot.isDragging ? 'shadow-lg border-indigo-300 ring-1 ring-indigo-300' : 'border-slate-200 dark:border-slate-600'} relative`}
                              >
                                <div className="flex items-start gap-3">
                                  <button onClick={() => handleToggleDone(col.dateStr, item.id)} className="mt-0.5 shrink-0">
                                    {item.done ? (
                                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-500" />
                                    )}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium break-words ${item.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                      {item.title}
                                    </p>
                                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${getSubjectColor(item.subjectId)}`}>
                                      {item.subjectId}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-sm text-center text-slate-400 dark:text-slate-500 mt-6 italic">Drop tasks here</p>
                        )}
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
