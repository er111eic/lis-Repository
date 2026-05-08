// 取得禮拜幾字串
function getWeekdayStr(dateStr) {
  if (!dateStr) return '';
  // 若有括號（已經有週幾），先去除
  const pureDate = dateStr.split('（')[0];
  const d = new Date(pureDate);
  if (isNaN(d)) return '';
  const weekdayNames = ['週日','週一','週二','週三','週四','週五','週六'];
  return weekdayNames[d.getDay()];
}
// ====== 農曆換算（簡易版，僅供日曆顯示） ======
// 參考自台灣常用農曆演算法，僅供顯示用途
function getLunarDateString(date) {
  // 國字農曆月份與日
  const cnDays = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
  try {
    const lunar = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
    let d = lunar.find(x => x.type==='day');
    let day = d ? d.value : '';
    // 取得國字日
    let dNum = parseInt(day.replace(/[^0-9]/g, ''));
    let dStr = cnDays[dNum-1] || day;
    return dStr;
  } catch (e) {
    return '--';
  }
}
// 預設隱藏 eventModal，避免一進入就顯示
$(document).ready(function(){
  $('#eventModal').addClass('hidden');
});

// 將時間字串（HH:mm）轉為分鐘數，並掛到 window 以防 Safari 作用域問題
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}
window.timeToMinutes = timeToMinutes;

// 移除 firebase 初始化與 Google 登入相關程式，改由新版 <script type="module"> 處理

// ========== 事件資料載入/儲存 ==========
// 場地顏色已不再使用，僅用界別顏色
// const venueColors = { ... };
let selectedVenues = [];
let currentDate = new Date();
let events = {};
let selectedEventId = null;
let selectedVenue = null;
let currentEventDate = null;
let formValidationVisible = false;
let lockedScrollY = 0;
const referenceCalendarStorageKey = 'xdsdReferenceCalendarVisible';
const venues = [
  "晑德-佛堂",
  "晑德-廚房",
  "晑德-多功能教室",
  "晑德-會談室",
  "杏德-佛堂",
  "杏德-坤伙"
];

function formatDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function getEventSummary(ev) {
  const time = ev.startTime && ev.endTime ? `${ev.startTime}-${ev.endTime}` : '未設定時間';
  const venuesText = Array.isArray(ev.venues) && ev.venues.length ? ev.venues.join('、') : '未設定空間';
  const hostType = ev.hostType ? `｜${ev.hostType}` : '';
  return `${time} ${venuesText}${hostType}`;
}

function renderTodayOverview() {
  const todayStr = formatDateStr(new Date());
  const todayEvents = Array.isArray(events[todayStr]) ? events[todayStr].filter(ev => ev && ev.id) : [];
  const weekday = getWeekdayStr(todayStr);
  let html = `
    <div class="today-overview-header">
      <div>
        <div class="today-overview-eyebrow">今日</div>
        <h3>${todayStr}（${weekday}）</h3>
      </div>
      <button id="todayAddEvent" class="btn-secondary btn-icon" type="button"><span class="icon">＋</span>今日借用</button>
    </div>
  `;
  if (!todayEvents.length) {
    html += `<div class="today-empty">今天尚無借用。可以直接新增一筆空間借用。</div>`;
  } else {
    html += '<div class="today-event-list">';
    todayEvents.forEach(ev => {
      const hostClass = ev.hostType === '社會界' ? 'event-host-community' : ev.hostType === '學界' ? 'event-host-academic' : '';
      const hostBadge = ev.hostType ? `<span class="host-type-badge">${ev.hostType}</span>` : '';
      html += `
        <button class="today-event-item ${hostClass}" type="button" data-event-id="${ev.id}" data-date="${todayStr}">
          <span class="today-event-title-row">
            <span class="today-event-title">${ev.title || '未命名活動'}</span>
            ${hostBadge}
          </span>
          <span class="today-event-meta">${getEventSummary(ev)}</span>
        </button>
      `;
    });
    html += '</div>';
  }
  $('#todayOverview').html(html);
  $('#todayAddEvent').off('click').on('click', () => openEventModal(todayStr));
  $('.today-event-item').off('click').on('click', function() {
    viewEvent($(this).data('event-id'), $(this).data('date'));
  });
}

