import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { TodoItem } from '../types';
import { generateTodoSuggestions } from '../services/smartParser';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { mockSubjects } from '../mockData';

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
      const newTodos: TodoItem[] = suggestions.map(s => ({
        id: Math.random().toString(36).substring(2, 9),
        title: s.title || 'Untitled',
        subjectId: s.subjectId || 'personal',
        note: s.note || '',
          estimatedMinutes: s.estimatedMinutes,
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
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden flex flex-col">
        <div className="mb-6 shrink-0">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">Weekly Backlog Planner</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Brain dump your workload into the Inbox, then drag to schedule!</p>
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:overflow-hidden">
            
            {/* LEFT PANE: MASTER INBOX */}
            <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col h-[50vh] lg:h-full bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden shrink-0">
              {(() => {
                const col = weekDays[0];
                if (!col) return null;
                const items = weekData[col.dateStr] || [];
                return (
                  <>
                    <div className="shrink-0 p-5 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        {col.title}
                        <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-bold">{items.length}</span>
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {col.subtitle}
                      </p>
                    </div>
                    
                    <div className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 bg-white/30 dark:bg-slate-900/20">
                      <form onSubmit={(e) => handleSmartAdd(col.dateStr, e)}>
                        <input
                          type="text"
                          placeholder="Dump workload here..."
                          className="w-full text-sm px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:text-slate-100 shadow-sm transition-all"
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
                          className={`flex-1 p-4 overflow-y-auto scrollbar-hide transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
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
                                  style={{ borderLeftColor: subject.color }}
                                  className={`p-3 mb-3 rounded-xl text-sm border-y border-r border-l-[6px] shadow-sm transition-all overflow-hidden ${snapshot.isDragging ? 'bg-white dark:bg-slate-800 border-y-blue-400 border-r-blue-400 dark:border-y-blue-500 dark:border-r-blue-500 shadow-lg z-50' : 'bg-white dark:bg-slate-800 border-y-slate-200 border-r-slate-200 dark:border-y-slate-700 dark:border-r-slate-700 hover:shadow-md'}`}
                                >
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-start gap-3">
                                      <button onClick={() => handleToggleDone(col.dateStr, item.id)} className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-500 transition-colors">
                                        {item.done ? <CheckCircle2 className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5" />}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-[13px] leading-tight ${item.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                          {item.title}
                                        </p>
                                      </div>
                                      <button onClick={() => handleDelete(col.dateStr, item.id)} className="shrink-0 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <div className="pl-8 flex flex-wrap gap-1.5 items-center mt-1">
                                      {!item.done && item.subjectId !== 'personal' && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                                          {subject.name}
                                        </span>
                                      )}
                                      {!item.done && item.estimatedMinutes && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
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
                  <div key={col.dateStr} className={`w-[320px] min-w-[320px] flex flex-col h-full bg-white dark:bg-slate-800 rounded-3xl shadow-sm border transition-all ${isToday ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-slate-200 dark:border-slate-700'}`}>
                    
                    {/* Header */}
                    <div className={`shrink-0 p-5 border-b border-slate-100 dark:border-slate-700 rounded-t-3xl ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        {col.title}
                        <span className="text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold shadow-sm">{items.length}</span>
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {col.subtitle}
                      </p>
                    </div>

                    {/* Smart Input */}
                    <div className="shrink-0 p-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <form onSubmit={(e) => handleSmartAdd(col.dateStr, e)}>
                        <input
                          type="text"
                          placeholder="Add task..."
                          className="w-full text-sm px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-slate-200 transition-all placeholder-slate-400"
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
                          className={`flex-1 p-3 overflow-y-auto scrollbar-hide transition-colors ${snapshot.isDraggingOver ? 'bg-slate-50 dark:bg-slate-700/30' : ''}`}
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
                                  style={{ borderLeftColor: subject.color }}
                                  className={`group p-3 mb-2 rounded-xl text-sm border-y border-r border-l-[6px] shadow-sm transition-all overflow-hidden ${snapshot.isDragging ? 'bg-white dark:bg-slate-800 border-y-blue-400 border-r-blue-400 dark:border-y-blue-500 dark:border-r-blue-500 shadow-lg z-50' : 'bg-white dark:bg-slate-800 border-y-slate-200 border-r-slate-200 dark:border-y-slate-700 dark:border-r-slate-700 hover:shadow-md'}`}
                                >
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-start gap-3">
                                      <button onClick={() => handleToggleDone(col.dateStr, item.id)} className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-500 transition-colors">
                                        {item.done ? <CheckCircle2 className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5" />}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-semibold leading-snug ${item.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                          {item.title}
                                        </p>
                                      </div>
                                      <button onClick={() => handleDelete(col.dateStr, item.id)} className="shrink-0 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <div className="pl-8 flex flex-wrap gap-1.5 items-center mt-0.5">
                                      {!item.done && item.subjectId !== 'personal' && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                                          {subject.name}
                                        </span>
                                      )}
                                      {!item.done && item.estimatedMinutes && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
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
