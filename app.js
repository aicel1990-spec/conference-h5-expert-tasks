const data = window.MEETING_DATA;
const state = {
  query: "",
  selectedExpertId: null,
  selectedDate: data.sessions[0].date,
  venue: "all",
  track: "all",
  type: "all",
  showAllExperts: false
};

const DEFAULT_EXPERT_LIMIT = 10;
const FILTER_CONFIG = {
  venue: {
    title: "选择会场",
    allLabel: "全部会场",
    stateKey: "venue",
    valueGetter: (session) => session.venue,
    triggerSelector: "#venueFilter"
  },
  track: {
    title: "选择专题",
    allLabel: "全部专题",
    stateKey: "track",
    valueGetter: (session) => session.track,
    triggerSelector: "#trackFilter"
  },
  type: {
    title: "选择环节类型",
    allLabel: "全部类型",
    stateKey: "type",
    valueGetter: (session) => session.type,
    triggerSelector: "#typeFilter"
  }
};

const $ = (selector) => document.querySelector(selector);

const sessionById = new Map(data.sessions.map((session) => [session.id, session]));
const expertById = new Map(data.experts.map((expert) => [expert.id, expert]));
const tasksByExpert = data.tasks.reduce((acc, task) => {
  if (!acc.has(task.expertId)) acc.set(task.expertId, []);
  acc.get(task.expertId).push(task);
  return acc;
}, new Map());

