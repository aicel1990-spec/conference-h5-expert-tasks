const data = window.MEETING_DATA;
const state = {
  query: "",
  selectedExpertId: null,
  selectedDate: data.sessions[0].date,
  venue: "all",
  track: "all",
  type: "all"
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
  if (text === "点评专家请提前到场") return "";
  return text && text !== "无" && text !== "undefined" && text !== "null" ? text : "";
}

function fieldRow(label, value) {
  const text = validText(value);
  return text ? `<div><dt>${label}</dt><dd>${text}</dd></div>` : "";
}

function taskTextLine(label, value) {
  const text = validText(value);
  return text ? `<p><b>${label}：</b>${text}</p>` : "";
}

function renderConference() {
  $("#heroTitle").innerHTML = "<span>血液肿瘤精准诊疗与</span><span>细胞治疗前沿学术会议</span>";

  $("#infoGrid").innerHTML = `
    <article class="info-card info-card--intro">
      <h3>会议简介</h3>
      <p>此次会议将特邀国内血液病领域顶尖专家，围绕急性髓系白血病、多发性骨髓瘤、淋巴瘤、骨髓纤维化、造血干细胞移植、CAR-T 细胞治疗等前沿热点议题进行深度探讨。会议特别设立“免疫治疗专场”，聚焦细胞治疗在血液肿瘤中的排兵布阵、毒副反应管理及指南更新解读；另设血小板管理专题分会场，探讨临床实际问题。</p>
    </article>
    <article class="info-card info-card--key">
      <h3>会议时间</h3>
      <p><strong>2026年7月31日14:30</strong><span>至</span><strong>2026年8月2日17:10</strong></p>
    </article>
    <article class="info-card info-card--key">
      <h3>会议地点</h3>
      <p><span>线下会议地点</span><strong>深圳福田区福华一路28号好日子皇冠假日酒店会议厅（详见日程）</strong></p>
      <p><span>线上会议号</span><strong>腾讯会议 813-726-169</strong></p>
    </article>
  `;
}

function getExpertTaskCount(expertId) {
  return (tasksByExpert.get(expertId) || []).length;
}

function expertMatches(expert, query) {
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

  $("#resultMeta").textContent = query ? `找到 ${matches.length} 位匹配专家` : "默认展示已有任务的专家";

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

  $("#expertResults").innerHTML = matches.map((expert) => {
    const count = getExpertTaskCount(expert.id);
    return `
      <button class="expert-card ${expert.id === state.selectedExpertId ? "is-active" : ""}" type="button" data-expert-id="${expert.id}">
        <span>
          <strong>${expert.name}</strong>
          <small>${expert.organization}</small>
        </span>
        <em>${count}项任务</em>
      </button>
    `;
  }).join("");

  document.querySelectorAll(".expert-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedExpertId = button.dataset.expertId;
      renderExpertResults();
    });
  });

  renderTaskDetail();
}

function renderTaskDetail() {
  const expert = expertById.get(state.selectedExpertId);
  if (!expert) return;
  const tasks = sortedTasks(tasksByExpert.get(expert.id) || []);
  const taskItems = tasks.map((task) => {
    const session = sessionById.get(task.sessionId);
    const partners = getPartners(session, expert.name);
    return `
      <article class="task-card">
        <div class="task-card__time">
          <strong>${formatDate(session.date)}</strong>
          <span>${session.startTime}-${session.endTime}</span>
        </div>
        <div class="task-card__body">
          <div class="task-card__top">
            <span class="tag">${task.role}</span>
            <span>${session.venue}</span>
          </div>
          <h4>${session.title}</h4>
          <p>${session.track} · ${session.type}</p>
          ${taskTextLine("搭档专家/主持", partners)}
          ${taskTextLine("备注", task.note)}
        </div>
      </article>
    `;
  }).join("");

  $("#taskDetail").innerHTML = `
    <header class="task-detail__head">
      <div>
        <h3>${expert.name}</h3>
        <p>${expert.organization} · ${expert.title}</p>
      </div>
      <button class="primary" id="copyTasks" type="button">复制任务清单</button>
    </header>
    <div class="task-summary">
      <span>共 ${tasks.length} 项任务</span>
      <span>已按时间顺序排列</span>
    </div>
    <div class="task-list">${taskItems || `<div class="empty-state"><strong>暂无任务</strong><p>该专家目前没有录入关联任务。</p></div>`}</div>
  `;

  $("#copyTasks").addEventListener("click", () => copyExpertTasks(expert, tasks));
}

function getPartners(session, currentName) {
  const names = [
    ...(session.chairs || []),
    ...(session.speakers || []),
    ...(session.discussants || []),
    ...(session.reviewers || []),
    ...(session.commentators || [])
  ].filter((name, index, arr) => name !== currentName && arr.indexOf(name) === index);
  return names.join("、");
}

function copyExpertTasks(expert, tasks) {
  const lines = [
    `${expert.name}｜${expert.organization}｜会议任务清单`,
    `${data.conference.name}`,
    ""
  ];
  sortedTasks(tasks).forEach((task, index) => {
    const session = sessionById.get(task.sessionId);
    lines.push(`${index + 1}. ${formatDate(session.date)} ${session.startTime}-${session.endTime}`);
    lines.push(`   会场：${session.venue}`);
    lines.push(`   任务：${task.role}｜${session.track}｜${session.title}`);
    const partners = validText(getPartners(session, expert.name));
    if (partners) lines.push(`   搭档专家/主持：${partners}`);
    if (validText(task.note)) lines.push(`   备注：${task.note}`);
  });
  const text = lines.join("\n");
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast("任务清单已复制"));
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("任务清单已复制");
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

  const venues = ["all", ...new Set(data.sessions.map((session) => session.venue))];
  $("#venueFilter").innerHTML = venues.map((venue) => `<option value="${venue}">${venue === "all" ? "全部会场" : venue}</option>`).join("");
  $("#venueFilter").value = state.venue;

  const tracks = ["all", ...new Set(data.sessions.map((session) => session.track))];
  $("#trackFilter").innerHTML = tracks.map((track) => `<option value="${track}">${track === "all" ? "全部专题" : track}</option>`).join("");
  $("#trackFilter").value = state.track;

  const types = ["all", ...new Set(data.sessions.map((session) => session.type))];
  $("#typeFilter").innerHTML = types.map((type) => `<option value="${type}">${type === "all" ? "全部类型" : type}</option>`).join("");
  $("#typeFilter").value = state.type;
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
      fieldRow("主持", session.chairs),
      fieldRow("讲者", session.speakers),
      fieldRow("讨论/点评", [...(session.discussants || []), ...(session.reviewers || []), ...(session.commentators || [])]),
      fieldRow("备注", session.note)
    ].join("");
    return `
      <article class="schedule-card">
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
    $("#globalSearch").value = state.query;
    renderExpertResults();
  });
  $("#globalSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
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
    $("#expertSearch").value = "";
    $("#globalSearch").value = "";
    renderExpertResults();
  });
  $("#searchJump").addEventListener("click", () => {
    renderExpertResults();
  });
  $("#venueFilter").addEventListener("change", (event) => {
    state.venue = event.target.value;
    renderSchedule();
  });
  $("#trackFilter").addEventListener("change", (event) => {
    state.track = event.target.value;
    renderSchedule();
  });
  $("#typeFilter").addEventListener("change", (event) => {
    state.type = event.target.value;
    renderSchedule();
  });
  bindSectionNavigation();
}

function init() {
  renderConference();
  renderFilters();
  renderSchedule();
  renderExpertResults();
  bindEvents();
}

init();
