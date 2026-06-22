const management = window.PK_MANAGEMENT_DATA;

const number = new Intl.NumberFormat("zh-CN");
const money = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });

const roleConfig = {
  n2: {
    label: "大组长",
    rows: "n2Rows",
    min: 3,
    tone: "blue"
  },
  manager: {
    label: "经理",
    rows: "managerRows",
    min: 8,
    tone: "gold"
  }
};

const boardConfig = [
  { module: "学习顾问部", role: "manager", title: "顾问部 · 经理看板", code: "ADVISOR MANAGER" },
  { module: "学习顾问部", role: "n2", title: "顾问部 · 大组长看板", code: "ADVISOR N2" },
  { module: "学习规划部", role: "manager", title: "规划部 · 经理看板", code: "PLANNING MANAGER" },
  { module: "学习规划部", role: "n2", title: "规划部 · 大组长看板", code: "PLANNING N2" }
];

function formatGmv(value) {
  return `${money.format((value || 0) / 10000)}万`;
}

function ratio(value) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}

function rewardText(tier) {
  return `${tier.prizes.join(" / ")}（任选其一）`;
}

function tierByThreshold(role, threshold) {
  return management.ladders[role].find((tier) => tier.threshold === threshold);
}

function progressToNext(row) {
  const target = row.status.next || row.status.reached || 1;
  const base = Math.max(target, 1);
  return Math.min((row.achievedGroups / base) * 100, 100);
}

function rewardForThreshold(role, threshold) {
  if (!threshold) return "";
  const tier = tierByThreshold(role, threshold);
  if (!tier) return "";
  return rewardText(tier);
}

function boardRows(board) {
  const config = roleConfig[board.role];
  return [...management[config.rows]]
    .filter((row) => row.module === board.module)
    .sort((a, b) => {
      const aUnlocked = a.status.reached > 0 ? 1 : 0;
      const bUnlocked = b.status.reached > 0 ? 1 : 0;
      return bUnlocked - aUnlocked
        || b.achievedGroups - a.achievedGroups
        || a.status.gap - b.status.gap
        || b.achievementRate - a.achievementRate
        || b.averageGmv - a.averageGmv;
    });
}

function compactTeams(teams) {
  if (!teams.length) return "暂无";
  const names = teams.slice(0, 4).map((team) => team.name).join("、");
  return teams.length > 4 ? `${names} 等${teams.length}组` : names;
}

function renderMeta() {
  const range = management.meta.reportDateRange;
  const title = document.querySelector("#managementTitle");
  if (title) {
    title.innerHTML = `${management.meta.moduleRoleTitle || management.meta.moduleTitle || "管理层"}荣耀<span>补给战报</span>`;
  }
  document.querySelector("#managementMeta").textContent =
    `${range.start} 至 ${range.end} | ${management.meta.rule} | 架构口径 ${management.meta.architectureFile}`;
  document.querySelector("#managementSync").textContent = `SYNC ${management.meta.generatedAt.slice(5, 16)}`;
}

function renderKpis() {
  const s = management.summary;
  const role = management.meta.role;
  const roleLabel = role ? roleConfig[role].label : "";
  const cards = role ? [
    ["达标小组", `${number.format(s.achievedTeams)}组`, `全场 ${number.format(s.teams)} 组 · GMV≥6万`, "TARGET"],
    [`${roleLabel}已解锁`, `${number.format(role === "manager" ? s.managerUnlocked : s.n2Unlocked)}位`, `按${management.ladders[role].map((tier) => tier.threshold).join("/") }组阶梯领取，礼品任选其一`, "REWARD"],
    ["冲刺小组", `${number.format(s.sprintTeams)}组`, `GMV已达${formatGmv(management.meta.sprintGmv)}以上`, "RUSH"],
    ["管辖GMV", formatGmv(s.totalGmv), "仅展示当前隔离看板数据", "GMV"]
  ] : [
    ["达标小组", `${number.format(s.achievedTeams)}组`, `全场 ${number.format(s.teams)} 组 · GMV≥6万`, "TARGET"],
    ["大组长已解锁", `${number.format(s.n2Unlocked)}位`, "按3/6/9/12组阶梯领取，礼品任选其一", "N2"],
    ["经理已解锁", `${number.format(s.managerUnlocked)}位`, "按8/12/16/20/22组阶梯领取，礼品任选其一", "MGR"],
    ["冲刺小组", `${number.format(s.sprintTeams)}组`, `GMV已达${formatGmv(management.meta.sprintGmv)}以上`, "RUSH"]
  ];
  document.querySelector("#managementKpis").innerHTML = cards.map(([label, value, note, mark]) => `
    <article class="kpi-card management-kpi">
      <div class="kpi-label"><span>${label}</span><span>${mark}</span></div>
      <p class="kpi-value">${value}</p>
      <p class="kpi-note">${note}</p>
    </article>
  `).join("");
}

