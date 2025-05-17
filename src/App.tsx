import React, { useState, useEffect } from 'react';
import './App.css';
import CalendarPage from './CalendarPage';

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
  return <CalendarPage />;
}

export default App;