function setReferenceCalendarVisible(visible) {
  const $panel = $('#referenceCalendarPanel');
  const $toggle = $('#toggleReferenceCalendar');
  $panel.toggleClass('hidden', !visible);
  $toggle.attr('aria-expanded', String(visible));
  $toggle.toggleClass('is-active', visible);
  $toggle.html(visible ? '<span class="icon">◎</span>隱藏參考' : '<span class="icon">◎</span>參考日曆');
  localStorage.setItem(referenceCalendarStorageKey, visible ? '1' : '0');
}

function initReferenceCalendarToggle() {
  const savedVisible = localStorage.getItem(referenceCalendarStorageKey) === '1';
  setReferenceCalendarVisible(savedVisible);
  $('#toggleReferenceCalendar').off('click').on('click', function() {
    setReferenceCalendarVisible($('#referenceCalendarPanel').hasClass('hidden'));
  });
  $('#hideReferenceCalendar').off('click').on('click', function() {
    setReferenceCalendarVisible(false);
  });
}

// 場地選擇渲染
function renderVenueSelector() {
  const $container = $('#venueSelector').empty();
  // 取得目前表單的日期與時間
  const dateStr = $('#eventDate').val();
  const startTime = $('#eventStartTime').val();
  const endTime = $('#eventEndTime').val();
  venues.forEach(venue => {
    const id = 'venue_' + venue.replace(/[^\w]/g, '');
    let isBooked = false;
    if (dateStr && startTime && endTime) {
      isBooked = checkVenueBooked(dateStr, venue, startTime, endTime);
    }
    // 若已勾選但現在衝突，移除勾選
    if (isBooked && selectedVenues.includes(venue)) {
      selectedVenues = selectedVenues.filter(x => x !== venue);
    }
    const isSelected = selectedVenues.includes(venue);
    const checked = isSelected ? 'checked' : '';
    const disabled = isBooked ? 'disabled' : '';
    const bookedClass = isBooked ? 'venue-booked text-gray-400 line-through' : '';
    const selectedClass = isSelected ? 'venue-selected' : '';
    $container.append(`
      <label class="venue-option flex items-center mb-1 ${bookedClass} ${selectedClass}">
        <input type="checkbox" class="venue-checkbox mr-2" value="${venue}" id="${id}" ${checked} ${disabled}>
        <span>${venue}</span>
        ${isBooked ? '<span class=\"ml-2 text-xs text-red-400\">已被預訂</span>' : ''}
      </label>
    `);
  });
  // 綁定勾選事件
  $('.venue-checkbox').off('change').on('change', function() {
    const v = $(this).val();
    if ($(this).is(':checked')) {
      if (!selectedVenues.includes(v)) selectedVenues.push(v);
    } else {
      selectedVenues = selectedVenues.filter(x => x !== v);
    }
    $(this).closest('.venue-option').toggleClass('venue-selected', $(this).is(':checked'));
    if (formValidationVisible) validateEventForm && validateEventForm();
  });
}
// 檢查指定日期、場地、時間區間是否有重疊活動
function checkVenueBooked(dateStr, venue, startTime, endTime) {
  if (!events[dateStr]) return false;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return events[dateStr].some(ev => {
    if (!ev.venues || !Array.isArray(ev.venues)) return false;
    if (!ev.startTime || !ev.endTime) return false;
    // 編輯時排除自己
    if (selectedEventId && ev.id === selectedEventId) return false;
    if (!ev.venues.includes(venue)) return false;
    const evStart = timeToMinutes(ev.startTime);
    const evEnd = timeToMinutes(ev.endTime);
    // 時間有重疊
    return (start < evEnd && end > evStart);
  });
}

// ========== Modal 關閉函式 ==========
function lockPageScroll() {
  if (document.body.classList.contains('sheet-open')) return;
  lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('sheet-open');
  document.body.style.top = `-${lockedScrollY}px`;
}

