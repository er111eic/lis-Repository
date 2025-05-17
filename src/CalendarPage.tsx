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

  // 場地顏色說明
  const renderVenueLegend = () => (
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
  );

  // 月份切換
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-indigo-800 mb-4 md:mb-0">教室借用系統</h1>
            <div className="flex items-center space-x-4">
              <button onClick={handlePrevMonth} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md">上個月</button>
              <h2 className="text-xl font-semibold text-gray-700 w-40 text-center">
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
              </h2>
              <button onClick={handleNextMonth} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md">下個月</button>
            </div>
          </div>
          {renderVenueLegend()}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center font-semibold bg-gray-100 p-2 rounded">
            <div>週日</div>
            <div>週一</div>
            <div>週二</div>
            <div>週三</div>
            <div>週四</div>
            <div>週五</div>
            <div>週六</div>
          </div>
          <div className="grid grid-cols-7 gap-1" id="calendar">
            {/* 日曆格子（下一步搬移） */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
