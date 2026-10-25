/* Sentinel Earth — content data (bilingual). All security analysis is at the
   category / teaching level; the virtual teaching district is fictional. */
window.SE = (function(){
"use strict";

// ---- 5-step security ladder (FIPS 199 / data-classification inspired) ----
var LEVELS=[
 {c:'--sl1',zh:{n:'公开',d:'公开后不造成损害，重点是完整性与可用性（防篡改、防宕机、全程 TLS）。'},en:{n:'Public',d:'No harm on disclosure; focus on integrity and availability (anti-tamper, uptime, TLS).'}},
 {c:'--sl2',zh:{n:'内部',d:'未授权泄露造成有限损害。基线：SSO、最小权限、访问日志。'},en:{n:'Internal',d:'Limited harm on disclosure. Baseline: SSO, least privilege, access logs.'}},
 {c:'--sl3',zh:{n:'机密',d:'泄露造成严重损害。静态加密、MFA、细粒度授权、审计、定期扫描。'},en:{n:'Confidential',d:'Serious harm. Encryption at rest, MFA, fine-grained authZ, audit, routine scans.'}},
 {c:'--sl4',zh:{n:'受限',d:'重大损害或强监管。数据驻留、KMS/HSM、网络分段、变更审批、第三方审计。'},en:{n:'Restricted',d:'Severe harm or strict regulation. Residency, KMS/HSM, segmentation, change approval, third-party audit.'}},
 {c:'--sl5',zh:{n:'关键',d:'灾难性、城市/国家级后果。强隔离、逐动作审批、双人原则、持续监控+kill switch、高管签字。'},en:{n:'Critical',d:'Catastrophic, city/nation scale. Isolation, per-action approval, two-person rule, monitoring + kill switch, exec sign-off.'}}
];

// ---- building planning categories (what the real OSM buildings are coloured by) ----
// hex also mirrored in CSS --b0..--b4
var CATS=[
 {id:0,col:0x46c98a,cvar:'--b0',sl:1,zh:{n:'民宅 / 居住',net:'家用宽带或 5G 家庭网 + Wi-Fi，消费级路由器，运营商动态 IP'},
   en:{n:'Residential',net:'Home broadband or 5G + Wi-Fi, a consumer router, carrier dynamic IP'}},
 {id:1,col:0x5c9bff,cvar:'--b1',sl:2,zh:{n:'商业 / 办公',net:'企业专线 + VPN / 零信任，SSO 统一登录，自有或云托管服务'},
   en:{n:'Commercial / Office',net:'Enterprise line + VPN / zero-trust, SSO, self-hosted or cloud services'}},
 {id:2,col:0xc98bff,cvar:'--b2',sl:3,zh:{n:'零售 / 门店',net:'门店网络 + POS 收单链路，云后台，公共 Wi-Fi 常与收单网混用是风险'},
   en:{n:'Retail / Shop',net:'Store network + POS acquiring link, cloud backend; mixing guest Wi-Fi with the POS net is a risk'}},
 {id:3,col:0xff8a4c,cvar:'--b3',sl:3,zh:{n:'工业 / 仓储',net:'IT 办公网与 OT 工控网分离，设备常年在线，远程运维需跳板机'},
   en:{n:'Industrial / Logistics',net:'IT office net separated from OT control net; always-on devices; remote ops via a jump host'}},
 {id:4,col:0xffd24a,cvar:'--b4',sl:2,zh:{n:'公共 / 混合',net:'校园网 / 公共服务网，人流大、设备杂，身份与可用性是重点'},
   en:{n:'Civic / Mixed',net:'Campus or public-service network; many people and devices; identity and availability matter most'}}
];

// ---- the end-to-end chain, per category. hops bottom→front.
//  r = the risk at that hop (what the course teaches). Residential chain ends at the
//  website; business/civic chains continue to React → API → Agent. ----
function hop(zn,en,zr,er,risk){return {zh:{n:zn,r:zr},en:{n:en,r:er},risk:!!risk};}
var CHAINS={
 0:[ // residential — the "ordinary person online" path
  hop('设备 / 家用 Wi-Fi','Device / home Wi-Fi','老路由默认密码、固件不更新、IoT 摄像头成跳板','Default router password, stale firmware, an IoT camera as a foothold',1),
  hop('运营商 / DNS','ISP / DNS','DNS 劫持或投毒把你导到假站；公共 DNS + DoH 可缓解','DNS hijack or poisoning sends you to a fake site; public DNS + DoH helps',1),
  hop('TLS / HTTPS','TLS / HTTPS','没有锁标 = 明文可被监听；证书告警不要点「继续」','No padlock = plaintext can be sniffed; never click “proceed” past a cert warning'),
  hop('浏览器 / 网站','Browser / website','点错钓鱼链接、装恶意扩展、授权可疑 OAuth——老百姓最常中招这里','Phishing links, malicious extensions, shady OAuth grants — where people get hit most',1),
  hop('网站的后端','The site’s backend','对你不可见；你能做的是只在可信站点输入口令、开启 MFA','Invisible to you; your defence is MFA and only typing passwords on trusted sites')
 ],
 1:[ // commercial — full React → API → Agent
  hop('终端 / 网络边界','Endpoint / edge','被钓到的员工凭证、未打补丁的 VPN 是最常见入口','Phished staff credentials and an unpatched VPN are the usual entry',1),
  hop('身份 / SSO · MFA','Identity / SSO · MFA','判定「你是谁」，不做业务授权；令牌短期、换设备重新 MFA','Decides who you are, not what you may do; short tokens, re-MFA on new devices'),
  hop('React 前端','React frontend','前端从不自行判断权限；XSS、泄露的密钥都在这层','The frontend never decides authZ itself; XSS and leaked keys live here',1),
  hop('API 网关','API gateway','集中授权决策点 + 限流 + Schema 校验；参数化堵注入','Central authZ decision point + rate limit + schema validation; parameterize to stop injection'),
  hop('后端 / 安全编码','Backend / secure coding','OWASP Top 10、所有权检查（参数化 ≠ 谁能读）、SAST/Semgrep','OWASP Top 10, ownership checks (parameterization ≠ who may read), SAST/Semgrep',1),
  hop('数据','Data','静态加密、KMS、行级安全；供应链与 SBOM 锁定依赖','Encryption at rest, KMS, row-level security; SBOM and pinned dependencies'),
  hop('AI · RAG · Agent','AI · RAG · Agent','LLM 输出是建议不是指令；工具调用过独立网关+允许清单（OWASP LLM01）','LLM output is advice, not a command; tool calls pass a gateway + allowlist (OWASP LLM01)',1),
  hop('观测与响应','Observe & respond','日志、告警、kill switch；预防挡在前，检测补在后','Logs, alerts, kill switch; prevention in front, detection behind')
 ],
 2:[ // retail — PCI DSS
  hop('门店网络 / Wi-Fi','Store network / Wi-Fi','收单网必须与顾客 Wi-Fi 分段，否则一台被黑设备就够了','The POS net must be segmented from guest Wi-Fi, or one hacked device is enough',1),
  hop('POS 终端','POS terminal','读卡器被植入 skimmer、固件被篡改；只认签名固件','Card readers get skimmers, firmware tampered; accept only signed firmware',1),
  hop('收单 / 支付网关','Acquirer / payment gateway','用令牌化，店里永不落地明文卡号（PCI DSS）','Tokenize — the store never stores raw PAN (PCI DSS)'),
  hop('云后台 / API','Cloud backend / API','订单与会员 API 鉴权、限流；注入与越权','Order and loyalty APIs need authZ and rate limits; injection and broken access control',1),
  hop('数据 / 对账','Data / reconciliation','持卡人数据加密分区，审计日志留痕','Cardholder data encrypted and partitioned, audit trail kept')
 ],
 3:[ // industrial — OT
  hop('OT / 工控网','OT / control network','与办公网物理或逻辑隔离；老设备协议无认证','Physically/logically isolated from IT; legacy protocols lack auth',1),
  hop('跳板机 / 远程运维','Jump host / remote ops','远程只能经受控跳板机 + MFA + 录屏审计','Remote access only via a controlled jump host + MFA + session recording'),
  hop('IT / 管理后台','IT / management','勒索软件常从 IT 侧横移到 OT；分段与最小权限','Ransomware pivots from IT into OT; segmentation and least privilege',1),
  hop('云 / 监控','Cloud / monitoring','遥测上云只读；控制指令不走公网','Telemetry to cloud is read-only; control commands never traverse the public internet'),
  hop('数据 / 备份','Data / backup','离线不可变备份，断电与容灾演练','Offline immutable backups; power-loss and DR drills')
 ],
 4:[ // civic/mixed
  hop('接入 / 公共 Wi-Fi','Access / public Wi-Fi','开放网络易被中间人；强制 HTTPS 与访客隔离','Open networks invite MITM; enforce HTTPS and isolate guests',1),
  hop('身份 / 账号','Identity / accounts','大量用户、弱口令多；MFA 与异常登录检测','Many users, many weak passwords; MFA and anomalous-login detection'),
  hop('应用 / 门户','App / portal','公共门户是高频攻击面；OWASP Top 10','A public portal is a frequent attack surface; OWASP Top 10',1),
  hop('后端 / 数据','Backend / data','个人数据分级与最小收集；审计','Classify personal data and minimize collection; audit'),
  hop('可用性 / 响应','Availability / response','人流高峰与灾害下保持服务；容灾','Stay up under surge and disaster; resilience')
 ]
};

// category authoritative/plain/example
var CATAPE={
 0:{zh:{a:'居住建筑的网络属于消费级：家用路由、Wi-Fi、运营商动态 IP。安全重心不在复杂架构，而在「人」——钓鱼、弱口令、未更新的 IoT 设备，以及点错网站。',p:'家就像没有保安的小区，门锁（口令）和不乱开门（不点可疑链接）全靠自己。',e:'收到「你的快递异常，点此处理」的短信，链接是仿冒站。开了 MFA 的话，就算填了密码，对方也进不去。'},
    en:{a:'Homes run consumer-grade networking: a home router, Wi-Fi, a carrier dynamic IP. The weak point is people — phishing, weak passwords, un-updated IoT, clicking the wrong site.',p:'Home is an apartment with no guard; the lock (password) and not opening the door (not clicking) are on you.',e:'A text says “your parcel has an issue, tap here” and the link is a spoof. With MFA on, even a typed password won’t let them in.'}},
 1:{zh:{a:'商业办公网络是完整的企业栈：零信任/VPN、SSO、React 前端、API 网关、后端、数据层，越来越多接上 LLM+RAG+Agent。这正是本课 capstone 的形态，知识点全在这条链上。',p:'写字楼有前台、门禁、各层保安；每道门都要验，员工的话不自动当命令。',e:'一名员工被钓走账号。因为有 MFA + 短期令牌 + 网关授权，攻击者拿到密码也过不了第二道门，日志还会报警。'},
    en:{a:'Commercial/office is the full enterprise stack: zero-trust/VPN, SSO, a React frontend, an API gateway, a backend, a data tier, increasingly an LLM+RAG+Agent. This is your capstone shape — every course topic lives on this chain.',p:'An office tower has reception, badge gates and guards per floor; every door is checked and a staffer’s word isn’t auto-executed.',e:'A staff account is phished. With MFA + short tokens + gateway authZ, the password alone fails the second door, and the logs alert.'}},
 2:{zh:{a:'零售的核心是持卡人数据与支付链路，受 PCI DSS 约束。关键是收单网与顾客网分段、卡号令牌化、门店永不落地明文卡号。',p:'收银台的钱箱要和大堂分开；顾客能逛，但碰不到钱箱。',e:'顾客 Wi-Fi 和 POS 在同一网段，一台被黑的平板就能嗅探刷卡数据。分段后这条路就断了。'},
    en:{a:'Retail revolves around cardholder data and the payment path under PCI DSS. The essentials: segment the POS net from guest Wi-Fi, tokenize PANs, and never store raw card numbers in-store.',p:'The register’s cash drawer is separate from the lobby; shoppers browse but can’t reach the drawer.',e:'Guest Wi-Fi and POS share a subnet, so one hacked tablet can sniff card data. Segmentation cuts that path.'}},
 3:{zh:{a:'工业/仓储把 IT 办公网与 OT 工控网分开。OT 设备常年在线、协议老旧无认证，最大风险是勒索软件从 IT 侧横移到控制系统。',p:'工厂的控制室和办公室是两栋楼，中间只有一道有人值守的门。',e:'财务电脑中勒索软件，若网络没分段就会蔓延到产线。分段 + 跳板机让它停在 IT 侧。'},
    en:{a:'Industrial/logistics separates IT office networks from OT control networks. OT devices are always-on with legacy, unauthenticated protocols; the top risk is ransomware pivoting from IT into control systems.',p:'The plant’s control room and offices are two buildings with one guarded door between them.',e:'A finance PC catches ransomware; without segmentation it spreads to the line. Segmentation + a jump host keeps it on the IT side.'}},
 4:{zh:{a:'公共/混合建筑（学校、场馆、服务中心）人流大、设备杂，身份管理与可用性是重点，也是你 CSE635 里 AI 作业场景（校园助手）的现实背景。',p:'像图书馆：谁都能进，但借书要卡，贵重区要登记。',e:'校园门户高峰选课被刷垮。限流 + 排队 + CDN 让它扛住，而不是宕机。'},
    en:{a:'Civic/mixed buildings (schools, venues, service centres) have heavy foot traffic and mixed devices; identity and availability dominate — the real backdrop for your CSE635 campus-assistant AI labs.',p:'Like a library: anyone enters, but borrowing needs a card and valuables need sign-in.',e:'A campus portal buckles during course registration. Rate limiting + a queue + CDN keep it up instead of crashing.'}}
};

// ---- virtual teaching district: FICTIONAL buildings for sensitive sectors ----
// Placed on a synthetic plate, clearly labelled, never tied to a real address.
var DISTRICT={
 zh:{title:'示例教学街区（虚构）',sub:'以下建筑不对应任何真实地址，仅用于讲解各行业的网络形态与合规框架。'},
 en:{title:'Teaching District (fictional)',sub:'These buildings map to no real address; they illustrate each sector’s network shape and compliance frame.'},
 blds:[
  {key:'gov',col:0x7bd0ff,sl:3,h:70,zh:{n:'政府 / 公共部门',reg:['FISMA','FedRAMP','NIST 800-53','等保 2.0'],
    a:'政府系统按影响分级（FIPS 199 低/中/高，或等保 1–5 级），再选控制基线；云服务需 FedRAMP 授权，之后持续监控。',p:'像分了密级的档案馆：不同房间不同钥匙，每次进出都登记。',e:'一个定为「中」级的系统每月提交漏洞扫描与整改，而不是一次性过审。'},
   en:{n:'Government / Public',reg:['FISMA','FedRAMP','NIST 800-53','MLPS 2.0'],
    a:'Government systems are categorized by impact (FIPS 199 Low/Mod/High, or MLPS 1–5), then a control baseline is selected; cloud needs FedRAMP, followed by continuous monitoring.',p:'Like a classified archive: different rooms, different keys, every entry logged.',e:'A “Moderate” system files monthly scans and fixes rather than passing once.'}},
  {key:'bank',col:0x46c98a,sl:3,h:120,zh:{n:'银行 / 金融',reg:['PCI DSS','MFA','HSM','SOX'],
    a:'金融系统用隔离网、HSM 托管密钥、普遍 MFA；交易完整性靠双重确认与审批绑定具体动作（防 TOCTOU）。',p:'像银行金库：进出登记、要审批、全程监控，钥匙单独保管。',e:'一笔转账在「批准」后被改到另一个账户——必须重新审批，不能复用旧批准。'},
   en:{n:'Bank / Finance',reg:['PCI DSS','MFA','HSM','SOX'],
    a:'Finance uses isolated networks, HSM-held keys, broad MFA; transaction integrity relies on dual control and approval bound to a specific action (TOCTOU defence).',p:'Like a bank vault: logged, approved, watched, keys held separately.',e:'An approved transfer is redirected to another account — it must be re-approved, never reusing the old approval.'}},
  {key:'hos',col:0xff8aa0,sl:2,h:55,zh:{n:'医院 / 医疗',reg:['HIPAA','可用性','设备网隔离'],
    a:'医疗网把临床网与医疗设备网分开；重点是可用性（系统宕机危及生命）与患者隐私，勒索软件是头号威胁。',p:'像急诊室：谁能看病历严格控制，但救命设备一刻不能断网。',e:'勒索软件若瘫痪 HIS 会延误手术，所以离线备份与快速恢复比什么都重要。'},
   en:{n:'Hospital / Health',reg:['HIPAA','Availability','Device-net isolation'],
    a:'Healthcare separates the clinical net from the medical-device net; the focus is availability (downtime risks lives) and patient privacy, with ransomware the top threat.',p:'Like an ER: who can read records is tightly controlled, but life-support can’t drop offline.',e:'Ransomware paralysing the HIS delays surgery, so offline backups and fast recovery matter most.'}},
  {key:'dip',col:0xc98bff,sl:3,h:45,zh:{n:'使领馆 / 外事',reg:['数据驻留','加密通信','跨境合规'],
    a:'外事机构的通信跨越国境，强调端到端加密、数据驻留与分区，以及对跨境数据流动的严格合规。',p:'像跨国信使：信件全程上锁，经过哪国都不被拆看。',e:'一份文件要传回本国，先做传输影响评估、签合规条款，再加密传输。'},
   en:{n:'Embassy / Foreign Affairs',reg:['Data residency','Encrypted comms','Cross-border compliance'],
    a:'Diplomatic comms cross borders, stressing end-to-end encryption, data residency and partitioning, and strict compliance for cross-border flows.',p:'Like a sealed diplomatic pouch: locked end to end, unopened whichever country it crosses.',e:'A document going home gets a transfer impact assessment, signed clauses, then encrypted transfer.'}},
  {key:'crit',col:0xff556e,sl:4,h:40,zh:{n:'关键基础设施 / OT',reg:['强隔离','逐动作审批','双人原则','Kill switch'],
    a:'电网、交管、清算等关键设施一旦失陷是城市级灾难。能不自动化就不自动化；自动化的每一步都要人审批 + kill switch + 高管签字（对应 HW5 的「关键层级」）。',p:'像核电站控制室：两个人同时转钥匙才能动，出事能一键停机。',e:'编码 Agent 想删生产库表——工具网关先拦（预防），漏过则告警呼叫值班（检测），两者都要。'},
   en:{n:'Critical Infrastructure / OT',reg:['Isolation','Per-action approval','Two-person rule','Kill switch'],
    a:'Grid, traffic control, clearing — compromise is a city-scale disaster. Avoid automation; where unavoidable, every step takes human approval + a kill switch + exec sign-off (HW5 critical tier).',p:'Like a reactor control room: two people turn keys together, and one switch halts everything.',e:'A coding agent tries to drop a production table — the gateway blocks it (prevention); if it slips, an alert pages on-call (detection). Both are needed.'}}
 ]
};

// ---- per-country / region regulations (keyed by ISO2; fallback by continent) ----
var CTRYREG={
 US:{sl:3,r:['州隐私法','HIPAA','GLBA','FedRAMP'],z:'联邦行业法 + 州隐私法的拼图：医疗 HIPAA、金融 GLBA、加州 CCPA/CPRA。勒索软件针对医院与地方政府高发。',e:'US: a patchwork of federal sector laws plus state privacy laws (HIPAA, GLBA, CCPA/CPRA). Ransomware hits hospitals and local governments.'},
 CA:{sl:2,r:['PIPEDA'],z:'联邦隐私法 PIPEDA 以同意与问责为核心；重大伤害风险的泄露须上报并通知个人。',e:'Canada: PIPEDA centres on consent and accountability; breaches with real risk of harm are reported and notified.'},
 BR:{sl:2,r:['LGPD','ANPD'],z:'LGPD 由 ANPD 监管，通常需指定数据保护官；移动支付 Pix 普及，欺诈更新快。',e:'Brazil: LGPD under the ANPD, usually a DPO; Pix instant payments are everywhere and fraud moves fast.'},
 GB:{sl:3,r:['UK GDPR','DPA 2018','FCA'],z:'UK GDPR + DPA 2018；金融受 FCA/PRA「运营韧性」要求；泄露 72 小时报 ICO。',e:'UK: UK GDPR + DPA 2018; finance under FCA/PRA operational resilience; breaches reported to the ICO in 72h.'},
 DE:{sl:3,r:['GDPR','BSI C5','NIS2'],z:'GDPR + 德国 BSI C5 云审计 + NIS2；法兰克福 DE-CIX 是全球最大互联网交换点之一，边缘与路由安全关键。',e:'Germany: GDPR + BSI C5 + NIS2; Frankfurt DE-CIX is a top internet exchange, so edge and routing security are critical.'},
 FR:{sl:3,r:['GDPR','NIS2','ANSSI'],z:'GDPR + NIS2，ANSSI 主导国家网络安全；关键运营者有额外义务。',e:'France: GDPR + NIS2, with ANSSI leading national cybersecurity; essential operators carry extra duties.'},
 AE:{sl:3,r:['UAE PDPL','DIFC DPL'],z:'联邦 PDPL + 金融自由区 DIFC 独立数据法；同城两套规则，API 层要按租户区分合规。',e:'UAE: federal PDPL + the DIFC’s own law; one city, two rulebooks, so the API layer applies policy per tenant.'},
 IN:{sl:2,r:['DPDP 2023','CERT-In'],z:'DPDP 法强调同意；CERT-In 要求 6 小时内报告事件；大量外包开发，代码与供应链安全是重点。',e:'India: the DPDP Act centres on consent; CERT-In requires 6-hour incident reports; heavy outsourcing makes code and supply-chain security key.'},
 SG:{sl:3,r:['PDPA','Cybersecurity Act','MAS TRM'],z:'亚太海缆与数据中心枢纽；关键信息基础设施受《网络安全法》；金融遵循 MAS TRM。',e:'Singapore: an APAC cable and data-centre hub; CII under the Cybersecurity Act; finance follows MAS TRM.'},
 CN:{sl:4,r:['网络安全法','数据安全法','PIPL','等保 2.0'],z:'等保 2.0 把系统分五级定级测评（与本页 SL1–SL5 相近）；重要数据原则上境内存储，出境需安全评估。',e:'China: MLPS 2.0 grades systems into five levels (close to this page’s SL1–SL5); important data stays domestic, cross-border transfer needs assessment.'},
 KR:{sl:3,r:['PIPA','PIPC'],z:'PIPA 以严格著称，由 PIPC 执法；居民登录号收集受严格限制。',e:'South Korea: PIPA is strict, enforced by the PIPC; collecting resident registration numbers is tightly limited.'},
 JP:{sl:3,r:['APPI'],z:'APPI 2022 修订后特定泄露须报告并通知；地震频发，容灾与多区域备份本身是安全的一部分。',e:'Japan: post-2022 APPI requires reporting certain breaches; frequent quakes make DR and multi-region backup part of security.'},
 AU:{sl:2,r:['Privacy Act 1988','APPs','SOCI'],z:'APPs + 可通报数据泄露机制（NDB）；SOCI 法案覆盖关键基础设施。',e:'Australia: the APPs + the Notifiable Data Breaches scheme; the SOCI Act covers critical infrastructure.'},
 ZA:{sl:2,r:['POPIA'],z:'POPIA 由信息监管机构执法；移动端优先，SIM 卡交换欺诈常见，不能只靠短信验证码。',e:'South Africa: POPIA by the Information Regulator; mobile-first with common SIM-swap fraud, so SMS codes alone are not enough.'},
 NG:{sl:2,r:['NDPA 2023','NDPC'],z:'NDPA 2023 由 NDPC 监管；西非海缆登陆枢纽；金融科技需同时满足央行与数据保护法。',e:'Nigeria: NDPA 2023 under the NDPC; a West African cable-landing hub; fintech must satisfy both the central bank and data law.'},
 RU:{sl:2,r:['152-FZ'],z:'152-FZ 要求俄公民个人数据首先在境内处理（数据本地化）。',e:'Russia: 152-FZ requires Russian citizens’ personal data to be processed first in-country.'}
};
var CONTREG={
 'North America':{sl:2,r:['州/联邦隐私法'],z:'北美以行业法 + 州/省隐私法为主，先做数据分级再定控制强度。',e:'North America: sector laws plus state/provincial privacy law; classify data first, then set control strength.'},
 'South America':{sl:2,r:['各国数据保护法'],z:'拉美多国有各自数据保护法，跨境规则不完全一致。',e:'South America: many national data laws with differing cross-border rules.'},
 'Europe':{sl:3,r:['GDPR','NIS2','DORA'],z:'欧洲以 GDPR 为核心，NIS2 扩大安全义务范围，DORA 规范金融数字韧性。',e:'Europe: GDPR at the core, NIS2 widening duties, DORA for financial digital resilience.'},
 'Africa':{sl:2,r:['POPIA/NDPA 等','马拉博公约'],z:'多国已立数据保护法；移动货币普及，账户与 SIM 卡安全是核心。',e:'Africa: many data laws now; mobile money is common, so account and SIM security are central.'},
 'Asia':{sl:3,r:['PIPL/APPI/PDPA 等'],z:'亚洲各国规则严格且差异大，跨境数据要逐国评估。',e:'Asia: strict but varied rules; cross-border data is assessed country by country.'},
 'Oceania':{sl:2,r:['Privacy Act','SOCI'],z:'澳新有可通报泄露机制；岛国网络依赖海缆，冗余很重要。',e:'Oceania: notifiable-breach schemes; island connectivity leans on cables, so redundancy matters.'},
 'Antarctica':{sl:1,r:['南极条约体系'],z:'无主权，科研站依条约运作；网络靠卫星，安全以可用性与完整性为主。',e:'Antarctica: no sovereignty, treaty-run stations; satellite links, so security is mostly availability and integrity.'}
};
var OCEANREG={sl:3,r:['海缆保护','UNCLOS'],z:'海洋之下是承载洲际流量的海底光缆。损坏多来自船锚与渔具，控制手段是在途加密、多路由冗余与登陆站物理安防。',e:'Below the ocean run the subsea cables carrying intercontinental traffic. Most damage is anchors and fishing gear; controls are in-transit encryption, route diversity and landing-station security.'};

// ---- featured cities with street data (id must match streets/<id>.json) ----
var CITIES=[
 {id:'sjc',lat:37.3337,lon:-121.8907,zh:'圣何塞·硅谷',en:'San Jose'},
 {id:'nyc',lat:40.7075,lon:-74.0110,zh:'纽约',en:'New York'},
 {id:'dca',lat:38.8977,lon:-77.0365,zh:'华盛顿特区',en:'Washington DC'},
 {id:'yyz',lat:43.6481,lon:-79.3810,zh:'多伦多',en:'Toronto'},
 {id:'gru',lat:-23.5505,lon:-46.6333,zh:'圣保罗',en:'São Paulo'},
 {id:'lhr',lat:51.5128,lon:-0.0918,zh:'伦敦',en:'London'},
 {id:'fra',lat:50.1109,lon:8.6821,zh:'法兰克福',en:'Frankfurt'},
 {id:'dxb',lat:25.1972,lon:55.2744,zh:'迪拜',en:'Dubai'},
 {id:'bom',lat:19.0660,lon:72.8680,zh:'孟买',en:'Mumbai'},
 {id:'sin',lat:1.2834,lon:103.8607,zh:'新加坡',en:'Singapore'},
 {id:'pek',lat:39.9087,lon:116.3975,zh:'北京',en:'Beijing'},
 {id:'sha',lat:31.2397,lon:121.4998,zh:'上海',en:'Shanghai'},
 {id:'icn',lat:37.5665,lon:126.9780,zh:'首尔',en:'Seoul'},
 {id:'hnd',lat:35.6900,lon:139.6920,zh:'东京',en:'Tokyo'},
 {id:'syd',lat:-33.8688,lon:151.2093,zh:'悉尼',en:'Sydney'},
 {id:'jnb',lat:-26.1076,lon:28.0567,zh:'约翰内斯堡',en:'Johannesburg'},
 {id:'los',lat:6.4281,lon:3.4219,zh:'拉各斯',en:'Lagos'}
];

var UI={
 zh:{title:'安全地球 · 全球安全态势',sub:'拖动旋转，滚轮缩放。点任意国家看其监管与安全级别；点城市飞入街道层，点建筑按类型看它的联网链路与安全考量。',
  tRot:'自转',tCov:'覆盖',tNight:'夜景',tBorder:'国界',tGrid:'经纬网',tNodes:'节点',tReset:'重置',
  loading:'正在加载卫星影像…',introEye:'使用指南',introT:'点击地球上的任意国家或城市',
  introP:'全球每个国家都标出了适用的安全级别与监管框架。点城市会飞入真实街道层——建筑按规划类型着色（住宅/商业/零售/工业/公共），点一栋楼就能看到这一类从「用户 → 网络 → React → Agent」的端到端安全链路，正是 CSE635 的全部知识点。',
  how:'操作',howList:['<b>拖动</b> 旋转，<b>滚轮/双指</b> 缩放','<b>点国家</b> 看监管与安全级别','<b>点城市</b> 飞入街道层','<b>点建筑</b> 看该类型的端到端安全链路','<b>示例教学街区</b> 讲政府/银行/医院等行业','<b>Esc</b> 返回全球'],
  ladder:'安全级别阶梯',fly:'快速飞往',cats:'建筑类型',regime:'适用监管',level:'安全级别',
  country:'国家/地区',ocean:'海洋',coords:'坐标',back:'返回全球',toCity:'飞往最近城市',km:'公里',
  chain:'端到端安全链路',net:'使用的网络',auth:'权威解释',plain:'白话',ex:'举例',
  cityEye:'城市 · 街道层',bEye:'建筑类型',district:'示例教学街区',openDistrict:'打开示例教学街区',
  buildings:'建筑',roads:'道路',pop:'人口',riskHop:'风险点',course:'对应课程知识点'},
 en:{title:'Sentinel Earth · Global Security Posture',sub:'Drag to rotate, scroll to zoom. Click any country for its regulations and security level; click a city to enter the street layer and click a building for its network chain and security considerations.',
  tRot:'Spin',tCov:'Coverage',tNight:'Night',tBorder:'Borders',tGrid:'Graticule',tNodes:'Nodes',tReset:'Reset',
  loading:'Loading satellite imagery…',introEye:'Field guide',introT:'Click any country or city on Earth',
  introP:'Every country is marked with its applicable security level and regulatory frame. Clicking a city flies into a real street layer — buildings coloured by planning type (residential/commercial/retail/industrial/civic). Click one to see that type’s end-to-end chain from user → network → React → Agent, which is the whole of CSE635.',
  how:'Controls',howList:['<b>Drag</b> to rotate, <b>scroll/pinch</b> to zoom','<b>Click a country</b> for regulation and level','<b>Click a city</b> to enter the street layer','<b>Click a building</b> for its end-to-end chain','<b>Teaching District</b> for government/bank/hospital sectors','<b>Esc</b> returns to the globe'],
  ladder:'Security level ladder',fly:'Fly to',cats:'Building types',regime:'Regulations',level:'Security level',
  country:'Country/region',ocean:'Ocean',coords:'Coordinates',back:'Back to globe',toCity:'Fly to nearest city',km:'km',
  chain:'End-to-end security chain',net:'Network used',auth:'Authoritative',plain:'Plain words',ex:'Example',
  cityEye:'City · street layer',bEye:'Building type',district:'Teaching District',openDistrict:'Open Teaching District',
  buildings:'Buildings',roads:'Roads',pop:'Population',riskHop:'risk',course:'Course topics'}
};

return {LEVELS:LEVELS,CATS:CATS,CHAINS:CHAINS,CATAPE:CATAPE,DISTRICT:DISTRICT,CTRYREG:CTRYREG,CONTREG:CONTREG,OCEANREG:OCEANREG,CITIES:CITIES,UI:UI};
})();