function unlockPageScrollIfNoSheet() {
  const eventOpen = !$('#eventModal').hasClass('hidden');
  const viewOpen = !$('#viewEventModal').hasClass('hidden');
  if (eventOpen || viewOpen) return;
  document.body.classList.remove('sheet-open');
  document.body.style.top = '';
  window.scrollTo(0, lockedScrollY || 0);
}

function closeViewEventModal() {
  $('#viewEventModal').addClass('hidden');
  selectedEventId = null;
  currentEventDate = null;
  unlockPageScrollIfNoSheet();
}

// 由於 closeViewEventModal 需在 jQuery ready 前宣告，移到檔案最前面
function closeEventModal() {
  $('#eventModal').addClass('hidden');
  selectedEventId = null;
  currentEventDate = null;
  unlockPageScrollIfNoSheet();
}

// ========== 雲端同步（Firestore） ==========
async function loadEvents() {
  if (!window.db) return;
  try {
    const { collection, getDocs } = window.firestoreFns;
    const snapshot = await getDocs(collection(window.db, 'events'));
    events = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!events[data.date]) events[data.date] = [];
      events[data.date].push({ ...data, id: doc.id });
    });
    populateOrganizerSuggestions();
  } catch (e) {
    events = {};
    populateOrganizerSuggestions();
  }
}

function populateOrganizerSuggestions() {
  const organizerNames = new Set();
  Object.values(events).forEach(dayEvents => {
    if (!Array.isArray(dayEvents)) return;
    dayEvents.forEach(ev => {
      const name = (ev && ev.organizer ? String(ev.organizer) : '').trim();
      if (name) organizerNames.add(name);
    });
  });
  const names = Array.from(organizerNames)
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
    .slice(0, 30);
  const $list = $('#organizerSuggestions').empty();
  names.forEach(name => $('<option>').val(name).appendTo($list));
}

function clearValidationState() {
  $('#eventTitleError,#eventHostTypeError,#eventStartTimeError,#eventEndTimeError,#venueSelectorError,#eventOrganizerError,#eventOrganizerPhoneError').text('');
  $('#eventModal .field-invalid').removeClass('field-invalid');
}

function markInvalid(selector) {
  $(selector).addClass('field-invalid');
}

async function saveEventToCloud(dateStr, eventObj, isEdit = false) {
  if (!window.db) return;
  const { collection, doc, setDoc, addDoc } = window.firestoreFns;
  if (isEdit && eventObj.id) {
    await setDoc(doc(window.db, 'events', eventObj.id), { ...eventObj, date: dateStr });
  } else {
    await addDoc(collection(window.db, 'events'), { ...eventObj, date: dateStr });
  }
}
async function deleteEventFromCloud(eventId) {
  if (!window.db) return;
  const { doc, deleteDoc } = window.firestoreFns;
  if (eventId) await deleteDoc(doc(window.db, 'events', eventId));
}

