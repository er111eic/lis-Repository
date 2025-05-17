import React, { useState, useEffect } from 'react';
import './App.css';

// 場地列表
const VENUES = [
  '晑德-佛堂',
  '晑德-廚房',
  '晑德-多功能教室',
  '晑德-會談室',
  '杏德-佛堂',
  '杏德-坤伙',
];

const HOST_TYPES = ['學界', '社會界'];

export type EventType = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venues: string[];
  hostType: string;
  organizer: string;
  organizerPhone: string;
};

function App() {
  // 狀態
  const [events, setEvents] = useState<Record<string, EventType[]>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<EventType | null>(null);
  const [showDetail, setShowDetail] = useState<EventType | null>(null);

  // ...Firebase 讀寫與同步可於此加入...

  // 日曆渲染
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const days: React.ReactNode[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day bg-gray-100 rounded" />);
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push(
        <div
          key={dateStr}
          className="calendar-day bg-white border rounded p-2 min-h-[90px] cursor-pointer hover:bg-indigo-50 relative"
          onClick={() => openModal(dateStr)}
        >
          <div className="text-right text-xs font-semibold mb-1">{day}</div>
          <div className="space-y-1">
            {(events[dateStr] || []).map(ev => (
              <div
                key={ev.id}
                className="event bg-indigo-100 rounded px-2 py-1 text-xs truncate cursor-pointer hover:bg-indigo-200"
                title={ev.title}
                onClick={e => { e.stopPropagation(); setShowDetail(ev); }}
              >
                {ev.title} ({ev.venues.map(v => v.split('-').pop()).join(',')})
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  // Modal 開啟/關閉
  const openModal = (date: string) => {
    setEditEvent({
      id: '',
      title: '',
      date,
      startTime: '09:00',
      endTime: '10:00',
      venues: [],
      hostType: '',
      organizer: '',
      organizerPhone: '',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditEvent(null); };

  // 活動儲存（僅本地，Firebase 可後續補上）
  const handleSave = () => {
    if (!editEvent) return;
    const { date, id } = editEvent;
    setEvents(prev => {
      const arr = prev[date] ? prev[date].filter(e => e.id !== id) : [];
      const newId = id || Date.now().toString();
      return {
        ...prev,
        [date]: [...arr, { ...editEvent, id: newId }],
      };
    });
    closeModal();
  };

  // UI
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 py-4 max-w-3xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-indigo-800 mb-2 md:mb-0">教室借用系統</h1>
          <div className="flex items-center space-x-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded">上個月</button>
            <span className="text-lg font-semibold text-gray-700 w-32 text-center">{currentDate.getFullYear()}年{currentDate.getMonth() + 1}月</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded">下個月</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2 text-center font-semibold bg-gray-100 p-2 rounded">
          {[...Array(7)].map((_, i) => <div key={i}>{['日','一','二','三','四','五','六'][i]}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {renderCalendar()}
        </div>
      </div>
      {/* 活動 Modal */}
      {showModal && editEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold mb-4">{editEvent.id ? '編輯活動' : '新增活動'}</h3>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">活動名稱</label>
              <input className="w-full p-2 border rounded" value={editEvent.title} onChange={e => setEditEvent(ev => ev ? { ...ev, title: e.target.value } : null)} />
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">主辦單位</label>
              <div className="flex space-x-4">
                {HOST_TYPES.map(type => (
                  <label key={type} className="flex items-center cursor-pointer">
                    <input type="radio" name="hostType" value={type} checked={editEvent.hostType === type} onChange={() => setEditEvent(ev => ev ? { ...ev, hostType: type } : null)} className="mr-2" />{type}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">時間</label>
              <div className="flex space-x-2">
                <input type="time" className="w-1/2 p-2 border rounded" value={editEvent.startTime} onChange={e => setEditEvent(ev => ev ? { ...ev, startTime: e.target.value } : null)} />
                <span className="flex items-center">至</span>
                <input type="time" className="w-1/2 p-2 border rounded" value={editEvent.endTime} onChange={e => setEditEvent(ev => ev ? { ...ev, endTime: e.target.value } : null)} />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">場地（可複選）</label>
              <div className="grid grid-cols-2 gap-2">
                {VENUES.map(venue => (
                  <label key={venue} className="flex items-center cursor-pointer p-2 border rounded">
                    <input type="checkbox" className="mr-2" checked={editEvent.venues.includes(venue)} onChange={e => setEditEvent(ev => ev ? { ...ev, venues: e.target.checked ? [...ev.venues, venue] : ev.venues.filter(v => v !== venue) } : null)} />
                    {venue}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">負責人</label>
              <input className="w-full p-2 border rounded mb-2" value={editEvent.organizer} onChange={e => setEditEvent(ev => ev ? { ...ev, organizer: e.target.value } : null)} placeholder="請輸入負責人姓名" />
              <input className="w-full p-2 border rounded" value={editEvent.organizerPhone} onChange={e => setEditEvent(ev => ev ? { ...ev, organizerPhone: e.target.value } : null)} placeholder="請輸入負責人電話" />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">取消</button>
              <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">儲存</button>
            </div>
          </div>
        </div>
      )}
      {/* 活動詳情 Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold mb-4">活動詳情</h3>
            <div className="mb-2"><span className="font-semibold">活動名稱：</span>{showDetail.title}</div>
            <div className="mb-2"><span className="font-semibold">主辦單位：</span>{showDetail.hostType}</div>
            <div className="mb-2"><span className="font-semibold">日期：</span>{showDetail.date}</div>
            <div className="mb-2"><span className="font-semibold">時間：</span>{showDetail.startTime} - {showDetail.endTime}</div>
            <div className="mb-2"><span className="font-semibold">場地：</span>{showDetail.venues.join(', ')}</div>
            <div className="mb-2"><span className="font-semibold">負責人：</span>{showDetail.organizer}</div>
            <div className="mb-2"><span className="font-semibold">電話：</span>{showDetail.organizerPhone}</div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowDetail(null)} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
