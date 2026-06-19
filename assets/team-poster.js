const PAGE_CONFIG = {
  module: document.body.dataset.module || "学习顾问部",
  teamLabel: document.body.dataset.teamLabel || "顾问",
  teamEn: document.body.dataset.teamEn || "ADVISOR TEAM"
};

const LOOT_LEVELS = [
  { threshold: 150000, label: "15万", className: "loot-legendary" },
  { threshold: 80000, label: "8万", className: "loot-elite" },
  { threshold: 60000, label: "6万", className: "loot-ready" }
];

const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});

const number = new Intl.NumberFormat("zh-CN");

function formatMoney(value) {
  return money.format(value || 0).replace("CN¥", "¥");
}

function compactMoney(value) {
  if (!value) return "¥0";
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 1 : 2)}万`;
  return formatMoney(value);
}

function formatDate(dateText) {
  if (!dateText) return "最新数据";
  const [year, month, day] = dateText.split("-");
  return `${year}.${month}.${day} 数据`;
}

function memberStatus(member, arena) {
  if (!arena.isActive) return "待战";
  if (member.isWinner) return arena.isThreeWay ? "前二" : "领先";
  return member.gross ? "追赶" : "待出单";
}

function normalizeMembers(arena) {
  const members = [...(arena.members || [])].sort((a, b) => a.slot - b.slot);
  if (arena.isThreeWay) return members.slice(0, 3);
  return members.slice(0, 2);
}

function renderBattle(arena) {
  const members = normalizeMembers(arena);
  const slots = arena.isThreeWay ? 3 : 2;
  const rows = members.map((member) => {
    const rankClass = member.gmvRank === 1 ? "is-first" : "";
    const leadingClass = member.isWinner ? "is-leading" : "";
    return `
    <div class="fighter ${leadingClass} ${rankClass}">
      <div class="fighter-line">
        <span class="fighter-name">${member.name}</span>
        <span class="fighter-money">${compactMoney(member.gross)}</span>
        <span class="fighter-tag">${memberStatus(member, arena)}</span>
      </div>
    </div>
  `;
  }).join("");
  const placeholders = Array.from({ length: Math.max(slots - members.length, 0) }, () => `
    <div class="fighter is-empty">
      <div class="fighter-line"><span class="fighter-name">待匹配</span><span class="fighter-money">¥0</span><span class="fighter-tag">待战</span></div>
    </div>
  `).join("");

  return `
    <article class="battle-card">
      <div class="battle-code"><strong>${arena.groupNo}</strong><small>号</small></div>
      <div class="fighters" style="--slots:${slots}">
        ${rows}${placeholders}
      </div>
    </article>
  `;
}

function renderLootBoard(members) {
  return [...LOOT_LEVELS].reverse().map((level) => {
    const achieved = members.filter((member) => (member.gross || 0) >= level.threshold).length;
    return `
      <div class="loot-level ${level.className}">
        <strong>${level.label}</strong>
        <span>${number.format(achieved)}组达成</span>
      </div>
    `;
  }).join("");
}

function renderPoster(report) {
  const arenas = (report.arenas || []).filter((arena) => arena.module === PAGE_CONFIG.module);
  const activeArenas = arenas.filter((arena) => arena.isActive);
  const members = arenas.flatMap((arena) => arena.members || []);
  const activeMembers = members.filter((member) => member.gross > 0);
  const totalGross = members.reduce((sum, member) => sum + (member.gross || 0), 0);
  const totalOrders = members.reduce((sum, member) => sum + (member.orders || 0), 0);
  const leadingMembers = members.filter((member) => member.isWinner).length;
  const topMember = [...members].sort((a, b) => (b.gross || 0) - (a.gross || 0))[0];
  const threeWayCount = arenas.filter((arena) => arena.isThreeWay).length;

  document.querySelector("#seasonMark").textContent = `JUNE PK ARENA / ${PAGE_CONFIG.teamEn}`;
  document.querySelector("#teamTitle").textContent = PAGE_CONFIG.module;
  document.querySelector("#teamBadge").textContent = `${PAGE_CONFIG.teamLabel}专属`;
  document.querySelector("#posterDate").textContent = formatDate(report.meta?.dateRange?.end);
  document.querySelector("#totalGross").textContent = compactMoney(totalGross);
  document.querySelector("#totalSubline").textContent =
    `${number.format(arenas.length)}场战局 · ${number.format(totalOrders)}单`;
  document.querySelector("#mvpName").textContent = topMember?.name || "--";
  document.querySelector("#mvpDetail").textContent = topMember
    ? `${formatMoney(topMember.gross)} · ${number.format(topMember.orders || 0)}单 · ${PAGE_CONFIG.teamLabel}部最高火力`
    : "暂无出单数据";
  document.querySelector("#lootBoard").innerHTML = renderLootBoard(members);

  document.querySelector("#miniKpis").innerHTML = [
    ["开战战局", `${number.format(activeArenas.length)} / ${number.format(arenas.length)}`, "已有金额的PK局"],
    ["出单小组长", `${number.format(activeMembers.length)}位`, `参与${PAGE_CONFIG.teamLabel}小组`],
    ["领先席位", `${number.format(leadingMembers)}席`, `含${number.format(threeWayCount)}场三人PK前二`]
  ].map(([label, value, note]) => `
    <article class="kpi">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `).join("");

  document.querySelector("#battleGrid").innerHTML = arenas.map(renderBattle).join("");
  document.querySelector("#wallMeta").textContent =
    `${number.format(arenas.length)}场${PAGE_CONFIG.teamLabel}部战局，左侧数字为PK底表X号战场编码`;
  document.querySelector("#posterNote").textContent =
    `生成于 ${report.meta?.generatedAt ? new Date(report.meta.generatedAt).toLocaleString("zh-CN", { hour12: false }) : "当前战报"}`;
}

window.PK_ARENA_DATA_READY.then(renderPoster);