function renderCalendar() {
  const $calendarRoot = $('#calendar');
  $calendarRoot.addClass('is-updating');
  const hostTypeBorder = {
    '學界': '#007aff',
    '社會界': '#ff9500'
  };
  const year = currentDate.getFullYear(), month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1), lastDay = new Date(year, month+1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const $cal = $calendarRoot.empty();
  for(let i=0;i<firstDayOfWeek;i++) $cal.append('<div class="calendar-day calendar-day-empty bg-gray-100 p-2 rounded" aria-hidden="true"></div>');
  const weekdayNames = ['週日','週一','週二','週三','週四','週五','週六'];
  for(let day=1;day<=lastDay.getDate();day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    // 判斷是否為今天
    const isToday = (new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day);
    // 取得農曆日期
    const lunarStr = getLunarDateString(new Date(year, month, day));
    const weekday = weekdayNames[new Date(year, month, day).getDay()];
    const hasEvents = Array.isArray(events[dateStr]) && events[dateStr].some(ev => ev && ev.id);
    let html = `<div class='calendar-day ${hasEvents ? 'has-events' : ''} bg-white border p-2 rounded relative' data-date='${dateStr}'>`;
    // 新版：同一列，禮拜幾靠右，日期農曆靠左
    html += `<div class='flex flex-row items-center justify-between mb-1'>`;
    html += `<div class='flex flex-row items-center'>`;
    if (isToday) {
      html += `<span class='today-date'>${day}</span>`;
    } else {
      html += `<span class='text-gray-900 font-semibold'>${day}</span>`;
    }
    html += `<span class="lunar-date ml-1">${lunarStr}</span>`;
    html += `</div>`;
    html += `<span class='calendar-weekday-label md:hidden text-xs text-gray-500' style='display:none;'>${weekday}</span>`;
    html += `</div><div class='events-container'>`;
    if(events[dateStr]) for(const ev of events[dateStr]) {
      if(!ev||!ev.id) continue;
      const hostType = ev.hostType || '';
      const borderColor = hostTypeBorder[hostType] || '#bdbdbd';
      const hostClass = hostType === '學界' ? 'event-host-academic' : hostType === '社會界' ? 'event-host-community' : '';
      const hostBadge = hostType ? `<span class='host-type-badge'>${hostType}</span>` : '';
      // 根據界別顏色產生淡色背景
      let bgColor = '#f3f4f6';
      if (hostType === '學界') bgColor = 'rgba(33,150,243,0.10)'; // 藍色淡化
      if (hostType === '社會界') bgColor = 'rgba(255,152,0,0.13)'; // 橘色淡化
      html += `<div class='event ${hostClass}' 
        style='background:${bgColor};border-bottom:4px solid ${borderColor};padding:2px 6px;margin-bottom:2px;cursor:pointer;border-radius:6px;position:relative;' 
        data-event-id='${ev.id}' 
        data-organizer='${ev.organizer||''}'
        title='${ev.title}\n${ev.venues ? ev.venues.join(", ") : ''}\n${ev.startTime}-${ev.endTime}\n${ev.organizer?('負責人:'+ev.organizer):''}'>
        <span class='event-title-row'><span style='font-weight:bold;'>${ev.title}</span>${hostBadge}</span>
        <span class='event-mobile-meta'>${getEventSummary(ev)}</span>
        <span class='event-organizer-tooltip' style='display:none;position:absolute;left:0;right:0;bottom:-1.8em;background:rgba(0,0,0,0.8);color:#fff;font-size:12px;padding:2px 6px;border-radius:4px;z-index:10;text-align:center;'>${ev.organizer||''}</span>
      </div>`;
    }
    if (!hasEvents) {
      html += `<div class="calendar-empty-state">尚無借用</div>`;
    }
    html += '</div></div>';
    $cal.append(html);
  }
  // 手機下顯示禮拜幾標籤
  if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches) {
    $('.calendar-weekday-label').show();
  }
  // 滑鼠特效
  $('.calendar-day[data-date]').off('mouseenter mouseleave').on('mouseenter',function(){
    $(this).addClass('calendar-day-hover');
  }).on('mouseleave',function(){
    $(this).removeClass('calendar-day-hover');
  });
  // 允許點擊日曆空白區塊直接新增活動（已實作，強化 UX 提示）
  $('.calendar-day[data-date]').off('click').on('click',function(e){
    if($(e.target).hasClass('event')) return;
    const date = $(this).data('date');
    if (!date) return;
    openEventModal(date);
  });
  $('.event').off('click').on('click',function(e){
    e.stopPropagation();
    const date = $(this).closest('.calendar-day').data('date');
    viewEvent($(this).data('event-id'), date);
  }).off('mouseenter mouseleave').on('mouseenter',function(){
    $(this).find('.event-organizer-tooltip').show();
  }).on('mouseleave',function(){
    $(this).find('.event-organizer-tooltip').hide();
  });
  renderTodayOverview();
  window.requestAnimationFrame(() => {
    $calendarRoot.removeClass('is-updating');
  });
}

