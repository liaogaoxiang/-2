let report;
const initialQuery = new URLSearchParams(window.location.search).get("search")?.trim().toLowerCase() || "";

const state = {
  mode: "net",
  tab: "arenas",
  module: "全部模块",
  query: initialQuery,
  focusedArenaId: null,
  contributorModule: "学习顾问部"
};

const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});
const number = new Intl.NumberFormat("zh-CN");
const compact = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 1
});

const colors = ["#55e6ff", "#ff4fd8", "#ffbc4a", "#43f6a6", "#3a77ff", "#ff5b6e"];

function ratio(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function modeValue(item) {
  if (state.mode === "orders") return item.orders || item.totalOrders || 0;
  if (state.mode === "margin") return item.margin || 0;
  return item.gross || item.totalGross || 0;
}

function sideValue(side) {
  if (state.mode === "orders") return side.orders || 0;
  return side.gross || 0;
}

function formatMetric(value) {
  if (state.mode === "orders") return `${number.format(value)}单`;
  return money.format(value);
}

function formatNet(value) {
  return money.format(value || 0);
}

function teamName(name) {
  return `<span class="team-identity">${name}<span class="team-badge"><i aria-hidden="true"></i>团队</span></span>`;
}

function teamMatchNames(arena) {
  return arena.members.map((member) => teamName(member.name)).join('<span class="team-vs"> vs </span>');
}

function gloryResult(arena) {
  if (!arena.isActive) return "等待兵线激活";
  if (arena.isThreeWay) return "三方混战 · 前二暂居优势";
  return arena.defenderWon ? "蓝方占据上风" : "红方占领优势";
}

function momentumLabel(arena, member) {
  if (!arena.isActive) return "待开战";
  if (!member.isWinner) return "追击中";
  if (arena.isThreeWay) return member.gmvRank === 1 ? "暂居第一" : "前二占优";
  return member.role === "守擂方" ? "占据上风" : "占领优势";
}

function winnerNames(arena) {
  const names = (arena.winningMembers || [arena.winner]).map((member) => member.name);
  return names.length ? names.map(teamName).join(" / ") : "待拉开差距";
}

function renderContributionPanel(members) {
  const memberList = members.filter(Boolean);
  const contributors = memberList.flatMap((member) => member.contributors || []);
  const hasContributorDetail = contributors.length > 0;
  const rows = hasContributorDetail
    ? contributors.sort((a, b) => b.gross - a.gross).slice(0, 3)
    : memberList.map((member) => ({
        name: `${member.name}小组`,
        teamName: member.name,
        orders: member.orders,
        gross: member.gross,
        net: member.net
      })).slice(0, 3);
  const maxGross = Math.max(...rows.map((item) => item.gross), 1);

  return `
    <div class="contribution-panel">
      <div class="contribution-head">
        <span>出单组员贡献值</span>
        <em>${hasContributorDetail ? `${contributors.length}人出单` : "组员明细待同步"}</em>
      </div>
      <div class="contribution-list">
        ${rows.length ? rows.map((item) => `
          <div class="contribution-row">
            <div><strong>${item.teamName ? teamName(item.teamName) : item.name}</strong><small>${number.format(item.orders)}单 · GMV${formatNet(item.gross)}</small></div>
            <i><b style="--w:${Math.max(item.gross / maxGross * 100, 3)}%"></b></i>
          </div>
        `).join("") : `<span class="empty-contribution">暂无出单贡献</span>`}
      </div>
    </div>
  `;
}

function renderMeta() {
  const { month, dateRange } = report.meta;
  document.querySelector("#reportMeta").textContent =
    `6月最新战报 | 数据更新至 ${dateRange.end} | ${report.summary.arenas}场战局 | ${report.summary.threeWayArenas}场三方PK | ${report.summary.matchedMembers}/${report.summary.pkMembers}小组已出单`;
  document.querySelector("#syncTime").textContent = `SYNC ${month}`;
}

function kingCamp(name) {
  for (const arena of report.arenas || []) {
    const member = arena.members.find((item) => item.name === name);
    if (!member) continue;
    const isBlue = member.role === "守擂方";
    return {
      className: isBlue ? "blue-camp" : "red-camp",
      mark: isBlue ? "BLUE" : "RED",
      label: isBlue ? "蓝方守塔" : "红方攻塔"
    };
  }
  return { className: "blue-camp", mark: "BLUE", label: "峡谷阵营" };
}

function renderChampion() {
  const kings = report.moduleChampions || [];
  const maxGross = Math.max(...kings.map((item) => item.gross), 1);
  document.querySelector("#moduleKings").innerHTML = kings.map((king) => {
    const camp = kingCamp(king.name);
    const moduleClass = king.module.includes("顾问") ? "advisor-royal" : "planning-royal";
    return `
    <article class="module-king-card ${camp.className} ${moduleClass}">
      <span class="royal-card-art" aria-hidden="true"></span>
      <div class="module-king-copy">
        <div class="module-king-mark">${camp.mark}</div>
        <span class="module-king-module">${king.module} · ${camp.label}</span>
        <strong>${teamName(king.name)}</strong>
        <small>${number.format(king.orders)}单火力 · 成就${number.format(king.convertedUsers)}位学员 · 战力${king.battlePower.toFixed(1)}</small>
        <div class="meter"><span style="--w:${Math.max(king.gross / maxGross * 100, 4)}%"></span></div>
      </div>
    </article>
  `;
  }).join("");
}

function renderKpis() {
  const s = report.summary;
  const cards = [
    ["荣耀战局", `${number.format(s.arenas)}场`, `${number.format(s.threeWayArenas)}场三方PK`, "BATTLE"],
    ["成就用户数", `${number.format(s.convertedUsers)}位学员`, "按转化学员去重统计", "USERS"],
    ["红方优势", `${number.format(s.challengerWins)}场`, `已开战占优率${ratio(s.activeArenas ? s.challengerWins / s.activeArenas : 0)}`, "RED"],
    ["蓝方上风", `${number.format(s.defenderWins)}场`, `已开战占优率${ratio(s.activeArenas ? s.defenderWins / s.activeArenas : 0)}`, "BLUE"]
  ];

  document.querySelector("#kpiGrid").innerHTML = cards.map(([label, value, note, mark]) => `
    <article class="kpi-card">
      <div class="kpi-label"><span>${label}</span><span>${mark}</span></div>
      <p class="kpi-value">${value}</p>
      <p class="kpi-note">${note}</p>
    </article>
  `).join("");
}

function battleMapTeams() {
  const teams = new Map();
  (report.arenas || []).forEach((arena) => {
    (arena.members || []).forEach((member) => {
      if (!member.gross) return;
      const camp = member.role === "守擂方" ? "blue" : "red";
      const current = teams.get(member.name);
      if (!current || member.gross > current.gross) {
        teams.set(member.name, {
          name: member.name,
          camp,
          role: member.role,
          module: arena.module,
          arenaId: arena.id,
          gross: member.gross || 0,
          orders: member.orders || 0,
          convertedUsers: member.convertedUsers || member.orders || 0,
          isWinner: Boolean(member.isWinner)
        });
      }
    });
  });
  return [...teams.values()].sort((a, b) => b.gross - a.gross);
}

function renderBattleMap() {
  const nodes = document.querySelector("#battleMapNodes");
  const runners = document.querySelector("#battleMapRunners");
  const count = document.querySelector("#battleMapCount");
  if (!nodes || !runners) return;

  const teams = battleMapTeams();
  const maxGross = Math.max(...teams.map((team) => team.gross), 1);
  const byCampIndex = { blue: 0, red: 0 };
  const topNames = new Set(teams.slice(0, 10).map((team) => team.name));

  count.textContent = `${number.format(teams.length)}个参战小组`;
  nodes.innerHTML = teams.map((team) => {
    const progress = Math.min(team.gross / maxGross, 1);
    const index = byCampIndex[team.camp]++;
    const lane = (index * 37) % 100;
    const y = 12 + lane / 100 * 76;
    const push = progress * 39;
    const x = team.camp === "blue" ? 8 + push : 92 - push;
    const level = progress >= 0.72 ? "is-frontline" : progress >= 0.42 ? "is-midline" : "is-base";
    const title = `${team.name}团队 · GMV${formatNet(team.gross)} · ${number.format(team.orders)}单 · ${team.module} · ${team.arenaId}`;
    return `
      <span
        class="battle-map-node ${team.camp}-node ${level} ${team.isWinner ? "is-advantage" : ""} ${topNames.has(team.name) ? "is-top" : ""}"
        style="--x:${x.toFixed(2)}%; --y:${y.toFixed(2)}%; --power:${Math.max(progress * 100, 8).toFixed(2)}%"
        title="${title}"
      >
        <i></i><b>${team.name}</b>
      </span>
    `;
  }).join("");

  const runnerGroups = ["学习顾问部", "学习规划部"].map((moduleName) => ({
    moduleName,
    teams: teams.filter((team) => team.module === moduleName).slice(0, 10)
  }));
  runners.innerHTML = runnerGroups.map((group) => `
    <div class="battle-map-runner-group">
      <h3>${group.moduleName}前十团队</h3>
      <div>
        ${group.teams.map((team, index) => `
          <span class="${team.camp}-runner">
            <em>${String(index + 1).padStart(2, "0")}</em>
            <strong>${team.name}</strong>
            <small>${formatNet(team.gross)}</small>
          </span>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function featuredArena() {
  const focused = report.arenas.find((arena) => arena.id === state.focusedArenaId);
  if (focused) return focused;
  const list = [...report.topArenas];
  if (state.mode === "orders") return list.sort((a, b) => b.totalOrders - a.totalOrders)[0];
  if (state.mode === "margin") return [...report.arenas].sort((a, b) => b.margin - a.margin)[0];
  return list[0];
}

function arenaOptionLabel(arena) {
  const names = arena.members.map((member) => member.name).join(" vs ");
  return `${arena.id} · ${arena.module} · ${arena.groupNo}号战场 · ${names}`;
}

function setupArenaPicker() {
  const picker = document.querySelector("#arenaQuickSelect");
  if (!picker) return;
  const arenas = [...report.arenas].sort((a, b) => a.sourceRow - b.sourceRow);
  picker.innerHTML = arenas.map((arena) => `
    <option value="${arena.id}">${arenaOptionLabel(arena)}</option>
  `).join("");
  picker.addEventListener("change", () => {
    state.focusedArenaId = picker.value;
    renderFeaturedArena();
    renderArenaCards();
  });
}

function syncArenaPicker(arena) {
  const picker = document.querySelector("#arenaQuickSelect");
  if (picker && arena) picker.value = arena.id;
}

function renderFeaturedArena() {
  const arena = featuredArena();
  if (!arena) return;
  syncArenaPicker(arena);
  const maxGross = Math.max(...arena.members.map((member) => member.gross), 1);

  document.querySelector("#featuredArena").innerHTML = `
    <div class="ring-summary">
      <div class="ring-stat"><strong>${arena.id}</strong><span class="arena-meta">${arena.module}</span></div>
      <div class="ring-stat"><strong>${gloryResult(arena)}</strong><span class="arena-meta">当前占优 ${winnerNames(arena)}</span></div>
      <div class="ring-stat"><strong>${formatNet(arena.margin)}</strong><span class="arena-meta">${arena.isThreeWay ? "前二线GMV差" : "双方GMV差距"}</span></div>
    </div>
    <div class="versus-row ${arena.isThreeWay ? "is-three-way" : ""}">
      ${arena.members.map((member) => `
        <div class="fighter-card ${member.isWinner ? "is-winner" : ""}">
          <div class="fighter-role"><span>${arena.isThreeWay ? `阵营 ${String(member.slot).padStart(2, "0")}` : (member.role === "守擂方" ? "蓝方守塔战队" : "红方攻塔战队")}</span><span>${momentumLabel(arena, member)}</span></div>
          <strong class="fighter-name">${teamName(member.name)}</strong>
          <div class="fighter-score">${formatNet(member.gross)}</div>
          <div class="fighter-meta">${member.n2Manager} 大组 · 战力${member.battlePower.toFixed(1)} · 成就${number.format(member.convertedUsers || member.orders)}位学员 · ${number.format(member.orders)}单</div>
          <div class="meter"><span style="--w:${Math.max(member.gross / maxGross * 100, 2)}%"></span></div>
        </div>
      `).join("")}
    </div>
  `;
}

const rewardTiers = [
  {
    className: "bronze-loot",
    title: "破阵宝箱",
    threshold: 60000,
    reward: 50,
    mark: "6万+",
    note: "团队GMV突破6万，PK获胜小组每人50元京东卡",
    sprintMin: 36000
  },
  {
    className: "gold-loot",
    title: "荣耀宝箱",
    threshold: 80000,
    reward: 100,
    mark: "8万+",
    note: "团队GMV突破8万，PK获胜小组每人100元京东卡",
    sprintMin: 60000
  },
  {
    className: "crown-loot",
    title: "王者宝箱",
    threshold: 150000,
    reward: 300,
    mark: "15万+",
    note: "团队GMV突破15万，PK获胜小组每人300元京东卡",
    sprintMin: 80000
  }
];

function winningTeamRows() {
  const teams = new Map();
  (report.arenas || []).forEach((arena) => {
    if (!arena.isActive) return;
    (arena.members || []).forEach((member) => {
      if (!member.isWinner) return;
      const current = teams.get(member.name);
      if (!current || member.gross > current.gross) {
        teams.set(member.name, {
          name: member.name,
          gross: member.gross || 0,
          module: arena.module,
          arenaId: arena.id
        });
      }
    });
  });
  return [...teams.values()];
}

function tierSprintTeams(tier, teams) {
  return teams
    .filter((team) => team.gross >= tier.sprintMin && team.gross < tier.threshold)
    .sort((a, b) => b.gross - a.gross);
}

function renderRewardTiers() {
  const container = document.querySelector("#rewardTiers");
  if (!container) return;
  const winners = winningTeamRows();
  container.innerHTML = rewardTiers.map((tier) => {
    const sprintTeams = tierSprintTeams(tier, winners);
    const closest = sprintTeams[0];
    const gap = closest ? tier.threshold - closest.gross : 0;
    return `
      <article class="reward-tier-card ${tier.className}">
        <div class="reward-tier-aura" aria-hidden="true"></div>
        <div class="reward-tier-main">
          <span class="reward-tier-title">${tier.title}</span>
          <span class="reward-condition">${tier.mark} · PK获胜解锁</span>
        </div>
        <div class="reward-prize">
          <span>京东卡</span>
          <b>${number.format(tier.reward)}元</b>
          <em>/ 人</em>
        </div>
        <p class="reward-rule">${tier.note}</p>
        <div class="reward-sprint">
          <span>冲刺中</span>
          <strong>${number.format(sprintTeams.length)}组</strong>
          <small>${closest ? `${teamName(closest.name)} 距离本档还差${formatNet(gap)}` : "暂无胜方小组进入冲刺区间"}</small>
        </div>
      </article>
    `;
  }).join("");
}

function renderPlayerRankList() {
  const rows = (report.contributorRank || [])
    .filter((item) => item.module === state.contributorModule)
    .slice(0, 12);
  const max = Math.max(...rows.map((item) => item.gross), 1);
  document.querySelector("#playerRankList").innerHTML = rows.length ? rows.map((item, index) => `
    <div class="rank-row">
      <span class="rank-index">${String(index + 1).padStart(2, "0")}</span>
      <div>
        <strong class="rank-name">${item.name}</strong>
        <div class="rank-meta">${item.group}团队 · ${number.format(item.orders)}单 · 成就${number.format(item.orders)}位学员 · GMV${formatNet(item.gross)}</div>
      </div>
      <strong class="rank-value">${index === 0 ? "TOP" : formatNet(item.gross)}</strong>
      <div class="meter rank-meter"><span style="--w:${Math.max(item.gross / max * 100, 2)}%"></span></div>
    </div>
  `).join("") : `<div class="rank-row empty-row"><div><strong class="rank-name">暂无个人业绩</strong><div class="rank-meta">${state.contributorModule}当前暂无可展示数据</div></div></div>`;
}

function renderBattleSplit() {
  const s = report.summary;
  const defenseRatio = s.activeArenas ? s.defenderWins / s.activeArenas : 0;
  document.querySelector("#battleSplit").innerHTML = `
    <div class="split-orb" style="--defense:${defenseRatio * 100}%"><span>${ratio(defenseRatio)}</span></div>
    <div class="split-copy">
      <div class="split-row"><strong>蓝方占据上风</strong><span>${number.format(s.defenderWins)}场</span></div>
      <div class="split-row"><strong>红方占领优势</strong><span>${number.format(s.challengerWins)}场</span></div>
      <div class="split-row"><strong>待激活小组</strong><span>${number.format(s.missingMembers)}个</span></div>
    </div>
  `;

  const max = Math.max(...report.moduleRank.map((item) => item.gross), 1);
  document.querySelector("#moduleStatus").innerHTML = report.moduleRank.map((item) => `
    <div class="module-row">
      <div class="module-line"><strong>${item.name}</strong><span class="bar-meta">GMV ${formatNet(item.gross)}</span></div>
      <div class="bar-meta">${item.arenas}场 · 蓝方上风${item.defenderWins} · 红方优势${item.challengerWins}</div>
      <div class="meter"><span style="--w:${Math.max(item.gross / max * 100, 2)}%"></span></div>
    </div>
  `).join("");
}

function currentRows() {
  if (state.tab === "members") return report.memberRank;
  if (state.tab === "modules") return report.moduleRank;
  if (state.tab === "commanders") return report.commanderRank;
  return report.topArenas;
}

function rowName(item) {
  if (state.tab === "arenas") return `${item.id} ${teamMatchNames(item)}`;
  if (state.tab === "members") return teamName(item.name);
  return item.name;
}

function rowMeta(item) {
  if (state.tab === "arenas") {
    return `${gloryResult(item)} · 当前占优 ${winnerNames(item)} · ${item.totalOrders}单`;
  }
  if (state.tab === "modules") {
    return `${item.arenas}场 · 蓝方上风${item.defenderWins} · 红方优势${item.challengerWins}`;
  }
  if (state.tab === "commanders") {
    return `${item.arenas}场 · ${number.format(item.orders)}单`;
  }
  return `${number.format(item.orders)}单 · GMV${formatNet(item.gross)} · 退款率${ratio(item.refundRate)}`;
}

function renderRanks() {
  const titleMap = {
    arenas: "荣耀战局GMV榜",
    members: "团队战力榜",
    modules: "阵营火力榜",
    commanders: "大组战队榜"
  };
  const rows = currentRows();
  const max = Math.max(...rows.map(modeValue), 1);
  document.querySelector("#rankTitle").textContent = titleMap[state.tab];
  document.querySelector("#rankScope").textContent = state.tab === "members" ? "Top 30" : "Top 10";
  document.querySelector("#rankList").innerHTML = rows.map((item, index) => {
    const value = modeValue(item);
    return `
      <div class="rank-row">
        <span class="rank-index">${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong class="rank-name">${rowName(item)}</strong>
          <div class="rank-meta">${rowMeta(item)}</div>
        </div>
        <strong class="rank-value">${formatMetric(value)}</strong>
        <div class="meter rank-meter"><span style="--w:${Math.max(value / max * 100, 2)}%"></span></div>
      </div>
    `;
  }).join("");
}

function renderDailyChart() {
  const data = report.daily;
  const values = data.map((item) => item.net);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const width = 760;
  const height = 250;
  const pad = { top: 18, right: 18, bottom: 32, left: 54 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const span = max - min || 1;
  const points = data.map((item, index) => {
    const x = pad.left + (index / (data.length - 1 || 1)) * innerW;
    const y = pad.top + innerH - ((item.net - min) / span) * innerH;
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `${path} L ${points.at(-1).x.toFixed(2)} ${pad.top + innerH} L ${points[0].x.toFixed(2)} ${pad.top + innerH} Z`;
  const peak = points.reduce((best, item) => item.net > best.net ? item : best, points[0]);

  document.querySelector("#trendPeak").textContent = `${peak.date.slice(5)} 峰值 ${compact.format(peak.net)}`;
  document.querySelector("#dailyChart").innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fireArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#55e6ff" stop-opacity="0.34" />
          <stop offset="100%" stop-color="#ff4fd8" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <line x1="${pad.left}" y1="${pad.top + innerH}" x2="${width - pad.right}" y2="${pad.top + innerH}" stroke="rgba(102,224,255,.22)" />
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + innerH}" stroke="rgba(102,224,255,.22)" />
      <path d="${area}" fill="url(#fireArea)" />
      <path d="${path}" fill="none" stroke="#55e6ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      ${points.map((point, index) => index % 5 === 0 || index === points.length - 1 ? `<text class="axis-label" x="${point.x}" y="${height - 10}" text-anchor="middle">${point.date.slice(8)}</text>` : "").join("")}
      <text class="axis-label" x="2" y="${pad.top + 8}">${compact.format(max)}</text>
      <text class="axis-label" x="2" y="${pad.top + innerH}">${compact.format(min)}</text>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="${point.date === peak.date ? 6 : 3.5}" fill="${point.date === peak.date ? "#ffbc4a" : "#55e6ff"}" />`).join("")}
    </svg>
  `;
}

function renderSubjects() {
  const max = Math.max(...report.subjects.map((item) => item.gross), 1);
  document.querySelector("#subjectBars").innerHTML = report.subjects.map((item, index) => `
    <div class="bar-item">
      <div class="bar-line"><strong>${item.name}</strong><span class="bar-meta">${formatNet(item.gross)}</span></div>
      <div class="bar-track"><span style="--w:${Math.max(item.gross / max * 100, 2)}%; --bar-color:${colors[index % colors.length]}"></span></div>
      <div class="bar-meta">${number.format(item.orders)}单 · 占全场${ratio(item.gross / report.summary.gross)}</div>
    </div>
  `).join("");
}

function renderActivityChannels() {
  const channels = (report.activityChannels || []).filter((item) => item.orders || item.gross);
  const totalUsers = Math.max(report.summary.convertedUsers || report.summary.orders || 0, 1);
  const totalGross = Math.max(report.summary.gross || 0, 1);
  const maxUsers = Math.max(...channels.map((item) => item.orders), 1);
  document.querySelector("#activityChannels").innerHTML = channels.map((item, index) => {
    const userShare = item.orders / totalUsers;
    const grossShare = item.gross / totalGross;
    return `
      <article class="activity-channel-row ${index < 3 ? "is-major" : ""}">
        <div class="activity-channel-main">
          <span class="activity-id">${item.id}</span>
          <strong>${item.name}</strong>
        </div>
        <div class="activity-channel-metrics">
          <span><b>${ratio(userShare)}</b><small>成就学员占比</small></span>
          <span><b>${ratio(grossShare)}</b><small>GMV占比</small></span>
          <em>${number.format(item.orders)}位学员</em>
        </div>
        <div class="activity-channel-track" aria-hidden="true">
          <i style="--w:${Math.max(item.orders / maxUsers * 100, 3)}%"></i>
        </div>
      </article>
    `;
  }).join("");
}

function setupFilters() {
  const select = document.querySelector("#moduleFilter");
  const search = document.querySelector("#searchInput");
  const modules = ["全部模块", ...report.moduleRank.map((item) => item.name)];
  select.innerHTML = modules.map((item) => `<option value="${item}">${item}</option>`).join("");
  select.addEventListener("change", () => {
    state.module = select.value;
    renderArenaCards();
  });
  search.value = state.query;
  search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderArenaCards();
  });
}

function sideScoreLabel(member) {
  return state.mode === "orders" ? `${number.format(member.orders)}单` : formatNet(member.gross);
}

function renderThreeWayArenaCard(arena) {
  const maxGross = Math.max(...arena.members.map((member) => member.gross), 1);
  return `
    <button type="button" class="duel-card tri-duel-card ${arena.id === state.focusedArenaId ? "is-selected" : ""}" data-arena-id="${arena.id}">
      <div class="duel-head">
        <span class="arena-name">${arena.id} · 荣耀峡谷 ${arena.groupNo}号战场 · 三方混战</span>
        <span class="result-tag tri-result">${arena.isActive ? "前二暂居优势" : "等待兵线激活"}</span>
      </div>
      <div class="tri-duel-row">
        ${arena.members.map((member) => `
          <div class="tri-side slot-${member.slot} ${member.isWinner ? "is-winner" : ""}">
            <div class="tri-side-head">
              <span>阵营 ${String(member.slot).padStart(2, "0")} · ${member.role}</span>
              <b>${momentumLabel(arena, member)}</b>
            </div>
            <strong>${teamName(member.name)}</strong>
            <small>GMV ${formatNet(member.gross)} · ${number.format(member.orders)}单火力</small>
            <div class="tri-rank-line">
              <span>${arena.isActive ? `#${member.gmvRank}` : "待定"}</span>
              <i><b style="--w:${Math.max(member.gross / maxGross * 100, 3)}%"></b></i>
            </div>
            ${renderContributionPanel([member])}
          </div>
        `).join("")}
      </div>
      <div class="tri-route">
        <span>三方兵线交汇</span>
        <i></i><b>◆</b><i></i>
        <span>${arena.isActive ? `前二线 ${formatNet(arena.cutoffGross)} · 第2/3名差 ${formatNet(arena.margin)}` : "尚未产生GMV，优势方待拉开"}</span>
      </div>
    </button>
  `;
}

function renderArenaCards() {
  const query = state.query;
  const rows = report.arenas
    .filter((arena) => state.module === "全部模块" || arena.module === state.module)
    .filter((arena) => {
      if (!query) return true;
      return `${arena.matchName} ${arena.id} ${arena.winner.name} ${arena.members.map((member) => member.name).join(" ")}`.toLowerCase().includes(query);
    })
    .sort((a, b) => modeValue(b) - modeValue(a));

  document.querySelector("#arenaCards").innerHTML = rows.map((arena) => {
    if (arena.isThreeWay) return renderThreeWayArenaCard(arena);

    const defender = arena.defender;
    const challenger = arena.challengerSide;
    const defenseValue = sideValue(defender);
    const attackValue = sideValue(challenger);
    const totalValue = defenseValue + attackValue || 1;
    const defenseWidth = Math.max(defenseValue / totalValue * 100, defenseValue ? 8 : 2);
    const attackWidth = Math.max(attackValue / totalValue * 100, attackValue ? 8 : 2);
    const attackMembers = arena.members.filter((member) => member.name !== defender.name);
    return `
      <button type="button" class="duel-card ${arena.id === state.focusedArenaId ? "is-selected" : ""}" data-arena-id="${arena.id}">
        <div class="duel-head">
          <span class="arena-name">${arena.id} · 荣耀峡谷 ${arena.groupNo}号战场</span>
          <span class="result-tag ${arena.isActive && !arena.defenderWon ? "attack" : ""}">${gloryResult(arena)}</span>
        </div>
        <div class="duel-row">
          <div class="duel-side defense ${arena.isActive && arena.defenderWon ? "is-winner" : ""}">
            <span class="duel-label"><i class="side-emblem">◇</i> 蓝方守塔 · ${defender.n2Manager} 大组</span>
            <strong>${teamName(defender.name)}</strong>
            <small>GMV${formatNet(defender.gross)} · ${number.format(defender.orders)}单火力</small>
            ${renderContributionPanel([defender])}
          </div>
          <div class="duel-versus">
            <div class="duel-score">
              <span>${sideScoreLabel(defender)}</span>
              <b>VS</b>
              <span>${sideScoreLabel(challenger)}</span>
            </div>
            <div class="tower-line" aria-hidden="true">
              <i class="blue-tower"></i><span class="blue-minion"></span><i class="blue-tower"></i><b>◆</b><i class="red-tower"></i><span class="red-minion"></span><i class="red-tower"></i>
            </div>
            <div class="versus-meter" style="--def:${defenseWidth}%; --atk:${attackWidth}%">
              <span class="defense-bar"></span>
              <span class="attack-bar"></span>
            </div>
            <div class="duel-subline">${arena.module} · GMV差${formatNet(arena.margin)}</div>
          </div>
          <div class="duel-side attack ${arena.isActive && !arena.defenderWon ? "is-winner" : ""}">
            <span class="duel-label"><i class="side-emblem">◇</i> 红方攻塔 · ${challenger.n2Manager} 大组</span>
            <strong>${teamName(challenger.name)}</strong>
            <small>GMV${formatNet(challenger.gross)} · ${number.format(challenger.orders)}单火力</small>
            ${renderContributionPanel(attackMembers)}
          </div>
        </div>
        <div class="arena-members">
          <span class="lineup-label">红方攻塔战队</span>
          ${attackMembers.map((member) => `<span class="member-pill ${member.isWinner ? "win" : ""}">${teamName(member.name)} · 战力${member.battlePower.toFixed(1)}</span>`).join("")}
        </div>
      </button>
    `;
  }).join("");

  document.querySelectorAll("[data-arena-id]").forEach((card) => {
    card.addEventListener("click", () => {
      state.focusedArenaId = card.dataset.arenaId;
      renderFeaturedArena();
      renderArenaCards();
      document.querySelector(".opening-duel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setupInteractions() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
      state.focusedArenaId = null;
      renderFeaturedArena();
      renderRanks();
      renderArenaCards();
    });
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderRanks();
    });
  });

  document.querySelectorAll("[data-contributor-module]").forEach((button) => {
    button.addEventListener("click", () => {
      state.contributorModule = button.dataset.contributorModule;
      document.querySelectorAll("[data-contributor-module]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderPlayerRankList();
    });
  });
}

function drawArenaCanvas() {
  const canvas = document.querySelector("#arenaCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resize() {
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * scale);
    canvas.height = Math.floor(window.innerHeight * scale);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    draw();
  }

  function draw() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h * 0.38);
    ctx.rotate(-0.09);
    for (let i = 0; i < 8; i += 1) {
      const radius = 90 + i * 38;
      ctx.strokeStyle = `rgba(85, 230, 255, ${0.18 - i * 0.014})`;
      ctx.lineWidth = i % 2 ? 1 : 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.72, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < 18; i += 1) {
      const x = (i * 97) % (w + 160) - 80;
      const y = 80 + (i % 9) * 72;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(255,79,216,.18)" : "rgba(85,230,255,.15)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 48, y - 22);
      ctx.stroke();
    }
  }

  window.addEventListener("resize", resize);
  resize();
}

function renderAll() {
  renderMeta();
  renderChampion();
  renderKpis();
  renderBattleMap();
  renderPlayerRankList();
  setupArenaPicker();
  renderFeaturedArena();
  renderRewardTiers();
  renderBattleSplit();
  renderRanks();
  renderDailyChart();
  renderSubjects();
  renderActivityChannels();
  setupFilters();
  renderArenaCards();
}

async function boot() {
  report = window.PK_ARENA_DATA || await window.PK_ARENA_DATA_READY;
  state.focusedArenaId = report.topArenas[0]?.id;
  setupInteractions();
  renderAll();
  drawArenaCanvas();
}

boot().catch((error) => {
  console.error("Unable to load arena report", error);
  const dataNotes = document.querySelector("#dataNotes");
  if (dataNotes) dataNotes.textContent = "战报数据加载失败，请刷新页面重试。";
});