function formatDate(dateText) {
  const date = new Date(`${dateText}T00:00:00+08:00`);
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function timeValue(session) {
  return `${session.date} ${session.startTime}`;
}

function sortedTasks(tasks) {
  return [...tasks].sort((a, b) => timeValue(sessionById.get(a.sessionId)).localeCompare(timeValue(sessionById.get(b.sessionId))));
}

function validText(value) {
  if (Array.isArray(value)) return value.filter(validText).join("、");
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text && text !== "无" && text !== "undefined" && text !== "null" ? text : "";
}

function speakerOrganization(expert, task) {
  const text = validText(expert.organization);
  return task.roles?.includes("讲者") && text !== "参会单位待补充" ? text : "";
}

function fieldRow(label, value) {
  const text = validText(value);
  return text ? `<div><dt>${label}</dt><dd>${text}</dd></div>` : "";
}

function taskTextLine(label, value) {
  const text = validText(value);
  return text ? `<p><b>${label}：</b>${text}</p>` : "";
}

function sessionPersonRows(session, task = {}) {
  const pairedDiscussants = task.includePairedDiscussion ? session.pairedDiscussion?.discussants : [];
  const discussants = [...new Set([...(session.discussants || []), ...(pairedDiscussants || [])])];
  return [
    ["主讲/主持", session.speakerChairs],
    ["大会主席", session.presidents],
    ["致辞", session.speeches],
    ["讲者", session.speakers],
    ["主持", session.chairs],
    ["讨论", discussants],
    ["评审", session.reviewers],
    ["总结", session.summaries]
  ].map(([label, value]) => [label, validText(value)]).filter(([, text]) => text);
}

function taskAgendaRows(session, task = {}) {
  const rows = [
    ["讲题/议题", session.title],
    ...sessionPersonRows(session, task)
  ];
  return rows.map(([label, value]) => [label, validText(value)]).filter(([, text]) => text);
}

function taskEndTime(task, session) {
  const spansPairedDiscussion = task.roles?.includes("主持") && session.pairedDiscussion;
  return spansPairedDiscussion ? session.pairedDiscussion.endTime : session.endTime;
}

function renderConference() {
  $("#heroTitle").innerHTML = "<span>血液肿瘤精准诊疗与</span><span>细胞治疗前沿学术会议</span>";

  $("#noticeGrid").innerHTML = `
    <article class="info-card info-card--intro">
      <h3>会议简介</h3>
      <p>此次会议将特邀国内血液病领域顶尖专家，围绕急性髓系白血病、多发性骨髓瘤、淋巴瘤、骨髓纤维化、造血干细胞移植、CAR-T 细胞治疗等前沿热点议题进行深度探讨。会议特别设立“免疫治疗专场”，聚焦细胞治疗在血液肿瘤中的排兵布阵、毒副反应管理及指南更新解读；另设血小板管理专题分会场，探讨临床实际问题。</p>
    </article>
    <article class="info-card info-card--notice">
      <h3>参会信息</h3>
      <div class="notice-details">
        <section>
          <strong>一、报到时间</strong>
          <p>2026年7月31日</p>
        </section>
        <section>
          <strong>二、报到地点</strong>
          <p>深圳福田区好日子皇冠假日酒店</p>
          <p class="notice-details__secondary">地址：广东省深圳市福田区福华一路28号。</p>
        </section>
        <section>
          <strong>三、会议时间</strong>
          <p>2026年8月1日8:30至2026年8月2日17:10</p>
        </section>
        <section>
          <strong>四、会议地点</strong>
          <p>线下会议地点：深圳福田区好日子皇冠假日酒店会议厅（详见日程）</p>
          <p class="notice-details__secondary">地址：广东省深圳市福田区福华一路28号。</p>
          <p class="notice-details__secondary">线上会议号：腾讯会议 813-726-169</p>
        </section>
        <section>
          <strong>五、参会人员</strong>
          <p>相关专业医师、研究员、研究生、护士、技师</p>
        </section>
      </div>
    </article>
  `;
}

function getExpertTaskCount(expertId) {
  return (tasksByExpert.get(expertId) || []).length;
}

function expertMatches(expert, query) {
  if (!getExpertTaskCount(expert.id)) return false;
  if (!query) return getExpertTaskCount(expert.id) > 0;
  const taskTitles = (tasksByExpert.get(expert.id) || [])
    .map((task) => sessionById.get(task.sessionId)?.title || "")
    .join(" ");
  const haystack = [expert.name, expert.pinyin, expert.initials, expert.organization, expert.title, taskTitles].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderExpertResults() {
  const query = state.query.trim();
  const matches = data.experts
    .filter((expert) => expertMatches(expert, query))
    .sort((a, b) => getExpertTaskCount(b.id) - getExpertTaskCount(a.id) || a.name.localeCompare(b.name, "zh-Hans-CN"));
  const visibleMatches = !query && !state.showAllExperts ? matches.slice(0, DEFAULT_EXPERT_LIMIT) : matches;
  const hasMoreDefaultExperts = !query && !state.showAllExperts && matches.length > DEFAULT_EXPERT_LIMIT;

  $("#resultMeta").textContent = query
    ? `找到 ${matches.length} 位匹配专家`
    : `默认展示任务较多的 ${Math.min(DEFAULT_EXPERT_LIMIT, matches.length)} 位专家`;

  if (!matches.length) {
    $("#expertResults").innerHTML = `
      <div class="empty-state">
        <strong>未找到匹配专家</strong>
        <p>请尝试输入姓名、拼音、首字母或单位关键词，例如“冯佳”“fj”“北京大学深圳医院”。</p>
      </div>
    `;
    $("#taskDetail").innerHTML = `
      <div class="empty-state">
        <strong>暂无可展示任务</strong>
        <p>搜索条件没有匹配到专家。</p>
      </div>
    `;
    return;
  }

  if (!state.selectedExpertId || !matches.some((expert) => expert.id === state.selectedExpertId)) {
    state.selectedExpertId = matches[0].id;
  }

  $("#expertResults").classList.toggle("is-single-match", Boolean(query && matches.length === 1));
  $("#expertResults").innerHTML = visibleMatches.map((expert) => {
    const count = getExpertTaskCount(expert.id);
    return `
      <button class="expert-card ${expert.id === state.selectedExpertId ? "is-active" : ""}" type="button" data-expert-id="${expert.id}">
        <span>
          <strong>${expert.name}</strong>
        </span>
        <em>${count}项任务</em>
      </button>
    `;
  }).join("") + (hasMoreDefaultExperts ? `
    <button class="expert-more" id="showMoreExperts" type="button">展开更多专家</button>
  ` : "");

  document.querySelectorAll(".expert-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedExpertId = button.dataset.expertId;
      renderExpertResults();
    });
  });
  const showMoreButton = $("#showMoreExperts");
  if (showMoreButton) {
    showMoreButton.addEventListener("click", () => {
      state.showAllExperts = true;
      renderExpertResults();
    });
  }

  renderTaskDetail();
}