let eventFormStep = 1;
function showEventFormStep(step) {
  eventFormStep = step;
  // 顯示/隱藏步驟區塊（已廢棄，保留以防未來需要）
  $('#eventStep1').removeClass('hidden');
  $('#eventStep2').removeClass('hidden');
  $('#eventStep3').removeClass('hidden');
  // 儲存按鈕永遠顯示
  $('#saveEvent').removeClass('hidden');
  // 其他按鈕顯示控制（如有需要可保留）
  $('#prevStep').addClass('hidden');
  $('#nextStep').addClass('hidden');
}
// 分步驟驗證
function validateStep(step) {
  let valid = true;
  clearValidationState();
  if (step === 1) {
    if (!$('#eventTitle').val().trim()) {
      markInvalid($('#eventTitle').closest('.mb-2.flex'));
      valid = false;
    }
    if (!$('input[name="eventHostType"]:checked').val()) {
      markInvalid('.host-selector-row');
      valid = false;
    }
  } else if (step === 2) {
    if (!$('#eventStartTime').val()) {
      markInvalid('.time-field-row');
      valid = false;
    }
    if (!$('#eventEndTime').val()) {
      markInvalid('.time-field-row');
      valid = false;
    } else if ($('#eventStartTime').val() && timeToMinutes($('#eventEndTime').val()) <= timeToMinutes($('#eventStartTime').val())) {
      markInvalid('.time-field-row');
      valid = false;
    }
    if ($('.venue-checkbox:checked').length === 0) {
      markInvalid('#venueSelector');
      valid = false;
    }
  } else if (step === 3) {
    if (!$('#eventOrganizer').val().trim()) {
      markInvalid($('#eventOrganizer').closest('.mb-2.flex'));
      valid = false;
    }
  }
  return valid;
}
$(function() {
  loadEvents().then(() => {
    updateMonthYearDisplay();
    renderCalendar();
    initReferenceCalendarToggle();
  });
  // 上下月按鈕改為箭頭
  $('#prevMonth').html('<span class="icon">&#8592;</span>');
  $('#nextMonth').html('<span class="icon">&#8594;</span>');
  $('#prevMonth, #nextMonth').addClass('btn-primary btn-icon');

  // 儲存/取消/編輯/刪除/關閉按鈕圖示與樣式
  $('#saveEvent').addClass('btn-primary btn-icon').html('<span class="icon">＋</span>儲存');
  $('#cancelEvent').addClass('btn-secondary btn-icon').html('<span class="icon">×</span>取消');
  $('#editEvent').addClass('btn-primary btn-icon').html('<span class="icon">編</span>編輯');
  $('#deleteEvent').addClass('btn-secondary btn-icon').html('<span class="icon">刪</span>刪除');
  $('#closeViewEvent').addClass('btn-secondary btn-icon').html('<span class="icon">×</span>關閉');

  // 強化標題
  $('#eventModalTitle, .text-3xl').addClass('modal-title');

  // === 正確綁定所有按鈕 click 事件 ===
  $('#prevMonth').off('click').on('click', function() {
    currentDate.setMonth(currentDate.getMonth()-1);
    updateMonthYearDisplay();
    renderCalendar();
  });
  $('#nextMonth').off('click').on('click', function() {
    currentDate.setMonth(currentDate.getMonth()+1);
    updateMonthYearDisplay();
    renderCalendar();
  });
  $('#quickAddEvent').off('click').on('click', function() {
    openEventModal(formatDateStr(new Date()));
  });
  $('#cancelEvent').off('click').on('click', function(e) {
    e.preventDefault();
    closeEventModal();
  });
  $('#saveEvent').off('click').on('click', function(e) {
    e.preventDefault();
    formValidationVisible = true;
    if (!validateEventForm()) return;
    saveEvent();
  });
  $('#closeViewEvent').off('click').on('click', closeViewEventModal);
  $('#editEvent').off('click').on('click', editEvent);
  $('#deleteEvent').off('click').on('click', deleteEvent);
  // 讓點擊活動詳情視窗以外區域可關閉
  $('#viewEventModal').off('mousedown').on('mousedown', function(e) {
    if (e.target === this) {
      closeViewEventModal();
    }
  });
  // 修正：讓點擊 eventModal 遮罩區域可關閉（手機與桌面皆適用，避免表單內容阻擋）
  $('#eventModal').off('click').on('click', function(e) {
    if (e.target === this) {
      closeEventModal();
    }
  });
  // 分步驟切換
  $('#nextStep').off('click').on('click', function() {
    if (validateStep(eventFormStep)) {
      showEventFormStep(eventFormStep + 1);
    }
  });
  $('#prevStep').off('click').on('click', function() {
    showEventFormStep(eventFormStep - 1);
  });
  // 保險：每次進入頁面都隱藏 eventModal，避免異常狀態
  $('#eventModal').addClass('hidden');
});
function updateMonthYearDisplay() {
  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  $('#currentMonthYear').text(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`);
}
window.updateMonthYearDisplay = updateMonthYearDisplay;
async function saveEvent() {
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
      await saveEventToCloud(dateStr, events[dateStr][eventIndex], true);
      showToast('活動已更新', 'success');
    } else {
      showToast('編輯失敗：找不到該活動', 'error');
    }
  } else {
    const newEvent = {
      title,
      startTime,
      endTime,
      venues: venuesArr,
      hostType,
      organizer,
      organizerPhone
    };
    await saveEventToCloud(dateStr, newEvent, false);
    events[dateStr].push(newEvent);
    showToast('活動已新增', 'success');
  }
  // 重新同步
  await loadEvents();
  closeEventModal();
  renderCalendar();
}

window.loadEvents = loadEvents;
window.renderCalendar = renderCalendar;

async function deleteEvent() {
  if (!currentEventDate || !selectedEventId) {
    showToast('無法刪除：未選擇活動', 'error');
    return;
  }
  const eventIdStr = String(selectedEventId);
  if (!window._deleteConfirm || window._deleteConfirm !== eventIdStr) {
    window._deleteConfirm = eventIdStr;
    if (!confirm('確定要刪除此活動嗎？')) return;
  }
  window._deleteConfirm = null;
  await deleteEventFromCloud(eventIdStr);
  await loadEvents();
  closeViewEventModal();
  renderCalendar();
  showToast('活動已成功刪除', 'success');
}

function showToast(msg, type = 'success') {
  const $toast = $('#toast');
  $toast.text(msg).removeClass('success error').addClass(type).addClass('show');
  setTimeout(() => $toast.removeClass('show'), 2000);
}

function closeImportModal() {
  $('#importModal').addClass('hidden');
}

function editEvent() {
  if (!currentEventDate || !selectedEventId) {
    showToast('無法編輯：未選擇活動', 'error');
    return;
  }
  // 取得正確的活動物件
  let ev = null;
  // 先嘗試用 currentEventDate
  if (events[currentEventDate]) {
    ev = events[currentEventDate].find(e => e && e.id === selectedEventId);
  }
  // 若找不到，再全域搜尋一次（避免日期同步問題）
  if (!ev) {
    for (const date in events) {
      if (events[date]) {
        ev = events[date].find(e => e && e.id === selectedEventId);
        if (ev) {
          currentEventDate = date;
          break;
        }
      }
    }
  }
  if (!ev) {
    showToast('找不到該活動', 'error');
    return;
  }
  // 帶入資料到表單
  $('#eventTitle').val(ev.title || '');
  $("input[name='eventHostType']").prop('checked', false);
  $("input[name='eventHostType'][value='" + (ev.hostType||'') + "']").prop('checked', true);
  $('#eventStartTime').val(ev.startTime || '');
  $('#eventEndTime').val(ev.endTime || '');
  $('#eventOrganizer').val(ev.organizer || '');
  $('#eventOrganizerPhone').val(ev.organizerPhone || '');
  selectedVenues = Array.isArray(ev.venues) ? [...ev.venues] : [];
  $('#eventDate').val(currentEventDate);
  renderVenueSelector();
  $('#eventModalTitle').text('編輯活動');
  clearValidationState();
  // focus 在活動名稱欄位
  $('#eventTitle').focus();
  lockPageScroll();
  $('#eventModal').removeClass('hidden');
  $('#viewEventModal').addClass('hidden');
  // 讓儲存按鈕永遠顯示
  $('#saveEvent').removeClass('hidden');
}

function viewEvent(eventId, dateStr) {
  if (!events[dateStr]) return;
  const ev = events[dateStr].find(e => e && e.id === eventId);
  if (!ev) return;
  selectedEventId = eventId;
  currentEventDate = dateStr;
  // 日期加上禮拜幾
  let dateWithWeekday = dateStr;
  if (dateStr) {
    const weekday = getWeekdayStr(dateStr);
    dateWithWeekday = `${dateStr}（${weekday}）`;
  }
  // 以左右排列方式顯示活動詳情
  const detailRows = [
    { label: '活動名稱', value: ev.title || '' },
    { label: '主辦單位', value: ev.hostType || '' },
    { label: '日期', value: dateWithWeekday },
    { label: '時間', value: `${ev.startTime || ''} - ${ev.endTime || ''}` },
    // 直接顯示完整地點名稱
    { label: '場地', value: (ev.venues || []).join('、') },
    { label: '負責人', value: ev.organizer || '' },
    { label: '電話', value: ev.organizerPhone || '未填寫' }
  ];
  let html = '<div class="flex flex-col gap-2">';
  detailRows.forEach(row => {
    html += `<div class="flex flex-row items-center mb-1"><span class="font-semibold w-24 text-gray-700">${row.label}：</span><span class="flex-1 p-1 bg-gray-50 rounded">${row.value}</span></div>`;
  });
  html += '</div>';
  $('#viewEventModal .event-detail-content').html(html);
  // 顯示 modal
  lockPageScroll();
  $('#viewEventModal').removeClass('hidden');
}

function importData() {
  // TODO: 實作資料匯入功能
  showToast('尚未實作匯入功能', 'error');
}

// 時間欄位互動與驗證優化
$('#eventStartTime').on('change', function() {
  const start = $(this).val();
  if(start) {
    // 自動補 1 小時
    const [h, m] = start.split(':').map(Number);
    let endH = h+1;
    let endM = m;
    if(endH > 23) { endH = 23; endM = 59; }
    const endStr = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
    $('#eventEndTime').val(endStr);
  }
});
$('#eventEndTime').on('change', function() {
  const start = $('#eventStartTime').val();
  const end = $(this).val();
  if(start && end && timeToMinutes(end) <= timeToMinutes(start)) {
    showToast('結束時間必須晚於開始時間', 'error');
    $(this).val('');
  }
});

// ======= 表單即時驗證與提示（繁體中文）=======
function validateEventForm() {
  let valid = true;
  clearValidationState();
  // 活動名稱
  if (!$('#eventTitle').val().trim()) {
    markInvalid($('#eventTitle').closest('.mb-2.flex'));
    valid = false;
  }
  // 主辦單位
  if (!$('input[name="eventHostType"]:checked').val()) {
    markInvalid('.host-selector-row');
    valid = false;
  }
  // 開始時間
  if (!$('#eventStartTime').val()) {
    markInvalid('.time-field-row');
    valid = false;
  }
  // 結束時間
  if (!$('#eventEndTime').val()) {
    markInvalid('.time-field-row');
    valid = false;
  } else if ($('#eventStartTime').val() && timeToMinutes($('#eventEndTime').val()) <= timeToMinutes($('#eventStartTime').val())) {
    markInvalid('.time-field-row');
    valid = false;
  }
  // 場地
  if ($('.venue-checkbox:checked').length === 0) {
    markInvalid('#venueSelector');
    valid = false;
  }
  // 負責人
  if (!$('#eventOrganizer').val().trim()) {
    markInvalid($('#eventOrganizer').closest('.mb-2.flex'));
    valid = false;
  }
  return valid;
}

// 綁定即時驗證
$(function() {
  $('#eventTitle, #eventOrganizer, #eventOrganizerPhone').on('input', function() {
    if (formValidationVisible) validateEventForm();
  });
  $('input[name="eventHostType"]').on('change', function() {
    if (formValidationVisible) validateEventForm();
  });
  // 時間欄位變動時，重新渲染場地選擇（即時劃掉已被預訂的教室）
  $('#eventStartTime, #eventEndTime').on('change', function() {
    renderVenueSelector();
    if (formValidationVisible) validateEventForm();
  });
  $(document).on('change', '.venue-checkbox', function() {
    if (formValidationVisible) validateEventForm();
  });

  // 攔截表單送出
  $('#eventModal form').on('submit', async function(e) {
    e.preventDefault();
    formValidationVisible = true;
    if (!validateEventForm()) return;
    await saveEvent();
  });
});

// Accordion 不再限制只能展開一段，header 僅做視覺效果
// 送出時驗證所有欄位
$(function() {
  // Accordion header 點擊（已無需展開/收合功能，僅保留視覺效果）
  $('.accordion-header').off('click');
  // 開啟表單時不再需要 showAccordionStep
  window.openEventModal = function(dateStr, isEdit=false) {
    selectedEventId = null;
    currentEventDate = dateStr;
    formValidationVisible = false;
    // 設定日期欄位
    $('#eventDate').val(dateStr || '');
    // 清空表單欄位
    $('#eventTitle').val('');
    $("input[name='eventHostType']").prop('checked', false);
    $('#eventStartTime').val('');
    $('#eventEndTime').val('');
    $('#eventOrganizer').val('');
    $('#eventOrganizerPhone').val('');
    selectedVenues = [];
    renderVenueSelector && renderVenueSelector();
    clearValidationState();
    // 標題
    $('#eventModalTitle').text('新增活動');
    // 顯示 Modal
    lockPageScroll();
    $('#eventModal').removeClass('hidden');
    // 關閉活動詳情視窗（避免重疊）
    $('#viewEventModal').addClass('hidden');
  };
  // 編輯活動時不再需要 showAccordionStep
  window.editEvent = function() {
    if (!currentEventDate || !selectedEventId) {
      showToast('無法編輯：未選擇活動', 'error');
      return;
    }
    formValidationVisible = false;
    // 取得正確的活動物件
    let ev = null;
    // 先嘗試用 currentEventDate
    if (events[currentEventDate]) {
      ev = events[currentEventDate].find(e => e && e.id === selectedEventId);
    }
    // 若找不到，再全域搜尋一次（避免日期同步問題）
    if (!ev) {
      for (const date in events) {
        if (events[date]) {
          ev = events[date].find(e => e && e.id === selectedEventId);
          if (ev) {
            currentEventDate = date;
            break;
          }
        }
      }
    }
    if (!ev) {
      showToast('找不到該活動', 'error');
      return;
    }
    // 帶入資料到表單
    $('#eventTitle').val(ev.title || '');
    $("input[name='eventHostType']").prop('checked', false);
    $("input[name='eventHostType'][value='" + (ev.hostType||'') + "']").prop('checked', true);
    $('#eventStartTime').val(ev.startTime || '');
    $('#eventEndTime').val(ev.endTime || '');
    $('#eventOrganizer').val(ev.organizer || '');
    $('#eventOrganizerPhone').val(ev.organizerPhone || '');
    selectedVenues = Array.isArray(ev.venues) ? [...ev.venues] : [];
    $('#eventDate').val(currentEventDate);
    renderVenueSelector();
    $('#eventModalTitle').text('編輯活動');
    clearValidationState();
    // focus 在活動名稱欄位
    $('#eventTitle').focus();
    lockPageScroll();
    $('#eventModal').removeClass('hidden');
    $('#viewEventModal').addClass('hidden');
    // 讓儲存按鈕永遠顯示
    $('#saveEvent').removeClass('hidden');
  };
});
