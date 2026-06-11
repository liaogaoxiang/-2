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

function tierPrizeText(tier) {
  return `${tier.cardValue}元京东卡`;
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

function renderItemArt(kind) {
  if (kind === "boot") {
    return `
      <div class="item-art boot-art">
        <i class="boot-cuff"></i><i class="boot-leg"></i><i class="boot-foot"></i><i class="boot-sole"></i>
        <b class="boot-guard"></b><b class="boot-lace lace-one"></b><b class="boot-lace lace-two"></b><em></em>
      </div>
    `;
  }
  if (kind === "glove") {
    return `
      <div class="item-art glove-art">
        <i class="finger f1"></i><i class="finger f2"></i><i class="finger f3"></i><i class="finger f4"></i>
        <b class="glove-palm"></b><b class="glove-thumb"></b><span class="glove-plate"></span><em></em>
      </div>
    `;
  }
  if (kind === "cloak") {
    return `
      <div class="item-art cloak-art">
        <i class="cape cape-left"></i><i class="cape cape-right"></i><b class="cloak-collar"></b>
        <span class="cloak-gem"></span><em class="cloak-trim trim-left"></em><em class="cloak-trim trim-right"></em>
      </div>
    `;
  }
  if (kind === "staff") {
    return `
      <div class="item-art staff-art">
        <i class="staff-handle"></i><b class="staff-head"></b><span class="staff-orb"></span>
        <em class="staff-crescent crescent-left"></em><em class="staff-crescent crescent-right"></em><strong></strong>
      </div>
    `;
  }
  return `
    <div class="item-art blade-art">
      <i class="slash slash-one"></i><i class="slash slash-two"></i>
      <b class="blade-main"></b><b class="blade-core"></b><span class="blade-guard"></span><em class="blade-hilt"></em><strong></strong>
    </div>
  `;
}

function renderItemBadge(kind) {
  return `
    <span class="item-badge ${kind}">
      <i></i><b></b>
    </span>
  `;
}

function renderCoinStack() {
  return `
    <span class="reward-coins" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </span>
  `;
}

function tierState(tier, coverage) {
  if (coverage >= tier.threshold) return "is-earned";
  const previous = supply.tiers[supply.tiers.indexOf(tier) - 1]?.threshold || 0;
  if (coverage >= previous) return "is-next";
  return "";
}

function renderMeta() {
  document.querySelector("#supplyMeta").textContent =
    `6月11日-6月25日 | 学习规划部 ${count.format(supply.summary.leaders)} 位小组长 | 最新支付 ${supply.meta.latestPaymentTime || "暂无"}`;
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
      <div class="tier-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="tier-copy">
        <span class="tier-threshold">出单伙伴占比≥${tier.threshold}%</span>
        <span class="gift-prize">${tierPrizeText(tier)}</span>
      </div>
      <div class="item-showcase">
        <div class="item-aura"></div>
        ${renderItemArt(itemGlyph(tier.item))}
        ${renderItemBadge(itemGlyph(tier.item))}
        ${renderCoinStack()}
      </div>
      <strong>${tier.item}</strong>
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

function partnerNames(leader) {
  const names = leader.hitPartners || [];
  if (!names.length) {
    return `<div class="partner-strip is-empty"><span>已出单伙伴</span><em>暂无</em></div>`;
  }
  return `
    <div class="partner-strip">
      <span>已出单伙伴</span>
      <div>${names.map((name) => `<em>${name}</em>`).join("")}</div>
    </div>
  `;
}

function renderLeaders() {
  document.querySelector("#leaderCount").textContent = `${count.format(supply.leaders.length)}位小组长`;
  document.querySelector("#leaderRows").innerHTML = supply.leaders.map((leader, index) => {
    const level = leader.currentTier ? "is-earned" : leader.coverage > 0 ? "is-fighting" : "is-idle";
    const currentThreshold = leader.currentTier?.threshold || 0;
    return `
      <article class="leader-row ${level}" data-leader-name="${leader.name}">
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
          ${partnerNames(leader)}
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

function setupLeaderSearch() {
  const input = document.querySelector("#leaderSearch");
  const button = document.querySelector("#leaderSearchButton");
  if (!input || !button) return;

  const locate = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) return;
    const rows = [...document.querySelectorAll(".leader-row")];
    const target = rows.find((row) => row.dataset.leaderName.toLowerCase() === query)
      || rows.find((row) => row.dataset.leaderName.toLowerCase().includes(query));
    rows.forEach((row) => row.classList.remove("is-search-hit"));
    if (!target) {
      input.classList.add("is-missing");
      window.setTimeout(() => input.classList.remove("is-missing"), 900);
      return;
    }
    target.classList.add("is-search-hit");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.classList.remove("is-search-hit"), 2600);
  };

  button.addEventListener("click", locate);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    locate();
  });
}

if (supply) {
  renderMeta();
  renderKpis();
  renderTiers();
  renderLeaders();
  setupLeaderSearch();
}
