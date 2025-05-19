// 將時間字串（HH:mm）轉為分鐘數，並掛到 window 以防 Safari 作用域問題
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}
window.timeToMinutes = timeToMinutes;

// Firebase 設定
const firebaseConfig = {
  apiKey: "999253388381",
  authDomain: "xingdexangdeclassroom.firebaseapp.com",
  projectId: "xingdexangdeclassroom",
};
// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ========== 事件資料載入/儲存 ==========
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

// 場地選擇渲染
function renderVenueSelector() {
  const $container = $('#venueSelector').empty();
  venues.forEach(venue => {
    const id = 'venue_' + venue.replace(/[^\w]/g, '');
    const checked = selectedVenues.includes(venue) ? 'checked' : '';
    $container.append(`
      <label class="flex items-center mb-1">
        <input type="checkbox" class="venue-checkbox mr-2" value="${venue}" id="${id}" ${checked}>
        <span>${venue}</span>
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
    validateEventForm && validateEventForm();
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
function closeViewEventModal() {
  $('#viewEventModal').addClass('hidden');
  selectedEventId = null;
  currentEventDate = null;
}

// 由於 closeViewEventModal 需在 jQuery ready 前宣告，移到檔案最前面
function closeEventModal() {
  $('#eventModal').addClass('hidden');
  selectedEventId = null;
  currentEventDate = null;
}

// ========== 雲端同步（Firestore） ==========
async function loadEvents() {
  try {
    const snapshot = await db.collection('events').get();
    events = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!events[data.date]) events[data.date] = [];
      events[data.date].push({ ...data, id: doc.id });
    });
  } catch (e) {
    events = {};
  }
}
async function saveEventToCloud(dateStr, eventObj, isEdit = false) {
  if (isEdit && eventObj.id) {
    await db.collection('events').doc(eventObj.id).set({ ...eventObj, date: dateStr });
  } else {
    await db.collection('events').add({ ...eventObj, date: dateStr });
  }
}
async function deleteEventFromCloud(eventId) {
  if (eventId) await db.collection('events').doc(eventId).delete();
}

function renderCalendar() {
  const hostTypeBorder = {
    '學界': '#2196f3', // 藍色
    '社會界': '#ff9800' // 橘色
  };
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
      const venue = (ev.venues||[])[0] || '';
      const venueColor = venueColors[venue] || '#e0e0e0';
      const hostType = ev.hostType || '';
      const borderColor = hostTypeBorder[hostType] || '#bdbdbd';
      // 活動方塊：背景色=教室，底框線=界別
      html += `<div class='event' 
        style='background:${venueColor};border-bottom:4px solid ${borderColor};padding:2px 6px;margin-bottom:2px;cursor:pointer;border-radius:6px;position:relative;' 
        data-event-id='${ev.id}' 
        data-organizer='${ev.organizer||''}'
        title='${ev.title}\n${venue}\n${ev.startTime}-${ev.endTime}\n${ev.organizer?('負責人:'+ev.organizer):''}'>
        <span style='font-weight:bold;'>${ev.title}</span>
        <span class='event-organizer-tooltip' style='display:none;position:absolute;left:0;right:0;bottom:-1.8em;background:rgba(0,0,0,0.8);color:#fff;font-size:12px;padding:2px 6px;border-radius:4px;z-index:10;text-align:center;'>${ev.organizer||''}</span>
      </div>`;
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
  // 允許點擊日曆空白區塊直接新增活動（已實作，強化 UX 提示）
  $('.calendar-day').off('click').on('click',function(e){
    if($(e.target).hasClass('event')) return;
    openEventModal($(this).data('date'));
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
  if (step === 1) {
    $('#eventTitleError').text('');
    $('#eventHostTypeError').text('');
    if (!$('#eventTitle').val().trim()) {
      $('#eventTitleError').text('請填寫活動名稱');
      valid = false;
    }
    if (!$('input[name="eventHostType"]:checked').val()) {
      $('#eventHostTypeError').text('請選擇主辦單位');
      valid = false;
    }
  } else if (step === 2) {
    $('#eventStartTimeError').text('');
    $('#eventEndTimeError').text('');
    $('#venueSelectorError').text('');
    if (!$('#eventStartTime').val()) {
      $('#eventStartTimeError').text('請選擇開始時間');
      valid = false;
    }
    if (!$('#eventEndTime').val()) {
      $('#eventEndTimeError').text('請選擇結束時間');
      valid = false;
    } else if ($('#eventStartTime').val() && timeToMinutes($('#eventEndTime').val()) <= timeToMinutes($('#eventStartTime').val())) {
      $('#eventEndTimeError').text('結束時間必須晚於開始時間');
      valid = false;
    }
    if ($('.venue-checkbox:checked').length === 0) {
      $('#venueSelectorError').text('請選擇場地');
      valid = false;
    }
  } else if (step === 3) {
    $('#eventOrganizerError').text('');
    $('#eventOrganizerPhoneError').text('');
    if (!$('#eventOrganizer').val().trim()) {
      $('#eventOrganizerError').text('請輸入負責人姓名');
      valid = false;
    }
    if (!$('#eventOrganizerPhone').val().trim()) {
      $('#eventOrganizerPhoneError').text('請輸入負責人電話');
      valid = false;
    }
  }
  return valid;
}
$(function() {
  loadEvents().then(() => {
    updateMonthYearDisplay();
    renderCalendar();
  });
  // 上下月按鈕改為箭頭
  $('#prevMonth').html('<span class="icon">&#8592;</span>');
  $('#nextMonth').html('<span class="icon">&#8594;</span>');
  $('#prevMonth, #nextMonth').addClass('btn-primary btn-icon');

  // 儲存/取消/編輯/刪除/關閉按鈕圖示與樣式
  $('#saveEvent').addClass('btn-primary btn-icon').html('<span class="icon">＋</span>儲存');
  $('#cancelEvent').addClass('btn-secondary btn-icon').html('<span class="icon">✖️</span>取消');
  $('#editEvent').addClass('btn-primary btn-icon').html('<span class="icon">✏️</span>編輯');
  $('#deleteEvent').addClass('btn-secondary btn-icon').html('<span class="icon">🗑️</span>刪除');
  $('#closeViewEvent').addClass('btn-secondary btn-icon').html('<span class="icon">✖️</span>關閉');

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
  $('#cancelEvent').off('click').on('click', closeEventModal);
  $('#saveEvent').off('click').on('click', function(e) {
    e.preventDefault();
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
  // 分步驟切換
  $('#nextStep').off('click').on('click', function() {
    if (validateStep(eventFormStep)) {
      showEventFormStep(eventFormStep + 1);
    }
  });
  $('#prevStep').off('click').on('click', function() {
    showEventFormStep(eventFormStep - 1);
  });
});
function updateMonthYearDisplay() {
  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  $('#currentMonthYear').text(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`);
}
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
  // 填入活動資訊
  $('#viewEventTitle').text(ev.title || '');
  $('#viewEventTime').text(`${ev.startTime || ''} - ${ev.endTime || ''}`);
  const venueText = (ev.venues || []).map(v => v.split('-').pop()).join(', ');
  $('#viewEventVenue').text(venueText); // 修正id
  $('#viewEventHostType').text(ev.hostType || '');
  $('#viewEventOrganizer').text(ev.organizer || '');
  $('#viewEventOrganizerPhone').text(ev.organizerPhone || '');
  // 顯示 modal
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
  // 清空所有錯誤訊息
  $('#eventTitleError,#eventHostTypeError,#eventStartTimeError,#eventEndTimeError,#venueSelectorError,#eventOrganizerError,#eventOrganizerPhoneError').text('');
  // 活動名稱
  if (!$('#eventTitle').val().trim()) {
    $('#eventTitleError').text('請填寫活動名稱');
    valid = false;
  }
  // 主辦單位
  if (!$('input[name="eventHostType"]:checked').val()) {
    $('#eventHostTypeError').text('請選擇主辦單位');
    valid = false;
  }
  // 開始時間
  if (!$('#eventStartTime').val()) {
    $('#eventStartTimeError').text('請選擇開始時間');
    valid = false;
  }
  // 結束時間
  if (!$('#eventEndTime').val()) {
    $('#eventEndTimeError').text('請選擇結束時間');
    valid = false;
  } else if ($('#eventStartTime').val() && timeToMinutes($('#eventEndTime').val()) <= timeToMinutes($('#eventStartTime').val())) {
    $('#eventEndTimeError').text('結束時間必須晚於開始時間');
    valid = false;
  }
  // 場地
  if ($('.venue-checkbox:checked').length === 0) {
    $('#venueSelectorError').text('請選擇場地');
    valid = false;
  }
  // 負責人
  if (!$('#eventOrganizer').val().trim()) {
    $('#eventOrganizerError').text('請輸入負責人姓名');
    valid = false;
  }
  // 電話
  if (!$('#eventOrganizerPhone').val().trim()) {
    $('#eventOrganizerPhoneError').text('請輸入負責人電話');
    valid = false;
  }
  return valid;
}

// 綁定即時驗證
$(function() {
  $('#eventTitle, #eventOrganizer, #eventOrganizerPhone').on('input', validateEventForm);
  $('input[name="eventHostType"]').on('change', validateEventForm);
  $('#eventStartTime, #eventEndTime').on('change', validateEventForm);
  $(document).on('change', '.venue-checkbox', validateEventForm);

  // 攔截表單送出
  $('#eventModal form').on('submit', async function(e) {
    e.preventDefault();
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
    // 清空錯誤訊息
    $('#eventTitleError,#eventHostTypeError,#eventStartTimeError,#eventEndTimeError,#venueSelectorError,#eventOrganizerError,#eventOrganizerPhoneError').text('');
    // 標題
    $('#eventModalTitle').text('新增活動');
    // 顯示 Modal
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
    $('#eventModal').removeClass('hidden');
    $('#viewEventModal').addClass('hidden');
    // 讓儲存按鈕永遠顯示
    $('#saveEvent').removeClass('hidden');
  };
});