function renderTaskDetail() {
  const expert = expertById.get(state.selectedExpertId);
  if (!expert) return;
  const tasks = sortedTasks(tasksByExpert.get(expert.id) || []);
  const expertMeta = validText(expert.title);
  const taskItems = tasks.map((task) => {
    const session = sessionById.get(task.sessionId);
    const personRows = taskAgendaRows(session, task).map(([label, text]) => taskTextLine(label, text)).join("");
    const organizationLine = taskTextLine("工作单位", speakerOrganization(expert, task));
    return `
      <article class="task-card">
        <div class="task-card__time">
          <strong>${formatDate(session.date)}</strong>
          <span>${session.startTime}-${taskEndTime(task, session)}</span>
        </div>
        <div class="task-card__body">
          <div class="task-card__top">
            <span class="tag">${task.role}</span>
            <span>${session.venue}</span>
          </div>
          <h4>${session.title}</h4>
          <p>${session.track} · ${session.type}</p>
          ${organizationLine}
          ${personRows}
        </div>
      </article>
    `;
  }).join("");

  $("#taskDetail").innerHTML = `
    <header class="task-detail__head">
      <div>
        <h3>${expert.name}</h3>
        ${expertMeta ? `<p>${expertMeta}</p>` : ""}
      </div>
      <button class="primary" id="copyTasks" type="button" ${tasks.length ? "" : "disabled"}>复制任务清单</button>
    </header>
    <div class="task-summary">
      <span>共 ${tasks.length} 项任务</span>
      <span>已按时间顺序排列</span>
    </div>
    <div class="task-list">${taskItems || `<div class="empty-state"><strong>暂无任务</strong><p>该专家目前没有录入关联任务。</p></div>`}</div>
  `;

  $("#copyTasks").addEventListener("click", () => copyExpertTasks(expert, tasks));
}

function copyExpertTasks(expert, tasks) {
  const lines = [
    `${expert.name}｜会议任务清单`,
    `${data.conference.name}`,
    ""
  ];
  sortedTasks(tasks).forEach((task, index) => {
    const session = sessionById.get(task.sessionId);
    lines.push(`${index + 1}. ${formatDate(session.date)} ${session.startTime}-${taskEndTime(task, session)}`);
    lines.push(`   会场：${session.venue}`);
    lines.push(`   当前专家角色：${task.role}`);
    lines.push(`   专题/分会场：${session.track}`);
    lines.push(`   环节类型：${session.type}`);
    lines.push(`   讲题/议题：${session.title}`);
    const organization = speakerOrganization(expert, task);
    if (organization) lines.push(`   工作单位：${organization}`);
    taskAgendaRows(session, task).forEach(([label, text]) => {
      lines.push(`   ${label}：${text}`);
    });
  });
  const text = lines.join("\n");
  tryCopyText(text);
}

function fallbackCopyText(text) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch (error) {
    return false;
  }
}

function tryCopyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => showToast("任务清单已复制"))
      .catch(() => {
        if (fallbackCopyText(text)) {
          showToast("任务清单已复制");
        } else {
          showToast("复制失败，请手动选择复制");
        }
      });
  } else if (fallbackCopyText(text)) {
    showToast("任务清单已复制");
  } else {
    showToast("复制失败，请手动选择复制");
  }
}

function renderFilters() {
  const dates = [...new Set(data.sessions.map((session) => session.date))];
  $("#dateTabs").innerHTML = dates.map((date) => `
    <button class="${date === state.selectedDate ? "is-active" : ""}" type="button" data-date="${date}">
      ${formatDate(date)}
    </button>
  `).join("");
  document.querySelectorAll("#dateTabs button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      renderFilters();
      renderSchedule();
    });
  });

  renderFilterTriggers();
}

function getFilterOptions(filterKey) {
  const config = FILTER_CONFIG[filterKey];
  return ["all", ...new Set(data.sessions.map(config.valueGetter).filter(validText))];
}

