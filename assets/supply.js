const supply = window.PK_SUPPLY_DATA;

const yuan = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});
const count = new Intl.NumberFormat("zh-CN");

function rewardText(tier) {
  return `${tier.cardValue}¥ 京东卡`;
}

function itemGlyph(item) {
  const glyphs = {
    "急速草鞋": "boot",
    "攻速手套": "glove",
    "破茧斗篷": "cloak",
    "辉月法杖": "staff",
    "无尽战刃": "blade"
  };
  return glyphs[item] || "blade";
}

function renderIcon(kind) {
  if (kind === "boot") {
    return `<svg viewBox="0 0 64 64"><path d="M18 12h19l2 24 12 7v8H16l-4-7 8-9Z"></path><path d="M21 37h17M18 47h32"></path></svg>`;
  }
  if (kind === "glove") {
    return `<svg viewBox="0 0 64 64"><path d="M19 30V13h8v17M28 30V9h8v21M37 31V14h8v20M46 34V21h7v21L42 54H25L13 42v-9h6l8 8"></path></svg>`;
  }
  if (kind === "cloak") {
    return `<svg viewBox="0 0 64 64"><path d="M20 11h24l7 43H13Z"></path><path d="M24 13c2 9 5 14 8 16 4-3 7-8 8-16M32 29v25"></path></svg>`;
  }
  if (kind === "staff") {
    return `<svg viewBox="0 0 64 64"><path d="M42 8 55 21 42 34 29 21Z"></path><path d="M37 29 12 54M31 35l8 8"></path></svg>`;
  }
  return `<svg viewBox="0 0 64 64"><path d="M47 7 56 16 23 49 9 55l6-14Z"></path><path d="m35 19 10 10M16 41l7 7M39 11l14 14"></path></svg>`;
}

function tierState(tier, coverage) {
  if (coverage >= tier.threshold) return "is-earned";
  const previous = supply.tiers[supply.tiers.indexOf(tier) - 1]?.threshold || 0;
  if (coverage >= previous) return "is-next";
  return "";
}

function renderMeta() {
  document.querySelector("#supplyMeta").textContent =
    `${supply.meta.activityTime} | 学习规划部 ${count.format(supply.summary.leaders)} 位小组长 | 最新支付 ${supply.meta.latestPaymentTime || "暂无"}`;
  document.querySelector("#supplySync").textContent = `SYNC ${supply.meta.generatedAt.slice(5, 16)}`;
  document.querySelector("#activityTime").textContent = "6月11日-6月25日";
  document.querySelector("#slogan").textContent = supply.meta.slogan;
  document.querySelector("#latestPayment").textContent = supply.meta.latestPaymentTime
    ? `${supply.meta.latestPaymentTime}，正式发放口径从${supply.meta.officialStart}开始`
    : "暂无支付记录";
}

function renderKpis() {
  const cards = [
    ["参赛组长", `${count.format(supply.summary.leaders)}位`, "PK队伍匹配表 · 学习规划部", "TEAM"],
    ["有效伙伴基数", `${count.format(supply.summary.partners)}人`, `当前已覆盖 ${count.format(supply.summary.coveredPartners)} 人`, "ALLY"]
  ];

  document.querySelector("#supplyKpis").innerHTML = cards.map(([label, value, note, mark]) => `
    <article class="kpi-card supply-kpi">
      <div class="kpi-label"><span>${label}</span><span>${mark}</span></div>
      <p class="kpi-value">${value}</p>
      <p class="kpi-note">${note}</p>
    </article>
  `).join("");
}

function renderTiers() {
  const maxCoverage = supply.summary.maxCoverage;
  document.querySelector("#tierTrack").innerHTML = supply.tiers.map((tier, index) => `
    <article class="tier-card tier-${index + 1} ${tierState(tier, maxCoverage)}">
      <div class="tier-particles" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <div class="tier-icon ${itemGlyph(tier.item)}">
        ${renderIcon(itemGlyph(tier.item))}
      </div>
      <div class="coin-pile" aria-hidden="true"><i></i><i></i><i></i><b>${tier.cardValue}</b></div>
      <span class="tier-threshold">≥${tier.threshold}%</span>
      <span class="gift-prize">${rewardText(tier)}</span>
      <strong>${tier.item}</strong>
      <small>${tier.rarity}补给 · 金币堆同步解锁</small>
    </article>
  `).join("");
}

function leaderTierText(leader) {
  if (leader.currentTier) return `${rewardText(leader.currentTier)} · ${leader.currentTier.item}`;
  return "未解锁补给";
}

function nextLevelText(leader) {
  if (!leader.nextTier) return "已达最高补给";
  return `还有${leader.partnersNeeded}人出单进入下一级`;
}

function renderLeaders() {
  document.querySelector("#leaderCount").textContent = `${count.format(supply.leaders.length)}位小组长`;
  document.querySelector("#leaderRows").innerHTML = supply.leaders.map((leader, index) => {
    const level = leader.currentTier ? "is-earned" : leader.coverage > 0 ? "is-fighting" : "is-idle";
    const currentThreshold = leader.currentTier?.threshold || 0;
    return `
      <article class="leader-row ${level}">
        <div class="leader-rank">${String(index + 1).padStart(2, "0")}</div>
        <div class="leader-main">
          <div class="leader-title">
            <strong>${leader.name}</strong>
            <span>${leader.manager}战队 · ${leader.groupNo}号战场 · ${leader.coveredPartners}/${leader.teamSize}位伙伴已出单</span>
          </div>
          <div class="hp-bar" role="img" aria-label="${leader.name}出单覆盖率${leader.coverage}%">
            <i style="--coverage:${leader.coverage}%"></i>
            <em>20%</em><em>30%</em><em>40%</em><em>50%</em><em>70%</em>
          </div>
          <div class="leader-foot">
            <span class="leader-reward">${leaderTierText(leader)}</span>
            <span>${nextLevelText(leader)}</span>
          </div>
        </div>
        <div class="coverage-badge">
          <strong>${leader.coverage.toFixed(1)}%</strong>
          <small>LV ${currentThreshold || 0}</small>
        </div>
      </article>
    `;
  }).join("");
}

if (supply) {
  renderMeta();
  renderKpis();
  renderTiers();
  renderLeaders();
}