function renderBoardLadder(role, rows) {
  const maxUnlocked = Math.max(...rows.map((row) => row.status.reached), 0);
  return management.ladders[role].map((tier) => {
    const unlockedCount = rows.filter((row) => row.status.reached >= tier.threshold).length;
    return `
      <article class="board-tier ${unlockedCount ? "is-lit" : ""} ${maxUnlocked === tier.threshold ? "is-peak" : ""}">
        <div>
          <strong>${tier.title}</strong>
          <span>${unlockedCount ? `${unlockedCount}位` : "待冲刺"}</span>
        </div>
        <p>${rewardText(tier)}</p>
      </article>
    `;
  }).join("");
}

function renderPersonRow(role, row, index) {
  const config = roleConfig[role];
  const unlocked = row.status.reached > 0;
  const gapText = row.status.isMax ? "已达满档" : `距${row.status.nextTitle}差${row.status.gap}组`;
  const progress = progressToNext(row);
  const rewardThreshold = row.status.rewardThreshold || row.status.reached;
  const currentReward = rewardThreshold ? rewardForThreshold(role, rewardThreshold) : "暂未解锁当前档";
  const currentRewardLabel = row.status.upgraded ? `当前档奖励（${row.status.upgradedTitle}）:` : "当前档奖励:";
  const nextReward = row.status.next ? rewardForThreshold(role, row.status.next) : "已达满档，保持火力";
  return `
    <article class="board-person ${unlocked ? "is-unlocked" : "is-chasing"}">
      <div class="person-rank">${String(index + 1).padStart(2, "0")}</div>
      <div class="person-body">
        <div class="person-head">
          <div>
            <strong>${row.name}</strong>
            <span>${config.label} · ${row.achievedGroups}/${row.totalGroups}组达标</span>
          </div>
          <b>${row.status.upgraded ? row.status.upgradedTitle : row.status.reachedTitle}</b>
        </div>
        <div class="person-stats">
          <span><strong>${ratio(row.achievementRate)}</strong><small>达标率</small></span>
          <span><strong>${formatGmv(row.averageGmv)}</strong><small>小组均值</small></span>
          <span><strong>${gapText}</strong><small>下一档</small></span>
        </div>
        <div class="person-meter" aria-label="距离下一档进度">
          <i style="--w:${progress}%"></i>
        </div>
        <div class="person-reward">
          <span>奖励详情</span>
          <p><b>${currentRewardLabel}</b>${currentReward}</p>
          <p><b>下一档奖励:</b>${nextReward}</p>
        </div>
        <p class="person-teams">已达标: ${compactTeams(row.achievedTeams)} · 冲刺中: ${compactTeams(row.sprintTeams)}</p>
      </div>
    </article>
  `;
}

function renderBoards() {
  const module = management.meta.module;
  const role = management.meta.role;
  let boards = module && module !== "全部"
    ? boardConfig.filter((board) => board.module === module)
    : boardConfig;
  if (role) {
    boards = boards.filter((board) => board.role === role);
  }
  document.querySelector("#managementBoards").classList.toggle("is-single-board", boards.length === 1);
  document.querySelector("#managementBoards").innerHTML = boards.map((board) => {
    const rows = boardRows(board);
    const config = roleConfig[board.role];
    const achieved = rows.reduce((sum, row) => sum + row.achievedGroups, 0);
    const total = rows.reduce((sum, row) => sum + row.totalGroups, 0);
    const unlocked = rows.filter((row) => row.status.reached > 0).length;
    const totalGmv = rows.reduce((sum, row) => sum + row.totalGmv, 0);
    return `
      <article class="panel management-board is-${config.tone}">
        <div class="board-topline">
          <div>
            <p class="panel-kicker">${board.code}</p>
            <h2>${board.title}</h2>
          </div>
          <span class="board-badge">首档 ${config.min}组</span>
        </div>

        <div class="board-overview">
          <span><strong>${unlocked}</strong><small>位已解锁</small></span>
          <span><strong>${achieved}/${total}</strong><small>达标小组</small></span>
          <span><strong>${formatGmv(totalGmv)}</strong><small>管辖GMV</small></span>
        </div>

        <div class="board-ladder" aria-label="${board.title}奖励阶梯">
          ${renderBoardLadder(board.role, rows)}
        </div>

        <div class="board-person-list" aria-label="${board.title}人员进度">
          ${rows.length ? rows.map((row, index) => renderPersonRow(board.role, row, index)).join("") : `<p class="empty-state">暂无架构匹配数据。</p>`}
        </div>
      </article>
    `;
  }).join("");
}

function renderMissingNotice() {
  const target = document.querySelector("#missingNotice");
  if (!target) return;
  const missing = management.missingTeams || [];
  target.innerHTML = missing.length
    ? `架构映射待补齐: ${missing.map((team) => team.name).join("、")}`
    : "架构映射已全部匹配。";
}

if (management) {
  renderMeta();
  renderKpis();
  renderBoards();
  renderMissingNotice();
}