function getFilterLabel(filterKey, value = state[FILTER_CONFIG[filterKey].stateKey]) {
  const config = FILTER_CONFIG[filterKey];
  return value === "all" ? config.allLabel : value;
}

function renderFilterTriggers() {
  Object.entries(FILTER_CONFIG).forEach(([filterKey, config]) => {
    const trigger = $(config.triggerSelector);
    if (trigger) {
      trigger.querySelector("span").textContent = getFilterLabel(filterKey);
      trigger.classList.toggle("has-value", state[config.stateKey] !== "all");
    }
  });
}

function openFilterSheet(filterKey) {
  const config = FILTER_CONFIG[filterKey];
  const sheet = $("#filterSheet");
  const options = getFilterOptions(filterKey);
  $("#filterSheetTitle").textContent = config.title;
  $("#filterOptions").innerHTML = options.map((value) => `
    <button class="filter-option ${state[config.stateKey] === value ? "is-active" : ""}" type="button" data-filter-key="${filterKey}" data-filter-value="${value}">
      <span>${getFilterLabel(filterKey, value)}</span>
    </button>
  `).join("");
  sheet.classList.add("is-open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-filter-sheet");
}

function closeFilterSheet() {
  const sheet = $("#filterSheet");
  if (!sheet) return;
  sheet.classList.remove("is-open");
  sheet.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-filter-sheet");
}

function renderSchedule() {
  const list = data.sessions
    .filter((session) => session.date === state.selectedDate)
    .filter((session) => state.venue === "all" || session.venue === state.venue)
    .filter((session) => state.track === "all" || session.track === state.track)
    .filter((session) => state.type === "all" || session.type === state.type)
    .sort((a, b) => `${a.startTime}${a.venue}`.localeCompare(`${b.startTime}${b.venue}`));

  $("#scheduleCount").textContent = `${formatDate(state.selectedDate)} · ${list.length} 个日程项`;
  if (!list.length) {
    $("#scheduleList").innerHTML = `
      <div class="empty-state">
        <strong>当前筛选无日程</strong>
        <p>请切换日期、会场或环节类型。</p>
      </div>
    `;
    return;
  }

  $("#scheduleList").innerHTML = list.map((session) => {
    const fields = [
      fieldRow("主讲/主持", session.speakerChairs),
      fieldRow("大会主席", session.presidents),
      fieldRow("致辞", session.speeches),
      fieldRow("讲者", session.speakers),
      fieldRow("主持", session.chairs),
      fieldRow("讨论/点评", session.discussants),
      fieldRow("评审", session.reviewers),
      fieldRow("总结", session.summaries)
    ].join("");
    return `
      <article class="schedule-card" data-session-id="${session.id}">
        <div class="schedule-card__time">
          <strong>${session.startTime}</strong>
          <span>${session.endTime}</span>
        </div>
        <div class="schedule-card__main">
          <div class="schedule-card__tags">
            <span>${session.venue}</span>
            <span>${session.track}</span>
            <span>${session.type}</span>
          </div>
          <h3>${session.title}</h3>
          ${fields ? `<dl>${fields}</dl>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function sessionTimestamp(session, key) {
  return new Date(`${session.date}T${session[key]}:00+08:00`).getTime();
}

function scrollToScheduleSession(session, message) {
  state.selectedDate = session.date;
  state.venue = "all";
  state.track = "all";
  state.type = "all";
  renderFilters();
  renderSchedule();
  requestAnimationFrame(() => {
    const target = [...document.querySelectorAll("#scheduleList [data-session-id]")]
      .find((card) => card.dataset.sessionId === session.id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (message) showToast(message);
  });
}

function jumpToCurrentSchedule() {
  const now = Date.now();
  const ordered = [...data.sessions].sort((a, b) => sessionTimestamp(a, "startTime") - sessionTimestamp(b, "startTime"));
  const active = ordered.filter((session) => now >= sessionTimestamp(session, "startTime") && now < sessionTimestamp(session, "endTime"));
  if (active.length) {
    scrollToScheduleSession(active[0], active.length > 1 ? `当前有 ${active.length} 个并行日程，已定位第一项` : "已定位当前进行中的日程");
    return;
  }

  const next = ordered.find((session) => sessionTimestamp(session, "startTime") > now);
  if (next) {
    scrollToScheduleSession(next, "当前暂无进行中日程，已定位下一项");
    return;
  }

  scrollToScheduleSession(ordered[ordered.length - 1], "会议日程已结束，已定位最后一项");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function setActiveSection(sectionId, options = {}) {
  document.body.classList.toggle("has-active-section", Boolean(sectionId));
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((section) => {
    section.classList.toggle("is-active", section.id === sectionId);
  });

  const target = sectionId ? document.getElementById(sectionId) : document.getElementById("home");
  if (target && options.scroll !== false) {
    target.scrollIntoView({ behavior: options.behavior || "smooth", block: "start" });
  }
}

function bindSectionNavigation() {
  const contentIds = new Set([...document.querySelectorAll(".content-section")].map((section) => section.id));
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const targetId = link.getAttribute("href").slice(1);
    if (targetId === "home") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        history.pushState(null, "", "#home");
        setActiveSection(null);
      });
      return;
    }
    if (contentIds.has(targetId)) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        history.pushState(null, "", `#${targetId}`);
        setActiveSection(targetId);
      });
    }
  });

  window.addEventListener("popstate", () => {
    const targetId = location.hash.replace("#", "");
    setActiveSection(contentIds.has(targetId) ? targetId : null, { behavior: "auto" });
  });

  const initialId = location.hash.replace("#", "");
  setActiveSection(contentIds.has(initialId) ? initialId : null, { scroll: false });
}

