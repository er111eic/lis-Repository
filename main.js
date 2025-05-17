// Firebase 設定
const firebaseConfig = {
  apiKey: "999253388381",
  authDomain: "xingdexangdeclassroom.firebaseapp.com",
  projectId: "xingdexangdeclassroom",
};
// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const venueColors = {
  "晑德-佛堂": "#ffcdd2", "晑德-廚房": "#c8e6c9", "晑德-多功能教室": "#bbdefb",
  "晑德-會談室": "#d1c4e9", "杏德-佛堂": "#ffe0b2", "杏德-坤伙": "#b2dfdb"
};
let selectedVenues = [];
let currentDate = new Date();
let events = {};
let selectedEventId = null;
let selectedVenue = null;
let currentEventDate = null;
const venues = [
  "晑德-佛堂",
  "晑德-廚房",
  "晑德-多功能教室",
  "晑德-會談室",
  "杏德-佛堂",
  "杏德-坤伙"
];

$(function() {
  loadEvents();
  updateMonthYearDisplay();
  renderCalendar();
  $('#prevMonth').click(() => { currentDate.setMonth(currentDate.getMonth()-1); updateMonthYearDisplay(); renderCalendar(); });
  $('#nextMonth').click(() => { currentDate.setMonth(currentDate.getMonth()+1); updateMonthYearDisplay(); renderCalendar(); });
  $('#cancelEvent').click(closeEventModal);
  $('#saveEvent').click(saveEvent);
  $('#closeViewEvent').click(closeViewEventModal);
  $('#editEvent').click(editEvent);
  $('#deleteEvent').click(deleteEvent);
  $('#eventStartTime,#eventEndTime').change(renderVenueSelector);
  $('#cancelImport').click(closeImportModal);
  $('#confirmImport').click(importData);
});
function updateMonthYearDisplay() {
  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  $('#currentMonthYear').text(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`);
}
function renderCalendar() {
  const year = currentDate.getFullYear(), month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1), lastDay = new Date(year, month+1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const $cal = $('#calendar').empty();
  for(let i=0;i<firstDayOfWeek;i++) $cal.append('<div class="calendar-day bg-gray-100 p-2 rounded"></div>');
  for(let day=1;day<=lastDay.getDate();day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    let html = `<div class='calendar-day bg-white border p-2 rounded relative' data-date='${dateStr}'>`;
    html += `<div class='text-right font-semibold mb-1'>${day}</div><div class='events-container'>`;
    if(events[dateStr]) for(const ev of events[dateStr]) {
      if(!ev||!ev.id) continue;
      const venueText = (ev.venues||[]).map(v=>v.split('-').pop()).join(',');
      html += `<div class='event' title='${ev.title}\n${venueText}\n${ev.startTime}-${ev.endTime}' data-event-id='${ev.id}'>${ev.title} (${venueText})</div>`;
    }
    html += '</div></div>';
    $cal.append(html);
  }
  // 滑鼠特效
  $('.calendar-day').off('mouseenter mouseleave').on('mouseenter',function(){
    $(this).addClass('calendar-day-hover');
  }).on('mouseleave',function(){
    $(this).removeClass('calendar-day-hover');
  });
  $('.calendar-day').off('click').on('click',function(e){
    if($(e.target).hasClass('event')) return;
    openEventModal($(this).data('date'));
  });
  $('.event').off('click').on('click',function(e){
    e.stopPropagation();
    const date = $(this).closest('.calendar-day').data('date');
    viewEvent($(this).data('event-id'), date);
  });
}
function openEventModal(dateStr, isEdit=false) {
  currentEventDate = dateStr;
  $('#eventModalTitle').text(isEdit?'編輯活動':'新增活動');
  $('#eventDate').val(dateStr);
  if(!isEdit) { $('#eventTitle').val(''); $("input[name='eventHostType']").prop('checked',false); $('#eventStartTime').val('09:00'); $('#eventEndTime').val('10:00'); $('#eventOrganizer').val(''); $('#eventOrganizerPhone').val(''); selectedVenues=[]; }
  renderVenueSelector();
  $('#eventModal').removeClass('hidden');
}
function closeEventModal() { $('#eventModal').addClass('hidden'); selectedEventId=null; currentEventDate=null; }
function renderVenueSelector() {
  const dateStr = $('#eventDate').val(), startTime=$('#eventStartTime').val(), endTime=$('#eventEndTime').val();
  const $venueSel = $('#venueSelector').empty();
  venues.forEach(venue=>{
    const isBooked = checkVenueBooked(dateStr,venue,startTime,endTime);
    const checked = selectedVenues.includes(venue);
    let html = `<label class='p-2 border rounded flex items-center cursor-pointer ${isBooked?'venue-booked bg-gray-100 text-gray-400':''}'>`;
    html += `<input type='checkbox' class='venue-checkbox' value='${venue}' ${checked&&!isBooked?'checked':''} ${isBooked?'disabled':''}/>`;
    html += `<div class='w-4 h-4 rounded mr-2' style='background:${venueColors[venue]}'></div><span class='flex-1'>${venue}</span>`;
    if(isBooked) html += `<span class='text-xs text-red-500 ml-1'>已預訂</span>`;
    html += '</label>';
    $venueSel.append(html);
  });
  $('.venue-checkbox').off('change').on('change',function(){
    const v=$(this).val();
    if(this.checked) selectedVenues.push(v); else selectedVenues=selectedVenues.filter(x=>x!==v);
    renderVenueSelector();
  });
}
function checkVenueBooked(dateStr,venue,startTime,endTime) {
  if(!events[dateStr]) return false;
  const newStart=timeToMinutes(startTime), newEnd=timeToMinutes(endTime);
  if(newStart>=newEnd) return false;
  // 嚴格審查：同一時段同一場地不可重複
  return events[dateStr].some(ev=>Array.isArray(ev.venues)&&ev.venues.includes(venue)&&!(selectedEventId&&ev.id===selectedEventId)&&overlap(ev.startTime,ev.endTime,startTime,endTime));
}
function overlap(s1,e1,s2,e2){
  const a=timeToMinutes(s1),b=timeToMinutes(e1),c=timeToMinutes(s2),d=timeToMinutes(e2);
  return c<b&&d>a;
}
function timeToMinutes(t){if(!t||t.indexOf(':')===-1)return 0;const[a,b]=t.split(':').map(Number);return a*60+b;}
function saveEvent() {
  const dateStr = document.getElementById('eventDate').value;
  const title = document.getElementById('eventTitle').value.trim();
  const startTime = document.getElementById('eventStartTime').value;
  const endTime = document.getElementById('eventEndTime').value;
  const hostType = document.querySelector('input[name="eventHostType"]:checked')?.value || '';
  const venuesArr = Array.from(new Set(selectedVenues)); // 僅保留唯一場地
  const organizer = document.getElementById('eventOrganizer').value.trim();
  const organizerPhone = document.getElementById('eventOrganizerPhone').value.trim();
  if (!title) { showToast('請輸入活動名稱', 'error'); return; }
  if (!hostType) { showToast('請選擇主辦單位', 'error'); return; }
  if (!startTime || !endTime) { showToast('請輸入活動時間', 'error'); return; }
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) { showToast('結束時間必須晚於開始時間', 'error'); return; }
  if (!venuesArr.length) { showToast('請選擇場地', 'error'); return; }
  if (!organizer) { showToast('請輸入負責人姓名', 'error'); return; }
  if (!organizerPhone) { showToast('請輸入負責人電話', 'error'); return; }
  // 嚴格審查：所有選擇場地都不能有重疊
  for (const v of venuesArr) {
    if (checkVenueBooked(dateStr, v, startTime, endTime)) {
      showToast(`${v} 在所選時間已被預訂，請選擇其他場地或時間`, 'error');
      return;
    }
  }
  if (!events[dateStr]) {
    events[dateStr] = [];
  }
  if (selectedEventId) {
    const eventIndex = events[dateStr].findIndex(e => e && e.id === selectedEventId);
    if (eventIndex !== -1) {
      // 編輯現有活動
      events[dateStr][eventIndex] = {
        id: selectedEventId,
        title,
        startTime,
        endTime,
        venues: venuesArr,
        hostType,
        organizer,
        organizerPhone
      };
      showToast('活動已更新', 'success');
    } else {
      showToast('編輯失敗：找不到該活動', 'error');
    }
  } else {
    const newEvent = {
      id: Date.now().toString(),
      title,
      startTime,
      endTime,
      venues: venuesArr,
      hostType,
      organizer,
      organizerPhone
    };
    events[dateStr].push(newEvent);
    showToast('活動已新增', 'success');
  }
  saveEvents();
  closeEventModal();
  renderCalendar();
}
function deleteEvent() {
  if (!currentEventDate || !selectedEventId) {
    showToast('無法刪除：未選擇活動', 'error');
    return;
  }
  const eventIdStr = String(selectedEventId);
  // 僅警告一次
  if (!window._deleteConfirm || window._deleteConfirm !== eventIdStr) {
    window._deleteConfirm = eventIdStr;
    if (!confirm('確定要刪除此活動嗎？')) return;
  }
  window._deleteConfirm = null;
  if (!events[currentEventDate] || !Array.isArray(events[currentEventDate])) {
    showToast('找不到該日期的活動', 'error');
    closeViewEventModal();
    return;
  }
  const eventIndex = events[currentEventDate].findIndex(e => e && String(e.id) === eventIdStr);
  if (eventIndex !== -1) {
    events[currentEventDate].splice(eventIndex, 1);
    if (events[currentEventDate].length === 0) {
      delete events[currentEventDate];
    }
    saveEvents();
    closeViewEventModal();
    renderCalendar();
    showToast('活動已成功刪除', 'success');
  } else {
    showToast('找不到要刪除的活動', 'error');
    closeViewEventModal();
  }
}
