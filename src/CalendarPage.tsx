import React, { useState } from "react";

const VENUES = [
  "晑德-佛堂",
  "晑德-廚房",
  "晑德-多功能教室",
  "晑德-會談室",
  "杏德-佛堂",
  "杏德-坤伙",
];

const venueColors: Record<string, string> = {
  "晑德-佛堂": "#ffcdd2",
  "晑德-廚房": "#c8e6c9",
  "晑德-多功能教室": "#bbdefb",
  "晑德-會談室": "#d1c4e9",
  "杏德-佛堂": "#ffe0b2",
  "杏德-坤伙": "#b2dfdb",
};

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 活動表單欄位狀態
  const [eventTitle, setEventTitle] = useState("");
  const [eventHostType, setEventHostType] = useState("");
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventVenues, setEventVenues] = useState<string[]>([]);
  const [eventOrganizer, setEventOrganizer] = useState("");
  const [eventOrganizerPhone, setEventOrganizerPhone] = useState("");

  // 活動資料狀態
  const [events, setEvents] = useState<Array<{
    id: string;
    date: string;
    title: string;
    hostType: string;
    startTime: string;
    endTime: string;
    venues: string[];
    organizer: string;
    organizerPhone: string;
  }>>([]);
  // 表單錯誤狀態
  const [formError, setFormError] = useState<string>("");

  // 表單重置
  const resetForm = () => {
    setEventTitle("");
    setEventHostType("");
    setEventStartTime("09:00");
    setEventEndTime("10:00");
    setEventVenues([]);
    setEventOrganizer("");
    setEventOrganizerPhone("");
  };

  // Modal 開啟時重置表單
  React.useEffect(() => {
    if (showModal) resetForm();
  }, [showModal]);

  // 場地多選切換
  const toggleVenue = (venue: string) => {
    setEventVenues((prev) =>
      prev.includes(venue) ? prev.filter((v) => v !== venue) : [...prev, venue]
    );
  };

  // 點擊日期開啟活動 Modal
  const openEventModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowModal(true);
  };
  const closeEventModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  // 儲存活動
  const handleSaveEvent = () => {
    // 基本驗證
    if (!eventTitle.trim()) {
      setFormError("請輸入活動名稱");
      return;
    }
    if (!eventHostType) {
      setFormError("請選擇主辦單位");
      return;
    }
    if (!eventStartTime || !eventEndTime) {
      setFormError("請輸入活動時間");
      return;
    }
    if (eventVenues.length === 0) {
      setFormError("請選擇場地");
      return;
    }
    if (!eventOrganizer.trim()) {
      setFormError("請輸入負責人");
      return;
    }
    if (!eventOrganizerPhone.trim()) {
      setFormError("請輸入負責人電話");
      return;
    }
    // 新增活動
    setEvents(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        date: selectedDate!,
        title: eventTitle,
        hostType: eventHostType,
        startTime: eventStartTime,
        endTime: eventEndTime,
        venues: eventVenues,
        organizer: eventOrganizer,
        organizerPhone: eventOrganizerPhone,
      }
    ]);
    setFormError("");
    setShowModal(false);
    setSelectedDate(null);
  };

  // 日曆格子渲染
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
      // 找出該日活動
      const dayEvents = events.filter(ev => ev.date === dateStr);
      days.push(
        <div
          key={day}
          className="calendar-day bg-white border rounded p-2 min-h-[100px] cursor-pointer hover:bg-indigo-50 relative"
          onClick={() => openEventModal(dateStr)}
        >
          <div className="text-right text-xs font-semibold mb-1">{day}</div>
          {/* 活動顯示 */}
          <div className="space-y-1">
            {dayEvents.map(ev => (
              <div key={ev.id} className="text-xs rounded px-1 py-0.5" style={{background: venueColors[ev.venues[0]]}}>
                <span className="font-bold">{ev.title}</span>
                <span className="ml-1">({ev.venues.join(',')})</span>
                <span className="ml-1 text-gray-600">{ev.startTime}-{ev.endTime}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-indigo-800 mb-4 md:mb-0">教室借用系統</h1>
            <div className="flex items-center space-x-4">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md">上個月</button>
              <h2 className="text-xl font-semibold text-gray-700 w-40 text-center">
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
              </h2>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md">下個月</button>
            </div>
          </div>
          {/* 場地顏色說明 */}
          <div className="mb-6">
            <div className="flex flex-wrap mb-2">
              {VENUES.map((venue) => (
                <div key={venue} className="w-full md:w-1/3 px-2 mb-2">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: venueColors[venue] }}></div>
                    <span>{venue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2 text-center font-semibold bg-gray-100 p-2 rounded">
            <div>週日</div>
            <div>週一</div>
            <div>週二</div>
            <div>週三</div>
            <div>週四</div>
            <div>週五</div>
            <div>週六</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </div>
      </div>
      {/* 活動 Modal（初步，僅顯示選擇的日期） */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold mb-4">新增活動</h3>
            {/* 錯誤訊息 */}
            {formError && <div className="text-red-600 mb-2">{formError}</div>}
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">活動名稱</label>
              <input className="w-full p-2 border rounded" value={eventTitle} onChange={e => setEventTitle(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">主辦單位</label>
              <div className="flex space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="hostType" value="學界" checked={eventHostType === "學界"} onChange={() => setEventHostType("學界")} className="mr-2" />學界
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="hostType" value="社會界" checked={eventHostType === "社會界"} onChange={() => setEventHostType("社會界")} className="mr-2" />社會界
                </label>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">時間</label>
              <div className="flex space-x-2">
                <input type="time" className="w-1/2 p-2 border rounded" value={eventStartTime} onChange={e => setEventStartTime(e.target.value)} />
                <span className="flex items-center">至</span>
                <input type="time" className="w-1/2 p-2 border rounded" value={eventEndTime} onChange={e => setEventEndTime(e.target.value)} />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">場地（可複選）</label>
              <div className="grid grid-cols-2 gap-2">
                {VENUES.map(venue => (
                  <label key={venue} className="flex items-center cursor-pointer p-2 border rounded">
                    <input type="checkbox" className="mr-2" checked={eventVenues.includes(venue)} onChange={() => toggleVenue(venue)} />
                    {venue}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">負責人</label>
              <input className="w-full p-2 border rounded mb-2" value={eventOrganizer} onChange={e => setEventOrganizer(e.target.value)} placeholder="請輸入負責人姓名" />
              <input className="w-full p-2 border rounded" value={eventOrganizerPhone} onChange={e => setEventOrganizerPhone(e.target.value)} placeholder="請輸入負責人電話" />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={closeEventModal} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">取消</button>
              <button onClick={handleSaveEvent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