function bindEvents() {
  $("#expertSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    state.showAllExperts = false;
    $("#globalSearch").value = state.query;
    renderExpertResults();
  });
  $("#globalSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    state.showAllExperts = false;
    $("#expertSearch").value = state.query;
    renderExpertResults();
  });
  $("#heroSearchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    history.pushState(null, "", "#search");
    setActiveSection("search");
    renderExpertResults();
  });
  $("#clearSearch").addEventListener("click", () => {
    state.query = "";
    state.showAllExperts = false;
    $("#expertSearch").value = "";
    $("#globalSearch").value = "";
    renderExpertResults();
  });
  $("#searchJump").addEventListener("click", () => {
    renderExpertResults();
  });
  Object.entries(FILTER_CONFIG).forEach(([filterKey, config]) => {
    $(config.triggerSelector).addEventListener("click", () => openFilterSheet(filterKey));
  });
  $("#scheduleFilterJump").addEventListener("click", () => {
    $("#schedule .filters").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#jumpToCurrent").addEventListener("click", jumpToCurrentSchedule);
  $("#scheduleBackTop").addEventListener("click", () => {
    $("#schedule").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const mapLink = $("#hotelMapLink");
  const resetMapLink = () => {
    if (!mapLink) return;
    mapLink.classList.remove("is-opening");
    mapLink.removeAttribute("aria-busy");
    mapLink.textContent = mapLink.dataset.defaultLabel || "酒店高德地图导航";
  };
  if (mapLink) {
    mapLink.addEventListener("click", () => {
      mapLink.classList.add("is-opening");
      mapLink.setAttribute("aria-busy", "true");
      mapLink.textContent = "正在打开高德地图…";
    });
    window.addEventListener("pageshow", resetMapLink);
  }
  $("#filterSheet").addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-filter-close]");
    if (closeTarget) {
      closeFilterSheet();
      return;
    }
    const option = event.target.closest(".filter-option");
    if (!option) return;
    const filterKey = option.dataset.filterKey;
    const config = FILTER_CONFIG[filterKey];
    state[config.stateKey] = option.dataset.filterValue;
    renderFilterTriggers();
    renderSchedule();
    closeFilterSheet();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeFilterSheet();
  });
  bindSectionNavigation();
}

function enableSearchControls() {
  document.querySelectorAll("[data-ready-label]").forEach((button) => {
    button.textContent = button.dataset.readyLabel || "查询";
    button.disabled = false;
    button.removeAttribute("aria-busy");
  });
}

function init() {
  renderConference();
  renderFilters();
  renderSchedule();
  renderExpertResults();
  bindEvents();
  enableSearchControls();
}

init();
