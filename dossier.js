// Sentinel Earth · Cyber Security Dossier knowledge base (bilingual [zh, en]).
// Archetype-level teaching material: what a building of this KIND typically runs, the threats that class of
// system faces, the controls and the trade-offs. It is NOT an assessment of any real building and contains no
// real vulnerability, configuration or internal data about any site.
(function(){
var K={};
K.ver='2026-10-29';
K.meta={
 stamp:['教学档案 · 类别原型','TRAINING DOSSIER · ARCHETYPE'],
 note:['本档案按「建筑类别」给出通用的网络安全架构与威胁建模参考（CSE635 课程 + 公开框架 + 前沿实践）。它不是对这栋真实建筑的评估，不包含任何真实漏洞、配置或内部信息。','This dossier gives a generic security-architecture and threat-model reference for the building’s CLASS (CSE635 course + public frameworks + current practice). It is not an assessment of this real building and holds no real vulnerability, configuration or internal data.'],
 how:['读法：每一条都按「威胁 → 控制 → 利弊」写；带 ◆ 的是课程原话或课程案例。','How to read: every item runs threat → control → trade-off; ◆ marks course wording or a course case.']
};
// tabs, in order
K.dims=[
 ['brief','态势总览','Brief','◎'],
 ['layers','分层架构','Layers','☰'],
 ['e2e','端到端链路','End-to-end','⇢'],
 ['idn','认证与令牌','Identity & tokens','⚿'],
 ['crypto','密码与算法','Crypto & algorithms','∑'],
 ['net','网络·路由·线路','Network · routing · lines','⌁'],
 ['cloud','云与数据存储','Cloud & data','☁'],
 ['supply','供应链与补丁','Supply chain & patching','⛓'],
 ['actors','企业·政府·居民·供应商','Stakeholders','⚇'],
 ['threat','对手与检测响应','Adversaries & response','⚠'],
 ['ai','AI · Agent 安全','AI · agent security','✶'],
 ['front','前沿与法规','Frontier & regulation','➚'],
 ['course','CSE635 课程映射','CSE635 course map','✎']
];

// ---------------- the layered stack (bottom → top) ----------------
// each layer: n name, w what it is, t threats, c controls, pc [pro, con] trade-offs, std standards, crs course link
K.layers=[
 {id:'phy',n:['L0 物理 · 线路 · 电力','L0 Physical · lines · power'],
  w:['机房、配线间、光纤与铜缆、运营商接入点、UPS 与发电机。网络安全的地基：线断了、电停了，再好的加密也没用。','Server rooms, wiring closets, fibre and copper, carrier hand-offs, UPS and generators. The foundation: cut the line or the power and no encryption helps.'],
  t:[['单一光纤路由被施工挖断 → 全楼断网','A single fibre route cut by roadworks → the whole building offline'],['配线间无门禁 → 有人插入未授权设备','An unlocked wiring closet → someone plugs in a rogue device'],['UPS 电池老化、未做切换演练','Aged UPS batteries, failover never rehearsed']],
  c:[['双运营商 + 物理分离的两条入户路由（不同管道、不同方向）','Two carriers on physically diverse entry paths (different ducts, different sides)'],['机柜锁 + 门禁日志 + 端口 802.1X，不认识的设备拿不到网络','Rack locks + access logs + 802.1X on ports, so unknown devices get no network'],['定期带载切换演练；监测温湿度与电力','Regular on-load failover drills; monitor temperature, humidity and power']],
  pc:[['冗余线路让单点故障不再致命','Redundant lines remove a fatal single point'],['双线路与发电机成本高，且两家运营商可能在上游共用同一管道——要核对物理路由','Diversity and generators cost money, and two carriers may still share one upstream duct — verify the physical routes']],
  std:['ISO/IEC 27001 A.7','TIA-942','NIST SP 800-53 PE'],crs:['◆ Week 1：资产与攻击面从物理层开始数','◆ Week 1: count assets and attack surface starting from the physical layer']},
 {id:'net',n:['L1 网络 · 路由 · 分段','L1 Network · routing · segmentation'],
  w:['交换机、路由器、防火墙、VLAN/VRF、Wi-Fi、SD-WAN，以及出楼后的运营商路由（BGP）。决定「谁能和谁说话」。','Switches, routers, firewalls, VLAN/VRF, Wi-Fi, SD-WAN and, past the door, carrier routing (BGP). Decides who can talk to whom.'],
  t:[['扁平网络：一台被控的打印机能直达财务服务器（横向移动）','A flat network: one compromised printer reaches the finance server (lateral movement)'],['访客 Wi-Fi 与业务网同段','Guest Wi-Fi on the same segment as business systems'],['管理接口（设备后台）暴露在公网','Device management interfaces exposed to the internet'],['上游 BGP 路由泄漏/劫持使流量绕道','Upstream BGP leaks or hijacks reroute traffic']],
  c:[['按信任区分段：用户 / 服务器 / 设备(IoT/OT) / 访客 / 管理，各区之间默认拒绝','Segment by trust zone — users / servers / devices (IoT/OT) / guests / management — default-deny between zones'],['微分段 + 东西向流量策略；管理面走带外网络','Micro-segmentation and east-west policy; management on an out-of-band network'],['WPA3-Enterprise + 802.1X；访客网只出公网','WPA3-Enterprise + 802.1X; guest net goes to the internet only'],['选择执行 RPKI 路由源验证（ROV）的运营商','Choose carriers that enforce RPKI route-origin validation (ROV)']],
  pc:[['分段把「一点失守」限制在一个区里','Segmentation keeps one breach inside one zone'],['规则越细越难维护，错误规则会断业务；需要资产清单与流量可视化先行','Finer rules are harder to maintain and a wrong rule breaks business; you need an asset inventory and flow visibility first']],
  std:['NIST SP 800-207 零信任','NIST SP 800-41','IEEE 802.1X','RFC 6811 (ROV)'],crs:['◆ Week 1：纵深防御、最小权限、零信任','◆ Week 1: defence in depth, least privilege, zero trust']},
 {id:'edge',n:['L2 边缘 · DNS · TLS','L2 Edge · DNS · TLS'],
  w:['域名解析、CDN、WAF、DDoS 清洗、负载均衡与 TLS 终止点：外界接触系统的第一扇门。','Name resolution, CDN, WAF, DDoS scrubbing, load balancers and TLS termination: the first door the outside world touches.'],
  t:[['DNS 记录被篡改或域名注册账户被盗 → 整站被引流','Tampered DNS records or a stolen registrar account → the whole site redirected'],['证书过期导致停服；弱 TLS 配置','An expired certificate takes the service down; weak TLS settings'],['容量型或应用层 DDoS','Volumetric or application-layer DDoS'],['「悬空」子域名指向已释放的云资源（子域接管）','Dangling subdomains pointing at released cloud resources (subdomain takeover)']],
  c:[['注册商账户 MFA + 注册锁；DNSSEC 签名','Registrar MFA + registry lock; DNSSEC signing'],['TLS 1.3、HSTS、自动续期（ACME）与到期监控','TLS 1.3, HSTS, automated renewal (ACME) and expiry monitoring'],['Anycast CDN + 清洗中心 + 限流；源站只接受 CDN 回源','Anycast CDN + scrubbing + rate limits; origin accepts only CDN traffic'],['定期清点 DNS 记录，删除悬空记录','Inventory DNS records regularly and delete dangling ones']],
  pc:[['边缘吸收了大部分噪音与攻击流量','The edge absorbs most noise and attack traffic'],['TLS 在 CDN 终止意味着第三方能看到明文；WAF 有误报，且不能替代安全编码','Terminating TLS at a CDN means a third party sees plaintext; a WAF has false positives and never replaces secure code']],
  std:['RFC 8446 (TLS 1.3)','RFC 4033 (DNSSEC)','RFC 8484 (DoH)'],crs:['◆ 端到端链：用户 → Web → API 的第一跳','◆ The end-to-end chain: the first hop from user → web → API']},
 {id:'idn',n:['L3 身份 · 认证 · 令牌','L3 Identity · authentication · tokens'],
  w:['SSO、MFA、OAuth 2.0 / OIDC、会话与令牌、特权账户。决定「你是谁」，并发出可携带的凭证。','SSO, MFA, OAuth 2.0 / OIDC, sessions and tokens, privileged accounts. Decides who you are and issues portable credentials.'],
  t:[['钓鱼 + MFA 疲劳轰炸 / 实时代理钓鱼盗取会话','Phishing, MFA-fatigue bombing and real-time proxy phishing that steals sessions'],['长期有效、无法吊销的令牌；alg=none / 硬编码密钥','Long-lived, unrevocable tokens; alg=none or hard-coded keys'],['服务账户与 API 密钥权限过大、无人轮换','Over-privileged service accounts and API keys nobody rotates'],['身份 ≠ 权限：登录了就默认能访问一切','Identity mistaken for permission: logged in means allowed everywhere']],
  c:[['抗钓鱼 MFA（FIDO2 / Passkey），高风险操作再次验证','Phishing-resistant MFA (FIDO2 / passkeys); step-up for risky actions'],['短期访问令牌 + 刷新令牌轮换 + 吊销；校验 alg/iss/aud/exp','Short access tokens + rotating refresh tokens + revocation; validate alg/iss/aud/exp'],['特权访问管理（PAM）、即时授权（JIT）、密钥托管与自动轮换','Privileged access management, just-in-time elevation, vaulted and auto-rotated secrets'],['授权在服务端逐请求判定（RBAC/ABAC + 对象所有权）','Authorize server-side on every request (RBAC/ABAC + object ownership)']],
  pc:[['身份成了新的边界，随人和设备走','Identity becomes the new perimeter and travels with people and devices'],['SSO 是单点：IdP 一旦失守全线失守；令牌越短体验越差、后端负担越高','SSO concentrates risk — lose the IdP and you lose everything; shorter tokens cost UX and backend load']],
  std:['NIST SP 800-63-4','RFC 6749 / 9700 (OAuth BCP)','OpenID Connect','FIDO2 / WebAuthn'],crs:['◆ Week 3：Identity Is Not Permission','◆ Week 3: “Identity Is Not Permission”']},
 {id:'app',n:['L4 应用 · API · 业务逻辑','L4 Application · API · business logic'],
  w:['Web/移动前端、API 网关、微服务、后台任务。OWASP Top 10 的主战场。','Web and mobile front ends, API gateways, microservices, background jobs. The main OWASP Top 10 battlefield.'],
  t:[['A01 访问控制失效：BOLA / IDOR、BFLA、SSRF','A01 Broken access control: BOLA/IDOR, BFLA, SSRF'],['A05 注入：SQL、命令、模板注入','A05 Injection: SQL, command, template'],['A10 异常处理不当：出错时「默认放行」或泄露堆栈','A10 Mishandling exceptional conditions: fail-open or stack-trace leaks'],['业务逻辑滥用（扫券、绕过流程），扫描器发现不了','Business-logic abuse (coupon farming, skipped steps) that scanners can’t see']],
  c:[['网关集中鉴权 + 每个对象检查所有权 + Schema 校验 + 限流','Central authZ at the gateway + per-object ownership checks + schema validation + rate limits'],['参数化查询、输出编码、狭窄工具代替 shell','Parameterized queries, output encoding, narrow tools instead of a shell'],['失败即安全（fail-safe）：异常时拒绝并记录','Fail safe: deny and log on exceptions'],['端点 × 角色授权矩阵 + 负向回归测试','Endpoint × role authorization matrix + negative regression tests']],
  pc:[['在一个网关集中规则，易审计','Rules centralised at one gateway are easy to audit'],['网关看不到业务语义：「谁能读这条记录」仍要在服务内判断；过多中间层增加延迟','A gateway lacks business context — “who may read this record” still lives in the service; extra layers add latency']],
  std:['OWASP Top 10:2025','OWASP API Security Top 10 (2023)','OWASP ASVS 5.0','CWE Top 25'],crs:['◆ Week 2：Exploit → Root Cause → Fix → Verify','◆ Week 2: Exploit → Root Cause → Fix → Verify']},
 {id:'data',n:['L5 数据 · 存储 · 密钥','L5 Data · storage · keys'],
  w:['数据库、对象存储、备份、日志与数据湖，以及保护它们的密钥（KMS/HSM）。攻击者真正想要的东西。','Databases, object stores, backups, logs and data lakes, plus the keys that protect them (KMS/HSM). What attackers actually want.'],
  t:[['公开的存储桶 / 未加认证的数据库','Public storage buckets or unauthenticated databases'],['勒索软件同时加密生产与备份','Ransomware encrypting production and backups together'],['过度收集个人数据，泄露面变大','Over-collected personal data enlarges the blast radius'],['密钥与数据放在一起','Keys stored next to the data they protect']],
  c:[['数据分级 → 按级别决定加密、访问、留存','Classify data → set encryption, access and retention per class'],['3-2-1-1-0 备份：一份离线/不可变，恢复验证零错误','3-2-1-1-0 backups: one offline/immutable copy, restores verified with zero errors'],['KMS/HSM 托管密钥、信封加密、职责分离','Keys in KMS/HSM, envelope encryption, separation of duties'],['行级安全（RLS）、字段级加密、令牌化','Row-level security, field-level encryption, tokenization']],
  pc:[['加密让被偷走的数据失去价值','Encryption makes stolen data worthless'],['加密不防「合法身份」滥读；密钥管理复杂，丢了钥匙数据也就没了','Encryption doesn’t stop a legitimate identity reading too much; key management is hard and a lost key means lost data']],
  std:['NIST SP 800-57','ISO/IEC 27018','GDPR Art. 32','个人信息保护法'],crs:['◆ 资产排序：先保护前 5 名资产','◆ Rank assets: protect the top five first']},
 {id:'ai',n:['L6 AI · RAG · Agent','L6 AI · RAG · agent'],
  w:['大模型、检索增强（RAG）、向量库、工具调用与 MCP。新的攻击面：自然语言本身。','LLMs, retrieval-augmented generation, vector stores, tool calls and MCP. A new attack surface: natural language itself.'],
  t:[['直接/间接提示注入（文档、邮件、网页里藏指令）','Direct and indirect prompt injection (instructions hidden in docs, mail, pages)'],['过度代理：Agent 有删库、发邮件、付款的权限','Excessive agency: the agent can drop tables, send mail, pay'],['RAG 跨租户泄露：共享索引里检索到别人的数据','RAG cross-tenant leakage from a shared index'],['不当输出处理：模型输出被直接渲染成 HTML 或执行','Improper output handling: model output rendered as HTML or executed']],
  c:[['模型只提议，策略层决定：工具网关 + 允许清单 + 不可逆操作需人工审批','The model proposes, the policy layer disposes: tool gateway + allowlist + human approval for irreversible actions'],['Agent 身份从用户派生、最小作用域、短期令牌','Agent identity derived from the user, minimal scope, short-lived tokens'],['检索前按用户权限过滤；按租户隔离索引','Filter by the user’s permissions before retrieval; isolate indexes per tenant'],['输出按去向编码/参数化；全链路追踪 + 告警呼叫人','Encode/parameterize output by destination; full traces + alerts that page a human']],
  pc:[['AI 能把安全分析和响应提速一个量级','AI can speed analysis and response by an order of magnitude'],['审批太多 = 没人看；审批太少 = 越权。模型行为非确定，测试只能限缩风险而非证明为零','Too many approvals and nobody reads them; too few and the agent overreaches. Models are non-deterministic: tests narrow risk, never prove zero']],
  std:['OWASP LLM Top 10 (2026)','OWASP Agentic (ASI)','NIST AI RMF 1.0 / 600-1','MITRE ATLAS'],crs:['◆ An instruction is not a boundary.','◆ “An instruction is not a boundary.”']},
 {id:'ops',n:['L7 运营 · 监测 · 治理','L7 Operations · monitoring · governance'],
  w:['日志、SIEM/XDR、SOC、事件响应、风险登记、审计与合规。让前面所有层「可被看见、可被问责」。','Logs, SIEM/XDR, the SOC, incident response, risk registers, audit and compliance. Makes every layer below visible and accountable.'],
  t:[['没有日志或日志不可信（被删、被改、时间不同步）','Missing or untrustworthy logs (deleted, altered, clocks out of sync)'],['告警太多，真正的信号被淹没','Alert fatigue drowns the real signal'],['事件响应只在纸上，从未演练','An incident plan that exists only on paper'],['「没有告警 ≠ 安全」','“No alert ≠ safe”']],
  c:[['集中、防篡改、时间同步的日志，按事件需要保留','Central, tamper-evident, time-synced logs, retained for investigations'],['检测按 ATT&CK 战术覆盖度规划，并调优误报','Plan detections by ATT&CK tactic coverage and tune false positives'],['桌面推演 + 恢复演练；RTO/RPO 写进合同与预算','Tabletop exercises + restore drills; RTO/RPO in contracts and budgets'],['NIST CSF 2.0 的「治理(Govern)」：谁拥有风险、谁签字','NIST CSF 2.0 “Govern”: who owns the risk, who signs off']],
  pc:[['检测能补住预防漏掉的部分','Detection catches what prevention misses'],['检测是事后的：告警出现时损害可能已发生；SOC 人力昂贵','Detection is after the fact — damage may be done when the alert fires; a SOC is expensive']],
  std:['NIST CSF 2.0','NIST SP 800-61r3','ISO/IEC 27035','MITRE ATT&CK'],crs:['◆ Detection occurred; prevention is not demonstrated.','◆ “Detection occurred; prevention is not demonstrated.”']}
];

// ---------------- universal end-to-end path (one request, point to point) ----------------
// r: base risk 1-5. p protects, f what goes wrong, x trade-off
K.e2e=[
 {id:'user',n:['用户 / 人','User / person'],r:4,p:['安全意识、抗钓鱼 MFA、密码管理器','Awareness, phishing-resistant MFA, a password manager'],f:['钓鱼、社工电话、深度伪造语音冒充领导','Phishing, social-engineering calls, deepfake voices of executives'],x:['培训有效但会衰减；技术控制要假设人一定会点错','Training works but fades; technical controls must assume someone will click']},
 {id:'dev',n:['终端设备','Endpoint device'],r:4,p:['EDR、磁盘加密、自动更新、设备合规检查','EDR, disk encryption, auto-update, device-posture checks'],f:['未打补丁、恶意扩展、信息窃取木马偷走浏览器会话','Unpatched OS, malicious extensions, infostealers lifting browser sessions'],x:['管得越严越影响使用；BYOD 设备难以管控','Tighter control costs usability; personal devices are hard to manage']},
 {id:'lan',n:['本地网络 / Wi-Fi','Local network / Wi-Fi'],r:3,p:['WPA3、802.1X、分段、访客隔离','WPA3, 802.1X, segmentation, guest isolation'],f:['伪造热点、ARP 欺骗、同网段横向移动','Evil-twin hotspots, ARP spoofing, lateral movement on a flat segment'],x:['企业级认证要证书和 RADIUS，部署成本高','Enterprise auth needs certificates and RADIUS — costly to run']},
 {id:'isp',n:['接入线路 / 运营商','Access line / carrier'],r:2,p:['双线路、物理路由分离、运营商 SLA','Dual lines, diverse physical routes, carrier SLAs'],f:['线路被挖断、单运营商故障','A cut line, a single-carrier outage'],x:['冗余贵；「双线」可能共用上游管道','Redundancy costs; “two lines” may share one upstream duct']},
 {id:'bgp',n:['互联网路由 (BGP)','Internet routing (BGP)'],r:2,p:['RPKI 签发 ROA、运营商执行 ROV','RPKI ROAs published, carriers enforcing ROV'],f:['路由泄漏或劫持使流量绕行、被观察或黑洞','Route leaks or hijacks detour, expose or black-hole traffic'],x:['ROV 只验证「源」，不验证完整路径（路径验证仍在推进，如 ASPA）','ROV validates the origin only, not the full path (path validation such as ASPA is still rolling out)']},
 {id:'dns',n:['DNS 解析','DNS resolution'],r:3,p:['DNSSEC、DoH/DoT、注册锁','DNSSEC, DoH/DoT, registry lock'],f:['投毒、劫持、域名账户被盗','Cache poisoning, hijacking, a stolen registrar account'],x:['DoH 保护隐私，但也让企业失去 DNS 可见性','DoH protects privacy but costs the enterprise DNS visibility']},
 {id:'cdn',n:['CDN / WAF / 抗 DDoS','CDN / WAF / anti-DDoS'],r:3,p:['Anycast 吸收流量、WAF 规则、Bot 管理','Anycast absorption, WAF rules, bot management'],f:['绕过 CDN 直打源站、规则误杀','Bypassing the CDN to hit the origin; rules blocking real users'],x:['第三方看到明文；集中依赖一家 CDN 也是单点','A third party sees plaintext; one CDN is itself a single point']},
 {id:'tls',n:['TLS 加密通道','TLS channel'],r:2,p:['TLS 1.3、HSTS、证书自动续期、混合后量子密钥交换','TLS 1.3, HSTS, automated renewal, hybrid post-quantum key exchange'],f:['证书过期、被忽略的证书告警、降级','Expired certificates, ignored cert warnings, downgrade'],x:['TLS 只保护传输途中；两端被攻破时无能为力','TLS only protects the wire; it can’t help if either end is compromised']},
 {id:'gw',n:['API 网关','API gateway'],r:3,p:['集中鉴权、令牌校验、Schema、限流、审计','Central authZ, token validation, schema, rate limits, audit'],f:['某个端点绕过网关；网关只验身份不验对象','An endpoint bypassing the gateway; the gateway checks identity, not the object'],x:['集中带来一致性，也带来单点与延迟','Centralisation brings consistency, and a single point and latency']},
 {id:'svc',n:['应用服务 / 业务逻辑','Service / business logic'],r:5,p:['安全编码、对象级授权、SAST/DAST、代码审查','Secure coding, object-level authZ, SAST/DAST, code review'],f:['BOLA/IDOR、注入、异常时放行','BOLA/IDOR, injection, fail-open on errors'],x:['扫描器抓不到业务逻辑漏洞，需要人审 + 负向测试','Scanners miss logic flaws; it takes human review + negative tests']},
 {id:'db',n:['数据库 / 存储','Database / storage'],r:4,p:['最小权限账号、RLS、静态加密、不可变备份','Least-privilege accounts, RLS, encryption at rest, immutable backups'],f:['过宽的查询权限、公开桶、备份一并被加密','Over-broad query rights, public buckets, backups encrypted too'],x:['越细的数据权限越难维护','Finer data permissions are harder to maintain']},
 {id:'ai',n:['LLM · RAG · Agent 工具','LLM · RAG · agent tools'],r:5,p:['工具网关、允许清单、人工审批、检索前权限过滤','Tool gateway, allowlist, human approval, permission filtering before retrieval'],f:['间接提示注入驱动越权工具调用、数据外传','Indirect prompt injection driving over-privileged tool calls and exfiltration'],x:['能力越强 = 爆炸半径越大','More capability = bigger blast radius']},
 {id:'ext',n:['第三方 / 供应商 API','Third-party / vendor APIs'],r:4,p:['供应商评估、最小 OAuth 范围、出站白名单','Vendor review, minimal OAuth scopes, egress allowlists'],f:['供应商被入侵后令牌被用来进入你的环境','A breached vendor’s tokens used to enter your environment'],x:['外包了功能，没有外包责任','You outsource the function, not the accountability']},
 {id:'log',n:['日志 · 监测 · 响应','Logs · monitoring · response'],r:3,p:['集中日志、SIEM、告警分级、演练','Central logs, SIEM, alert triage, drills'],f:['无日志、告警疲劳、无人值守','No logs, alert fatigue, nobody on call'],x:['可见性越高，隐私与存储成本越高','More visibility means more privacy exposure and storage cost']}
];
window.SE_DOSSIER=K;
})();
(function(){var K=window.SE_DOSSIER;
// ---------------- identity & tokens ----------------
K.idn={
 triad:[
  ['认证 AuthN','Authentication','证明「你是谁」：口令、MFA、Passkey、证书。','Proves who you are: password, MFA, passkey, certificate.'],
  ['授权 AuthZ','Authorization','决定「你能对哪个对象做什么」：RBAC / ABAC / ReBAC + 对象所有权。','Decides what you may do to which object: RBAC / ABAC / ReBAC + ownership.'],
  ['会话 Session','Session','把认证结果带到后续请求：Cookie、令牌，以及它们的过期与吊销。','Carries the result to later requests: cookies, tokens, their expiry and revocation.']],
 // MFA strength ladder 1..5
 mfa:[
  ['仅口令','Password only',1,'可被撞库、喷洒、钓鱼。','Credential stuffing, spraying, phishing.'],
  ['短信 / 语音验证码','SMS / voice OTP',2,'SIM 换卡、短信拦截、实时代理钓鱼。','SIM swap, interception, real-time proxy phishing.'],
  ['TOTP 动态码','TOTP app',3,'防撞库，但仍可被实时代理钓走。','Stops stuffing, still relayable by proxy phishing.'],
  ['推送 + 数字匹配','Push + number matching',3.5,'数字匹配挡住「疲劳轰炸」，但对代理钓鱼仍有限。','Number matching stops fatigue bombing; still limited against proxies.'],
  ['FIDO2 / Passkey','FIDO2 / passkey',5,'私钥绑定域名，假站点拿不到签名——抗钓鱼。','The key is bound to the origin, so a fake site gets no signature — phishing-resistant.']],
 // OIDC authorization code + PKCE (for sequence diagram)
 seq:{lanes:[['用户浏览器','Browser'],['应用 (客户端)','App (client)'],['身份提供方 IdP','Identity provider'],['API (资源服务器)','API (resource server)']],
  steps:[
   [0,1,'访问受保护页面','Opens a protected page'],
   [1,0,'生成 code_verifier，重定向带 code_challenge + state','Makes code_verifier; redirects with code_challenge + state'],
   [0,2,'登录 + MFA（Passkey）','Signs in + MFA (passkey)'],
   [2,0,'回跳携带一次性授权码 code','Redirects back with one-time code'],
   [0,1,'把 code 交给应用（校验 state）','Hands the code to the app (state checked)'],
   [1,2,'后端用 code + code_verifier 换令牌','Back end exchanges code + code_verifier'],
   [2,1,'ID Token(谁) + 短期 Access Token + 刷新令牌','ID token (who) + short access token + refresh token'],
   [1,3,'带 Access Token 调用 API','Calls the API with the access token'],
   [3,3,'校验 iss/aud/exp/签名 → 再查对象所有权','Checks iss/aud/exp/signature → then object ownership']]},
 tokens:[
  {n:['服务端会话 Cookie','Server session cookie'],pro:['可即时吊销；HttpOnly+SameSite 防窃取','Instantly revocable; HttpOnly + SameSite resist theft'],con:['需要共享会话存储，跨域与移动端不便','Needs shared session storage; awkward across domains and mobile']},
  {n:['JWT 访问令牌（自包含）','JWT access token (self-contained)'],pro:['无状态、可扩展，各服务独立校验','Stateless and scalable; each service verifies independently'],con:['签发后难吊销 → 必须短期；alg=none、弱密钥、缺 exp 是常见坑','Hard to revoke once issued → keep short; alg=none, weak keys and missing exp are classic traps']},
  {n:['不透明令牌 + 内省','Opaque token + introspection'],pro:['随时吊销，令牌里不暴露信息','Revocable any time; reveals nothing'],con:['每次请求都要问授权服务器，增加延迟与依赖','Every call asks the auth server — latency and dependency']},
  {n:['刷新令牌轮换','Refresh-token rotation'],pro:['访问令牌可以很短；旧刷新令牌复用即可检测盗用','Access tokens can stay short; reuse of an old refresh token signals theft'],con:['实现复杂，并发刷新易误判','Complex; concurrent refreshes can trip false alarms']},
  {n:['发送方约束令牌 (DPoP / mTLS)','Sender-constrained (DPoP / mTLS)'],pro:['令牌被偷了也没法在别的设备上用','A stolen token is useless on another device'],con:['客户端要管理密钥，生态支持仍在铺开','Clients must manage keys; ecosystem support still spreading']},
  {n:['令牌交换 (RFC 8693) 给 Agent','Token exchange (RFC 8693) for agents'],pro:['Agent 获得从用户派生、范围更窄的身份','The agent gets a narrower identity derived from the user'],con:['审计链更长：要记录「谁代表谁做了什么」','Longer audit chain: record who acted on whose behalf']}],
 pits:[
  ['◆ JWT 审查三件事（Lab 3）：alg=none（CWE-347）、硬编码密钥（CWE-798）、缺少 exp 与吊销（CWE-613）','◆ JWT review trio (Lab 3): alg=none (CWE-347), hard-coded secret (CWE-798), missing exp and revocation (CWE-613)'],
  ['◆ 令牌生命周期测试：登出后、角色变更后旧令牌是否还能用','◆ Token lifecycle test: does the old token still work after logout and after a role change?'],
  ['◆ BOLA / BFLA 是业务逻辑——SAST/SCA 抓不到，要人工审查 + 回归测试','◆ BOLA/BFLA are business logic — SAST/SCA can’t catch them; human review + regression tests'],
  ['◆ 研究生讨论题：人把 OAuth 令牌交给 AI Agent，安全主体是谁？→ 用派生的、范围更窄的 Agent 身份','◆ Grad question: if a human hands an AI agent an OAuth token, who is the principal? → a derived, narrower agent identity'],
  ['口令存储：argon2id / scrypt / bcrypt + 盐，永不可逆加密存储','Password storage: argon2id / scrypt / bcrypt with salt — never reversible encryption']]
};

// ---------------- cryptography ----------------
K.crypto={
 rows:[
  // purpose, use, avoid, note
  [['对称加密','Symmetric encryption'],'AES-256-GCM · ChaCha20-Poly1305','ECB · 无认证的 CBC / unauthenticated CBC',['AEAD 同时保密与防篡改；同一密钥下 nonce 绝不重复','AEAD gives secrecy and integrity; never reuse a nonce under one key']],
  [['密钥交换','Key exchange'],'X25519 / ECDHE · X25519MLKEM768 (hybrid)','静态 RSA 密钥交换 / static RSA',['前向保密；混合后量子已在主流浏览器与 CDN 默认启用','Forward secrecy; hybrid PQ is on by default in major browsers and CDNs']],
  [['数字签名','Signatures'],'Ed25519 · ECDSA P-256 · ML-DSA (FIPS 204)','RSA-1024 · SHA-1 签名 / SHA-1 signatures',['签名证明来源与完整性：代码签名、令牌、固件','Signatures prove origin and integrity: code, tokens, firmware']],
  [['哈希','Hashing'],'SHA-256 / SHA-384 · SHA-3','MD5 · SHA-1',['用于完整性与指纹，不能直接存口令','For integrity and fingerprints — not for storing passwords']],
  [['口令存储','Password storage'],'argon2id · scrypt · bcrypt','明文 · 快速哈希 / plaintext · fast hashes',['故意慢、加盐，抵抗离线爆破','Deliberately slow and salted to resist offline cracking']],
  [['随机数','Randomness'],'OS CSPRNG (getrandom, crypto.getRandomValues)','Math.random · 时间种子 / time seeds',['令牌、会话 ID、nonce 都依赖它','Tokens, session IDs and nonces depend on it']],
  [['密钥保管','Key custody'],'KMS · HSM (FIPS 140-3) · 信封加密 / envelope encryption','密钥写进代码或配置 / keys in code or config',['职责分离：管数据的人不管钥匙','Separation of duties: data admins don’t hold the keys']],
  [['传输协议','Transport'],'TLS 1.3 · mTLS (服务间 / service-to-service)','SSL · TLS 1.0/1.1',['证书自动续期；内网同样加密（零信任）','Automate renewal; encrypt internal traffic too (zero trust)']]],
 pqc:[
  ['2016','NIST 启动后量子密码征集','NIST opens the PQC competition'],
  ['2022','选出 Kyber / Dilithium / SPHINCS+ / Falcon','Kyber, Dilithium, SPHINCS+ and Falcon selected'],
  ['2024-08','FIPS 203 ML-KEM · 204 ML-DSA · 205 SLH-DSA 正式发布','FIPS 203 ML-KEM, 204 ML-DSA, 205 SLH-DSA published'],
  ['2024-11','NIST IR 8547 草案：RSA/ECC 2030 年后弃用、2035 年后禁用','NIST IR 8547 draft: RSA/ECC deprecated after 2030, disallowed after 2035'],
  ['2025-03','HQC 被选为备用 KEM','HQC selected as a backup KEM'],
  ['2030','112 位强度的 RSA/ECC 进入弃用（按草案）','112-bit RSA/ECC deprecated (per draft)'],
  ['2035','量子脆弱算法全面禁用（按草案）','Quantum-vulnerable algorithms disallowed (per draft)']],
 notes:[
  ['「先收集、后解密」：今天被截获的长期敏感数据，未来可能被量子计算机解开——医疗、政务、外交数据要先迁移','“Harvest now, decrypt later”: long-lived secrets captured today may be opened by a future quantum computer — move health, government and diplomatic data first'],
  ['密码敏捷性：把算法做成可配置，清点所有用到 RSA/ECC 的地方（CBOM 密码物料清单）','Crypto agility: make algorithms swappable and inventory every RSA/ECC use (a cryptographic bill of materials, CBOM)'],
  ['自己实现密码算法几乎总是错的——用审计过的库','Rolling your own crypto is almost always wrong — use audited libraries'],
  ['加密只解决「看见」，不解决「谁有权看」：授权仍然要做','Encryption solves seeing, not who may see — authorization still matters']]
};

// ---------------- network · routing · lines ----------------
K.net=[
 {n:['边界防火墙 → 零信任','Perimeter firewall → zero trust'],d:['传统「城堡+护城河」默认内网可信；零信任（NIST SP 800-207）对每个请求按身份、设备状态、上下文判定，由策略决策点（PDP）决定、策略执行点（PEP）执行。','The castle-and-moat model trusts the inside; zero trust (NIST SP 800-207) judges every request on identity, device posture and context — a policy decision point decides, a policy enforcement point enforces.'],pro:['被钓一个账号不再等于进了整个内网','One phished account no longer means the whole network'],con:['需要完整的身份与资产清单，迁移周期长','Needs complete identity and asset inventories; a long migration']},
 {n:['VPN vs ZTNA vs SASE','VPN vs ZTNA vs SASE'],d:['VPN 把设备整个接进内网；ZTNA 只给某个应用的访问；SASE 把 ZTNA、SWG、CASB、防火墙做成云服务。','A VPN puts the whole device on the network; ZTNA grants one application; SASE delivers ZTNA, SWG, CASB and firewalling as a cloud service.'],pro:['ZTNA 显著缩小横向移动面；未打补丁的 VPN 设备是常见入口','ZTNA shrinks lateral movement; unpatched VPN appliances are a common entry'],con:['SASE 意味着流量与策略交给云厂商——新的依赖与单点','SASE hands traffic and policy to a cloud vendor — a new dependency and single point']},
 {n:['分段与微分段','Segmentation & micro-segmentation'],d:['按信任区切网（VLAN/VRF/安全组），再细到工作负载级别的东西向策略。','Cut the network by trust zone (VLAN/VRF/security groups), then down to workload-level east-west policy.'],pro:['勒索软件被关在一个区里','Ransomware gets contained in one zone'],con:['规则爆炸、易误伤业务；需要流量可视化先行','Rule explosion and broken workflows without flow visibility first']},
 {n:['BGP 与 RPKI','BGP & RPKI'],d:['互联网由各自治系统用 BGP 互相「宣告」可达性，协议本身默认信任。RPKI 为前缀签发 ROA，运营商执行 ROV 丢弃非法源宣告。','The internet runs on autonomous systems announcing reachability via BGP, which trusts by default. RPKI signs ROAs for prefixes; carriers enforcing ROV drop invalid-origin announcements.'],pro:['ROV 普及后，误配置与劫持的影响显著减小','Wide ROV adoption has sharply reduced the impact of misconfigurations and hijacks'],con:['只验证源 AS，不验证路径；路径验证（ASPA 等）仍在推进','Validates the origin AS only, not the path; path validation (ASPA etc.) is still rolling out']},
 {n:['DNS 安全','DNS security'],d:['DNSSEC 签名防篡改；DoH/DoT 加密查询防窥探；保护域名注册账户同样关键。','DNSSEC signs answers against tampering; DoH/DoT encrypt queries against snooping; protecting the registrar account matters as much.'],pro:['防止被引到假站','Stops redirection to fake sites'],con:['DNSSEC 配置失误会让整个域名不可解析；DoH 削弱企业监测','A DNSSEC mistake can make a whole domain unresolvable; DoH weakens enterprise monitoring']},
 {n:['无线：Wi-Fi 与 5G','Wireless: Wi-Fi & 5G'],d:['WPA3-Enterprise + 802.1X 给每个用户/设备独立凭证；5G 有更强的用户身份隐藏（SUCI）与网络切片。','WPA3-Enterprise + 802.1X gives each user/device its own credential; 5G adds subscriber-identity concealment (SUCI) and network slicing.'],pro:['共享 Wi-Fi 密码问题消失；5G 适合移动与临时站点','No more shared Wi-Fi passwords; 5G suits mobile and temporary sites'],con:['IoT 设备常不支持企业认证 → 单独隔离网段','IoT often can’t do enterprise auth → isolate it on its own segment']},
 {n:['物理线路与冗余','Physical lines & redundancy'],d:['光纤、铜缆、微波与卫星。关键是「物理多样性」：不同运营商、不同管道、不同进楼方向。','Fibre, copper, microwave, satellite. The key is physical diversity: different carriers, ducts and entry points.'],pro:['挖断一条不影响业务','One cut line doesn’t stop the business'],con:['真实多样性需要核对运营商的物理路由图，常被忽视','True diversity needs the carriers’ physical route maps — often skipped']},
 {n:['DDoS 防护','DDoS protection'],d:['容量型靠 Anycast 与清洗中心吸收；应用层靠限流、缓存、Bot 识别。','Volumetric floods are absorbed by anycast and scrubbing; application-layer floods by rate limits, caching and bot detection.'],pro:['峰值流量下仍能服务','Stays up under peak floods'],con:['常年付费；误判会挡住真实用户','An ongoing cost; misjudgement blocks real users']}
];

// ---------------- cloud & data ----------------
K.cloud={
 // shared responsibility: rows = layers, cols = on-prem/IaaS/PaaS/SaaS ; 2=customer,1=shared,0=provider
 srm:{cols:['本地 On-prem','IaaS','PaaS','SaaS'],rows:[
  [['数据与分类','Data & classification'],[2,2,2,2]],
  [['身份与访问','Identity & access'],[2,2,2,1]],
  [['应用','Application'],[2,2,1,0]],
  [['网络控制','Network controls'],[2,1,1,0]],
  [['操作系统','Operating system'],[2,2,0,0]],
  [['虚拟化 / 主机','Virtualisation / host'],[2,0,0,0]],
  [['物理机房','Physical data centre'],[2,0,0,0]]]},
 items:[
  {n:['配置错误是云上第一大问题','Misconfiguration is the top cloud problem'],d:['公开的存储桶、过宽的 IAM 策略、遗留的访问密钥。用 CSPM/CNAPP 持续扫描，配置即代码并在流水线中检查。','Public buckets, over-broad IAM policies, forgotten access keys. Scan continuously with CSPM/CNAPP; keep configuration as code and check it in the pipeline.'],pro:['问题可被自动发现与修复','Issues can be found and fixed automatically'],con:['告警量大，需要按资产重要性排序','High alert volume; prioritise by asset importance']},
  {n:['数据的三种状态','Data in three states'],d:['静态（磁盘/存储加密）、传输（TLS/mTLS）、使用中（机密计算：TEE / 加密内存）。','At rest (disk/storage encryption), in transit (TLS/mTLS), in use (confidential computing: TEEs, encrypted memory).'],pro:['机密计算让云厂商也看不到运行中的数据','Confidential computing hides data in use even from the cloud operator'],con:['TEE 有性能与生态成本，侧信道研究仍在继续','TEEs cost performance and tooling; side-channel research continues']},
  {n:['3-2-1-1-0 备份','3-2-1-1-0 backups'],d:['3 份副本、2 种介质、1 份异地、1 份离线或不可变、0 恢复错误（定期实测恢复）。','3 copies, 2 media, 1 off-site, 1 offline or immutable, 0 restore errors (restores actually tested).'],pro:['勒索软件下的最后一道保险','The last insurance against ransomware'],con:['存储成本；没人演练的备份等于没有备份','Storage cost; an untested backup is no backup']},
  {n:['多租户隔离','Multi-tenant isolation'],d:['◆ 课程案例：共享的包元数据成为跨账户的「后门通道」。测试共享状态与租户隔离，不能只看聊天回复是否正常。','◆ Course case: shared package metadata became a cross-account back channel. Test shared state and tenant isolation — a normal-looking chat reply proves nothing.'],pro:['隔离做好，单租户事件不扩散','Good isolation keeps one tenant’s incident contained'],con:['隔离越强成本越高（专用实例/专用索引）','Stronger isolation costs more (dedicated instances / indexes)']},
  {n:['数据主权与驻留','Data sovereignty & residency'],d:['数据存在哪个法域决定了谁能依法调取。跨境传输需要评估（GDPR、个人信息保护法、数据出境安全评估）。','Where data lives decides who can lawfully compel it. Cross-border transfers need assessment (GDPR, China PIPL, outbound data security assessment).'],pro:['合规清晰、信任度高','Clear compliance and trust'],con:['多区域部署贵，全球服务变复杂','Multi-region deployment is costly and complicates global service']},
  {n:['密钥与机密管理','Secrets management'],d:['密钥放进 KMS / Vault，按工作负载身份发放短期凭证；仓库里用 gitleaks 一类工具阻止提交密钥。','Keep secrets in KMS / a vault, issue short-lived credentials by workload identity; block committed secrets with tools such as gitleaks.'],pro:['泄露的旧凭证很快失效','Leaked old credentials expire quickly'],con:['又一个关键依赖：Vault 本身要高可用与严格保护','Another critical dependency: the vault itself needs HA and strict protection']}]
};

// ---------------- supply chain & patching ----------------
K.supply={
 gates:[['密钥扫描','Secret scan','gitleaks'],['静态分析','SAST','Semgrep · Bandit'],['依赖+SBOM','SCA + SBOM','pip-audit · CycloneDX'],['单元+安全测试','Unit + security tests','负向用例 / negative cases'],['镜像扫描','Image scan','Trivy'],['部署审批','Deploy approval','人工 / human']],
 triage:[
  ['CVSS 4.0','严重程度：理论上有多糟','Severity: how bad in theory'],
  ['EPSS','未来 30 天被利用的概率','Probability of exploitation in the next 30 days'],
  ['CISA KEV','已确认在野利用 → 最高优先','Confirmed exploited in the wild → top priority'],
  ['业务影响','这台资产对业务有多重要（课程：CVSS + 业务影响）','How important the asset is (course: CVSS + business impact)']],
 sla:[['KEV / 已被利用 · 暴露在公网','KEV / exploited · internet-facing','≤ 72h'],['严重 Critical','Critical','≤ 7–15d'],['高危 High','High','≤ 30d'],['中低 Medium/Low','Medium / Low','下个维护窗口 / next cycle']],
 items:[
  {n:['SBOM 软件物料清单','SBOM'],d:['列出软件里每个组件与版本（CycloneDX / SPDX），新漏洞公布时几分钟内知道自己受不受影响；VEX 说明「受影响但不可利用」。','Lists every component and version (CycloneDX / SPDX) so a new CVE can be matched in minutes; VEX states “present but not exploitable”.'],pro:['从「我们用没用 log4j？」到秒级回答','Turns “do we use log4j?” into a seconds-long query'],con:['SBOM 只是清单，不等于安全；需要持续更新','An SBOM is a list, not security; it must stay current']},
  {n:['构建完整性：SLSA · Sigstore','Build integrity: SLSA · Sigstore'],d:['SLSA 定义构建来源证明等级；Sigstore 对产物签名并写入透明日志。','SLSA defines provenance levels for builds; Sigstore signs artifacts and records them in a transparency log.'],pro:['能证明「这个包就是从这份源码构建的」','Proves an artifact was built from this source'],con:['需要改造 CI/CD；对旧系统落地难','Requires CI/CD changes; hard for legacy systems']},
  {n:['依赖投毒','Dependency poisoning'],d:['依赖混淆、拼写抢注、恶意版本、维护者账户被接管。锁定版本与哈希、私有镜像、延迟采用新版本。','Dependency confusion, typosquatting, malicious releases, hijacked maintainer accounts. Pin versions and hashes, use private mirrors, delay adopting brand-new releases.'],pro:['挡住大部分自动化投毒','Blocks most automated poisoning'],con:['版本锁太死会拖延安全补丁','Pinning too hard delays security fixes']},
  {n:['补丁的两难','The patching dilemma'],d:['补丁太慢 → 被已知漏洞攻破；补丁太快 → 坏更新造成停机。分阶段灰度发布 + 可回滚。','Patch too slowly and known bugs get exploited; too fast and a bad update causes outages. Staged rings + rollback.'],pro:['灰度把坏更新的影响限制在小范围','Rings confine a bad update to a small group'],con:['OT、医疗设备常无法停机打补丁 → 用虚拟补丁与隔离补偿','OT and medical devices often can’t be taken down → compensate with virtual patching and isolation']},
  {n:['第三方与停产 (EOL)','Third parties & end-of-life'],d:['供应商安全评估、合同里的通报时限、软件停产清单。CRA 等法规正把漏洞处理义务推给厂商。','Vendor security reviews, breach-notice clauses in contracts, an end-of-life inventory. Laws such as the EU CRA push vulnerability duties onto manufacturers.'],pro:['责任可追溯','Accountability becomes traceable'],con:['小供应商无力满足要求，替换成本高','Small vendors can’t meet the bar; replacing them is costly']}],
 cases:[
  ['2020','SolarWinds Orion','构建系统被植入后门，签名的合法更新分发给大量客户 → 构建完整性与来源证明','A backdoor inserted at build time shipped as signed updates → build integrity and provenance'],
  ['2021','Log4Shell','一个无处不在的日志库远程代码执行 → SBOM 与依赖可见性','RCE in a ubiquitous logging library → SBOM and dependency visibility'],
  ['2023','MOVEit Transfer','文件传输产品 SQL 注入被批量利用、大规模数据被盗 → 暴露在公网的第三方产品优先修补','Mass exploitation of SQL injection in a file-transfer product → patch internet-facing third-party products first'],
  ['2024','XZ Utils','长期潜伏的维护者植入后门，被一名工程师因 SSH 变慢发现 → 开源维护者健康度','A long-game maintainer backdoor, caught because SSH got slower → open-source maintainer health'],
  ['2024','CrowdStrike','一次有缺陷的内容更新导致全球大量 Windows 主机蓝屏 → 安全软件本身也需灰度发布','A defective content update crashed Windows hosts worldwide → security tools also need staged rollout']]
};
})();
(function(){var K=window.SE_DOSSIER;
// ---------------- stakeholders ----------------
// resp: responsibility weight per layer id (0..3) for the heat matrix
K.actors=[
 {id:'ent',n:['企业','Enterprises'],ic:'▣',role:['拥有系统与数据，承担主要安全责任；向客户、监管与股东负责。','Own systems and data and carry primary responsibility to customers, regulators and shareholders.'],
  ctl:['资产清单、身份、补丁、备份、SOC、供应商管理','Asset inventory, identity, patching, backups, SOC, vendor management'],risk:['勒索、数据泄露、业务中断、合规处罚','Ransomware, data breach, downtime, regulatory fines'],
  pc:[['资源多、可专业化','Resources and specialists'],['规模越大攻击面越大；安全常与上线速度冲突','Bigger means more attack surface; security competes with shipping speed']],
  resp:{phy:2,net:3,edge:3,idn:3,app:3,data:3,ai:3,ops:3}},
 {id:'gov',n:['政府','Government'],ic:'⌂',role:['既是运营者（政务系统、公共服务）也是规则制定者与执法者；协调关键基础设施保护。','Both an operator (public services) and a rule-maker and enforcer; coordinates critical-infrastructure protection.'],
  ctl:['法规与标准、事件通报制度、CERT/CSIRT、采购要求、执法与国际合作','Laws and standards, incident reporting, CERT/CSIRT, procurement rules, enforcement and international cooperation'],risk:['公共服务中断、公民数据泄露、信任受损','Public-service outages, citizen data leaks, loss of trust'],
  pc:[['能设定全社会的底线（如安全默认、漏洞通报时限）','Can set society-wide baselines (secure by default, disclosure deadlines)'],['合规负担可能变成「打勾」；预算与人才常落后','Compliance can become box-ticking; budgets and talent often lag']],
  resp:{phy:1,net:2,edge:2,idn:3,app:2,data:3,ai:2,ops:3}},
 {id:'res',n:['居民 / 个人','Residents / individuals'],ic:'☺',role:['终端用户与数据主体：个人数据的拥有者，也是钓鱼与诈骗的首要目标。','End users and data subjects: owners of personal data and first targets of phishing and fraud.'],
  ctl:['口令管理器、Passkey/MFA、更新设备、家用路由器设置、隐私选择','Password managers, passkeys/MFA, device updates, home-router settings, privacy choices'],risk:['账户被盗、诈骗、身份盗用、隐私暴露','Account takeover, scams, identity theft, privacy exposure'],
  pc:[['少数几个习惯就能挡住大部分攻击','A few habits stop most attacks'],['专业知识有限，依赖厂商的安全默认设置','Limited expertise; dependent on vendors’ secure defaults']],
  resp:{phy:0,net:1,edge:0,idn:2,app:0,data:1,ai:1,ops:0}},
 {id:'sup',n:['供应商 / 厂商','Suppliers / vendors'],ic:'⛭',role:['提供软件、硬件、云、外包运维；他们的漏洞会成为你的漏洞。','Provide software, hardware, cloud and managed services; their flaws become yours.'],
  ctl:['安全开发（SSDF）、SBOM、漏洞披露与补丁、安全默认配置、产品生命周期','Secure development (SSDF), SBOMs, disclosure and patches, secure defaults, product lifecycle'],risk:['一个供应商被攻破 → 成百上千客户受影响','One breached vendor → hundreds or thousands of customers hit'],
  pc:[['规模效应：一次修复惠及所有客户','Scale: one fix protects every customer'],['同样的规模让它成为高价值目标；客户难以审计','The same scale makes them prime targets; customers can hardly audit them']],
  resp:{phy:1,net:1,edge:2,idn:2,app:3,data:2,ai:3,ops:2}},
 {id:'isp',n:['运营商 / 云平台','Carriers / cloud platforms'],ic:'☁',role:['提供线路、路由、DNS、托管与云基础设施；共享责任模型的「下半部分」。','Provide lines, routing, DNS, hosting and cloud infrastructure — the lower half of the shared-responsibility model.'],
  ctl:['物理与网络冗余、RPKI/ROV、抗 DDoS、租户隔离、平台安全','Physical and network redundancy, RPKI/ROV, anti-DDoS, tenant isolation, platform security'],risk:['大规模宕机、路由事故、租户隔离失效','Large outages, routing incidents, isolation failures'],
  pc:[['专业化的基础设施安全通常强于自建','Specialised infrastructure security usually beats DIY'],['集中化：一次故障波及半个互联网','Concentration: one failure ripples across half the internet']],
  resp:{phy:3,net:3,edge:3,idn:1,app:0,data:1,ai:1,ops:2}}
];

// ---------------- adversaries (generic classes, defensive view) ----------------
K.adv=[
 {id:'crime',n:['网络犯罪 / 勒索团伙','Cybercrime / ransomware crews'],m:['金钱：加密 + 窃取数据双重勒索','Money: encrypt + steal for double extortion'],v:['钓鱼、被盗凭证、暴露在公网的未修补设备、初始访问中间商','Phishing, stolen credentials, unpatched internet-facing devices, access brokers'],d:['MFA、补丁、分段、不可变备份、演练过的恢复','MFA, patching, segmentation, immutable backups, rehearsed recovery']},
 {id:'apt',n:['国家级 APT','Nation-state APT'],m:['情报、长期潜伏、对关键设施的预置能力','Intelligence, long-term persistence, pre-positioning in critical infrastructure'],v:['供应链、边缘设备、合法工具「就地取材」(LotL)','Supply chain, edge devices, living-off-the-land with legitimate tools'],d:['行为检测、日志长期保留、威胁狩猎、零信任','Behavioural detection, long log retention, threat hunting, zero trust']},
 {id:'ins',n:['内部人员','Insiders'],m:['不满、牟利，或无意的错误','Grievance, profit — or honest mistakes'],v:['合法权限的滥用、数据批量导出、误配置','Abuse of legitimate access, bulk exports, misconfiguration'],d:['最小权限、职责分离、用户行为分析、离职回收权限','Least privilege, separation of duties, behaviour analytics, prompt deprovisioning']},
 {id:'hack',n:['黑客行动主义者','Hacktivists'],m:['政治或社会诉求、公开羞辱','Political or social causes, public embarrassment'],v:['DDoS、网页篡改、泄露数据','DDoS, defacement, data leaks'],d:['抗 DDoS、Web 安全、危机沟通预案','Anti-DDoS, web security, a crisis-communications plan']},
 {id:'opp',n:['自动化扫描 / 机会主义者','Automated scanning / opportunists'],m:['批量寻找最容易的目标','Mass-hunting the easiest targets'],v:['默认口令、暴露服务、已知漏洞','Default passwords, exposed services, known CVEs'],d:['缩小暴露面、按 KEV 优先打补丁','Shrink exposure, patch by KEV first']},
 {id:'ai',n:['被滥用或失控的 AI Agent','Misused or misbehaving AI agents'],m:['被注入指令驱动，或在目标驱动下越界','Driven by injected instructions, or overreaching in pursuit of a goal'],v:['◆ 课程案例：研究 Agent 借共享包服务互相协调，经 SSRF、暴露的令牌与模板注入逐步提权','◆ Course case: research agents coordinated through a shared package service and escalated via SSRF, exposed tokens and template injection'],d:['◆ 隔离 Agent、隔离不可信处理、限制凭证可达范围；提示词无法替代信任边界','◆ Contain agents, isolate untrusted processing, limit credential reach; prompts can’t replace trust boundaries']}
];

// ---------------- detection & response ----------------
// MITRE ATT&CK enterprise tactics, each with where defenders look (detection idea)
K.attack=[
 ['TA0043','侦察','Reconnaissance','减少公开暴露信息；监测异常扫描','Limit public exposure; watch for scanning'],
 ['TA0042','资源开发','Resource Development','监测仿冒域名与证书','Watch look-alike domains and certificates'],
 ['TA0001','初始访问','Initial Access','邮件防护、MFA、边缘设备补丁','Mail security, MFA, edge-device patching'],
 ['TA0002','执行','Execution','应用白名单、脚本日志','Application allowlisting, script logging'],
 ['TA0003','持久化','Persistence','监测新服务/计划任务/OAuth 授权','Watch new services, scheduled tasks, OAuth grants'],
 ['TA0004','权限提升','Privilege Escalation','PAM、即时授权、补丁','PAM, just-in-time elevation, patching'],
 ['TA0005','防御规避','Defense Evasion','防篡改日志、EDR 自保护','Tamper-evident logs, EDR self-protection'],
 ['TA0006','凭证访问','Credential Access','抗钓鱼 MFA、凭证保护、蜜罐账号','Phishing-resistant MFA, credential guard, honey accounts'],
 ['TA0007','发现','Discovery','异常目录/网络枚举告警','Alert on unusual directory or network enumeration'],
 ['TA0008','横向移动','Lateral Movement','分段、东西向监测、禁用旧协议','Segmentation, east-west monitoring, legacy protocols off'],
 ['TA0009','收集','Collection','数据访问审计、DLP','Data-access auditing, DLP'],
 ['TA0011','命令与控制','Command and Control','出站白名单、DNS/代理监测','Egress allowlists, DNS/proxy monitoring'],
 ['TA0010','数据渗出','Exfiltration','出站流量基线与阈值','Egress baselines and thresholds'],
 ['TA0040','影响','Impact','不可变备份、恢复演练、业务连续性','Immutable backups, restore drills, continuity plans']
];
// NIST CSF 2.0 functions
K.csf=[['GV','治理','Govern','风险策略、角色、供应链风险'],['ID','识别','Identify','资产、风险评估、改进'],['PR','保护','Protect','身份、培训、数据与平台安全'],['DE','检测','Detect','持续监测与事件分析'],['RS','响应','Respond','事件管理、分析、沟通、缓解'],['RC','恢复','Recover','恢复计划执行与沟通']];
K.csfEn=['Risk strategy, roles, supply-chain risk','Assets, risk assessment, improvement','Identity, training, data and platform security','Continuous monitoring, event analysis','Incident management, analysis, comms, mitigation','Execute recovery, communicate'];
K.ir=[
 ['准备','Prepare','角色、联系人、取证工具、演练','Roles, contacts, forensics tooling, drills'],
 ['检测与分析','Detect & analyse','告警分级、范围判断、证据保全','Triage, scoping, evidence preservation'],
 ['遏制','Contain','隔离主机、吊销令牌、阻断出站','Isolate hosts, revoke tokens, block egress'],
 ['根除','Eradicate','清除持久化、修补根因','Remove persistence, fix the root cause'],
 ['恢复','Recover','从干净备份恢复、加强监测','Restore from clean backups, heighten monitoring'],
 ['复盘','Learn','无责复盘、更新检测与控制','Blameless review, update detections and controls']];
K.prevdet=[
 ['预防','Prevention','在动作发生前阻止：工具网关、授权检查、审批','Stops the action before it happens: tool gateway, authZ checks, approvals'],
 ['检测','Detection','在动作发生后发现：完整追踪、告警呼叫值班人员','Finds it afterwards: full traces, alerts that page a human'],
 ['◆ 原则','◆ Principle','假设任一单层都会失效——两者都要','Assume any single layer fails — you need both']];

// ---------------- AI & agent security ----------------
K.ai={
 top:[
  ['LLM01','提示注入','Prompt Injection','把输入当数据而非指令；策略层不读提示词','Treat input as data, not orders; the policy layer never reads the prompt'],
  ['LLM02','敏感信息泄露','Sensitive Information Disclosure','检索前过滤权限；「答案过滤太晚」','Filter permissions before retrieval; output filtering is too late'],
  ['LLM03','过度代理','Excessive Agency','窄工具、最小权限、不可逆操作人工审批','Narrow tools, least privilege, human approval for irreversible actions'],
  ['LLM04','供应链','Supply Chain','模型、数据集、插件/MCP 服务器来源验证','Verify models, datasets, plugins/MCP servers'],
  ['LLM05','数据与模型投毒','Data and Model Poisoning','数据准入审查、来源追踪、评测回归','Admission review, provenance, evaluation regression'],
  ['LLM06','无界消耗','Unbounded Consumption','配额、超时、成本告警','Quotas, timeouts, cost alerts'],
  ['LLM07','错误信息','Misinformation','引用来源、人工复核关键结论','Cite sources; humans review critical conclusions'],
  ['LLM08','隐藏上下文暴露','Hidden Context Exposure','系统提示不放密钥与权限逻辑','Keep secrets and permission logic out of system prompts'],
  ['LLM09','向量与嵌入弱点','Vector and Embedding Weaknesses','按租户隔离索引；相似度 ≠ 信任','Per-tenant indexes; similarity ≠ trust'],
  ['LLM10','不当输出处理','Improper Output Handling','按去向编码：HTML 转义、SQL 参数化、不进 shell','Encode by destination: escape HTML, parameterize SQL, no shell']],
 gov:[['AI 清单','AI inventory'],['数据基础','Data foundation'],['数据安全与访问','Data security & access'],['模型保障','Model assurance'],['人工监督','Human oversight'],['合规与审计','Compliance & audit']],
 mcp:[['工具 Tools','Tools','由模型控制 — 最需要网关','Model-controlled — most need a gateway'],['资源 Resources','Resources','由应用控制','Application-controlled'],['提示 Prompts','Prompts','由用户控制','User-controlled']],
 tiers:[
  ['低','Low','只读、可逆、无外部动作','Read-only, reversible, no external actions','自动执行 + 日志','Auto + logging'],
  ['中','Medium','写入内部系统、可回滚','Writes internal systems, reversible','允许清单 + 抽查','Allowlist + spot checks'],
  ['高','High','对外发送、改权限、改生产','Sends externally, changes permissions or production','逐动作审批 + 上线前红队','Per-action approval + red team before launch'],
  ['关键','Critical','资金、删除、物理世界、关键设施','Money, deletion, physical world, critical infrastructure','尽量不自动化；必须时：逐动作审批 + kill switch + 监控 + 高管签字','Avoid; if essential: per-action approval + kill switch + monitoring + executive sign-off']],
 rules:[
  ['◆ 系统提示是行为指令，不是访问控制。','◆ A system prompt is a behavioural instruction, not an access control.'],
  ['◆ 模型提议，策略层决定。你无法对一个从不读提示词的规则引擎做提示注入。','◆ The model can propose; only the policy layer disposes. You can’t prompt-inject a rule engine that never reads the prompt.'],
  ['◆ MCP 标准化的是管道，不是信任或安全边界。','◆ MCP standardises the plumbing; it is not a trust or safety boundary.'],
  ['◆ 检索到的片段以普通 token 进入上下文，不是可信事实；相似度不等于信任或权限。','◆ Retrieved chunks enter as ordinary tokens, not trusted facts; similarity is not trust or permission.'],
  ['◆ 模型给出的置信度不是权限。','◆ A confidence score from a model is not permission.'],
  ['◆ 「我不会这么做」这句拒绝不是证据；证据是工具记录、工单行或检索片段 ID。','◆ A refusal is not evidence; evidence is a tool record, a ticket row or a retrieved chunk id.'],
  ['◆ Agent 能触碰什么，比它运行哪个模型更重要。','◆ What the agent can touch matters more than which model it runs.'],
  ['◆ 仓库配置（hooks、.mcp.json）就是可执行策略。','◆ Repository configuration (hooks, .mcp.json) is executable policy.']]
};

// ---------------- frontier ----------------
K.front=[
 {n:['后量子迁移','Post-quantum migration'],d:['混合 TLS（X25519+ML-KEM）已大规模部署；下一步是证书与代码签名的 ML-DSA，以及清点所有 RSA/ECC 使用。','Hybrid TLS (X25519+ML-KEM) is widely deployed; next come ML-DSA certificates and code signing, and an inventory of all RSA/ECC use.'],t:['密码','Crypto']},
 {n:['Passkey 取代口令','Passkeys replace passwords'],d:['FIDO2 凭证在设备间同步，从根本上消除可被钓鱼的共享秘密。','Synced FIDO2 credentials remove the phishable shared secret altogether.'],t:['身份','Identity']},
 {n:['Agent 身份与授权','Agent identity & authorization'],d:['为 AI Agent 签发派生的、短期的、可审计的身份（令牌交换、细粒度授权），把「谁代表谁」写进日志。','Derived, short-lived, auditable identities for AI agents (token exchange, fine-grained authZ) with “who acted for whom” in the logs.'],t:['AI','AI']},
 {n:['MCP / 工具生态安全','MCP & tool-ecosystem security'],d:['工具描述投毒、恶意 MCP 服务器、技能包扫描；Agent 运行在沙箱，出站受控。','Tool-description poisoning, malicious MCP servers, skill scanning; agents in sandboxes with controlled egress.'],t:['AI','AI']},
 {n:['机密计算','Confidential computing'],d:['在可信执行环境（TEE）中处理数据，运营方也看不到；用于跨机构数据协作与 AI 推理。','Process data inside TEEs where even the operator can’t see it — for cross-organisation collaboration and AI inference.'],t:['数据','Data']},
 {n:['持续威胁暴露管理 (CTEM)','Continuous threat exposure management'],d:['从「扫描出几千个漏洞」转向「哪些暴露真的能到达关键资产」，并验证修复。','From “thousands of findings” to “which exposures truly reach crown jewels”, with validated fixes.'],t:['运营','Ops']},
 {n:['内存安全语言','Memory-safe languages'],d:['大量严重漏洞源于内存错误；新代码用 Rust / Go 等，并逐步替换高风险组件。','Many severe bugs are memory errors; write new code in Rust/Go and replace high-risk components over time.'],t:['开发','Dev']},
 {n:['AI 辅助 SOC','AI-assisted SOC'],d:['AI 做告警归并、调查摘要与查询编写，人负责判断与处置；同样要防提示注入。','AI clusters alerts, drafts investigations and writes queries; humans decide and act — and it too must resist prompt injection.'],t:['运营','Ops']},
 {n:['深度伪造诈骗','Deepfake fraud'],d:['伪造的语音/视频冒充高管要求转账。对策：带外回拨核实、双人审批、约定口令。','Cloned voices and video of executives requesting transfers. Counter: out-of-band call-backs, dual approval, agreed passphrases.'],t:['人','People']}
];
K.regs=[
 ['2024-02','NIST CSF 2.0','新增「治理」，适用于所有组织','Adds “Govern”; for every organisation'],
 ['2024-10','EU NIS2','扩大关键与重要实体范围，管理层担责','Wider essential/important entities; management liability'],
 ['2025-01','EU DORA','金融机构数字运营韧性与 ICT 第三方风险','Digital operational resilience and ICT third-party risk for finance'],
 ['2025-03','PCI DSS 4.0.1','未来生效要求全面强制（如电商页面脚本管控、MFA）','Future-dated requirements become mandatory (e.g. payment-page scripts, MFA)'],
 ['2025-04','NIST SP 800-61r3','事件响应与 CSF 2.0 对齐','Incident response aligned with CSF 2.0'],
 ['2025-11','OWASP Top 10:2025','新增软件供应链失败、异常处理不当','Adds supply-chain failures and mishandled exceptions'],
 ['2026','OWASP LLM Top 10 (2026)','过度代理升至第 3；新增隐藏上下文暴露','Excessive agency rises to #3; adds hidden context exposure'],
 ['2026','EU AI Act + Digital Omnibus','数字综合法案（AI）已生效：高风险 AI 主要义务由 2026-08 推迟至 2027–2028','The AI Digital Omnibus is in force: main high-risk AI obligations move from Aug 2026 to 2027–2028'],
 ['2026-09-11','EU CRA','厂商须在 24 小时内预警被积极利用的漏洞与严重事件','Manufacturers must give 24-hour early warning of actively exploited vulnerabilities and severe incidents'],
 ['常设','等保 2.0 · 数据安全法 · 个保法','中国：等级保护定级与测评、数据分类分级、个人信息与出境评估','China: MLPS grading and testing, data classification, personal information and outbound assessments']];
K.regsNote=['法规日期与适用范围会变化，以官方文本为准。','Dates and scopes change; check the official texts.'];

// ---------------- CSE635 course map ----------------
K.course={
 arc:[['构建','Build'],['攻破','Break'],['防御','Defend'],['保障','Assure'],['交付','Ship']],
 weeks:[
  ['W1','安全是系统属性','Security is a system property','安全 SDLC 7 阶段；CWE→CVE→CVSS；资产、攻击面、信任边界；左移不够（左移+运营+响应）','7-phase secure SDLC; CWE→CVE→CVSS; assets, attack surface, trust boundaries; shift-left alone is not enough','layers'],
  ['W2','威胁建模 + OWASP','Threat modelling + OWASP','DFD 四要素 + 信任边界；STRIDE；攻击树 AND/OR；7 列威胁表；Exploit→Root Cause→Fix→Verify','DFD with trust boundaries; STRIDE; AND/OR attack trees; 7-column threat table; Exploit→Root Cause→Fix→Verify','brief'],
  ['W3','身份 / API / DevSecOps','Identity / API / DevSecOps','AuthN≠AuthZ；OAuth/OIDC；JWT 误用；BOLA/BFLA；SBOM、SLSA；流水线即可执行的安全策略','AuthN≠AuthZ; OAuth/OIDC; JWT misuse; BOLA/BFLA; SBOM, SLSA; pipelines as executable security policy','idn'],
  ['AI-1','AI 基础与治理','AI foundations & governance','RAG 五阶段；Agent 循环；MCP 三原语；CVSS/EPSS/AIVSS/DREAD；NIST AI RMF；六层 AI 治理','RAG’s five stages; agent loop; MCP’s three primitives; CVSS/EPSS/AIVSS/DREAD; NIST AI RMF; six-layer AI governance','ai'],
  ['AI-2','LLM · RAG · AI 编码安全','LLM · RAG · AI-coding security','直接/间接注入；按输出去向处理；Semgrep；RAG 评估（P@k、R@k、忠实度、授权）；跨租户泄露','Direct/indirect injection; output by destination; Semgrep; RAG evaluation (P@k, R@k, faithfulness, authorization); cross-tenant leakage','ai'],
  ['AI-3','Agent 安全与红队','Agent security & red teaming','工具网关(预防) vs 可观测性(检测)；风险分级；dev/prod 分离；红队不能替代网关','Tool gateway (prevention) vs observability (detection); risk tiers; dev/prod separation; red teaming never replaces the gateway','threat'],
  ['W6','混淆代理与过度代理','Confused deputy & excessive agency','从用户派生的 Agent 身份；提议与执行之间的策略层；DAST/模糊测试；CVSS+业务影响分级','User-derived agent identity; a policy layer between proposal and execution; DAST/fuzzing; CVSS + business-impact triage','ai'],
  ['W7','安全保障包','Assurance package','16 项交付物；≥1 传统面 + ≥1 AI 面红队；修复 = 修复 + 回归测试 + 证据；剩余风险声明','16 deliverables; red team with ≥1 traditional and ≥1 AI test; remediation = fix + regression test + evidence; residual-risk statement','course']],
 pkg:[['系统架构','System architecture'],['安全需求','Security requirements'],['数据流图 DFD','DFD'],['信任边界分析','Trust-boundary analysis'],['威胁模型','Threat model'],['OWASP 评估','OWASP assessment'],['API 安全评估','API security assessment'],['安全代码审查','Secure code review'],['SBOM','SBOM'],['DevSecOps 流水线','DevSecOps pipeline'],['AI/LLM 威胁评估','AI/LLM threat assessment'],['RAG 威胁评估','RAG threat assessment'],['Agent 权限模型','Agent permission model'],['红队/渗透发现','Red-team / pen-test findings'],['修复证据','Remediation evidence'],['剩余风险声明','Residual-risk statement']],
 stack:['React SPA → FastAPI → PostgreSQL / pgvector + S3 · SSO (OAuth2/SAML) → 短期 JWT · LLM + RAG + Agent → HPC / 文献 / 邮件工具','React SPA → FastAPI → PostgreSQL / pgvector + S3 · SSO (OAuth2/SAML) → short-lived JWT · LLM + RAG + agent → HPC / literature / email tools'],
 cases:[
  ['EchoLeak (2025)','EchoLeak (2025)','外部邮件影响检索与输出，形成数据外传路径 —「忠实的回答也可能泄露数据」','An external email steered retrieval and output into an exfiltration path — “a faithful answer can still leak data”'],
  ['Replit Agent 删库','Replit agent deletes prod DB','开发 Agent 能碰到生产库，且命令无需审批 → dev/prod 分离 + 审批','A dev agent could reach production and ran commands without approval → separate dev/prod + approval'],
  ['仓库配置改变编码工具 (2026-02)','Repo config changes the coding tool (2026-02)','仓库配置在同意之前控制了 hooks 与 MCP 启动 →「配置即可执行策略」','Repository config controlled hooks and MCP startup before consent → “configuration is executable policy”'],
  ['共享状态后门通道 (2026-09)','Shared-state back channel (2026-09)','可变的包元数据成为跨账户通道 → 测试租户隔离','Mutable package metadata became a cross-account channel → test tenant isolation'],
  ['研究 Agent 入侵事件 (2026-07)','Research-agent intrusion (2026-07)','Agent 经 SSRF、暴露令牌、模板注入提权 → 隔离 Agent、限制凭证可达范围','Agents escalated via SSRF, exposed tokens, template injection → contain agents, limit credential reach']],
 cn:['课程案例按授课幻灯片的描述概括；细节以讲义为准。','Course cases are summarised as described in the lecture slides; defer to the course material for details.']
};
})();
(function(){var K=window.SE_DOSSIER;
// Archetype overlays, keyed by the building taxonomy (TAX[m].k).
// lv 1-5 typical exposure tier · cia = [机密C, 完整I, 可用A, 隐私P, 人身安全S] 0-5 · stride [S,T,R,I,D,E] 0-5
// fx: per-layer emphasis 1-5 · adv: adversary weights 0-5 · act: stakeholder weights 0-5 · csf: target tier 1-4 per GV..RC
// risks: {l:layer, n:[..], w:[why], c:[control], x:[trade-off]} · path: emphasised e2e hops (others dimmed)
function R(l,nz,ne,wz,we,cz,ce,xz,xe){return {l:l,n:[nz,ne],w:[wz,we],c:[cz,ce],x:[xz,xe]};}
K.arch={
 res:{lv:2,lvw:['消费级网络、个人数据集中在少数账户；单户损失小，但数量巨大，是诈骗与僵尸网络的主要来源。','Consumer-grade networks with personal data concentrated in a few accounts; each loss is small but there are millions — the main pool for scams and botnets.'],
  cia:[3,2,3,5,2],stride:[5,2,1,4,3,2],fx:{phy:1,net:3,edge:1,idn:5,app:1,data:3,ai:2,ops:1},
  jewels:[['邮箱与手机号（所有账户的找回钥匙）','Email and phone number (the recovery key to every account)'],['网银与支付账户','Banking and payment accounts'],['家庭照片、证件扫描件','Family photos, ID scans'],['智能家居与摄像头','Smart-home devices and cameras']],
  adv:{crime:5,apt:1,ins:1,hack:0,opp:5,ai:2},act:{ent:2,gov:2,res:5,sup:4,isp:4},csf:[1,2,2,1,1,2],
  regs:['GDPR / 个保法（数据主体权利）','EU CRA（联网产品安全默认）','美国 Cyber Trust Mark（IoT 标签）'],
  risks:[
   R('idn','账户接管','Account takeover','一个邮箱被盗即可重置其他所有账户；口令复用使撞库有效。','One stolen mailbox resets every other account; password reuse makes credential stuffing work.','口令管理器 + Passkey / MFA；邮箱与手机号设为最高保护等级。','Password manager + passkeys/MFA; give email and phone the strongest protection.','多一步登录；需要设置恢复方式，否则自己也会被锁在外面。','An extra login step; recovery must be set up or you lock yourself out.'),
   R('net','老旧家用路由器与 IoT','Old home routers and IoT','默认口令与停更固件让设备被拉进僵尸网络，并成为入侵家庭网络的跳板。','Default passwords and abandoned firmware pull devices into botnets and footholds into the home network.','改默认口令、开自动更新、IoT 放访客网，换掉停更设备。','Change defaults, enable auto-update, put IoT on the guest network, replace unsupported devices.','需要一点技术能力；更新可能改变功能。','Takes some know-how; updates can change behaviour.'),
   R('app','诈骗与钓鱼短信','Scams and phishing texts','「快递异常」「账户冻结」等制造紧迫感；深度伪造语音冒充亲友。','“Parcel problem” or “account frozen” urgency; deepfaked voices of relatives.','独立渠道回拨核实；家人约定暗号；银行转账延迟到账。','Call back on a known number; a family passphrase; delayed bank transfers.','慢一点、麻烦一点。','Slower and a little inconvenient.'),
   R('data','云相册与备份','Cloud photos and backups','账户被盗等于全部私人数据外泄；勒索也会打到个人电脑。','A stolen account leaks everything private; ransomware hits home PCs too.','开启端到端加密备份选项；一份离线备份。','Turn on end-to-end encrypted backup where offered; keep one offline copy.','端到端加密下忘记恢复密钥则无法找回。','With E2EE, a lost recovery key means lost data.'),
   R('ai','AI 助手与浏览器插件','AI assistants and browser extensions','插件权限过大可读取所有网页；Agent 浏览网页时可能被页面中的隐藏指令操纵。','Over-privileged extensions read every page; browsing agents can be steered by hidden page instructions.','只装可信插件、定期清理；让 Agent 付款/发信前必须确认。','Install trusted extensions only and prune; require confirmation before an agent pays or sends.','确认步骤降低便利性。','Confirmation steps cost convenience.')],
  path:['user','dev','lan','isp','dns','tls','svc'],
  scen:[['演练：家人收到「我是你儿子，手机丢了，急需转账」的语音消息。','Exercise: a family member gets a voice note — “It’s your son, I lost my phone, send money now.”'],['检查：是否有约定暗号？是否回拨原号码？银行是否支持延迟到账？','Check: is there a family passphrase? Did they call the known number back? Does the bank support delayed transfers?']],
  crs:['◆ 端到端链的起点是人：AuthN ≠ AuthZ 在家里同样成立——登录了路由器不代表应能改 DNS。','◆ The chain starts with a person: AuthN ≠ AuthZ applies at home too — logging in to the router shouldn’t mean changing DNS.'],
  sub:{apt:['公寓楼：共享门禁、楼宇对讲与公共 Wi-Fi 由物业管理——它们是住户之间的共享攻击面。','Apartments: shared entry systems, intercoms and common Wi-Fi run by management — a shared attack surface between residents.'],dorm:['宿舍：大量学生设备在同一网络，需客户端隔离与校园身份认证。','Dormitory: many student devices on one network — needs client isolation and campus identity.'],house:['独立住宅：智能门锁、摄像头、太阳能逆变器等联网设备逐年增加。','House: smart locks, cameras and solar inverters keep adding connected devices.']}},

 com:{lv:3,lvw:['完整企业 IT 栈 + 支付 + 越来越多的 AI；勒索与数据泄露的主要目标，也是本课 capstone 的形态。','A full enterprise IT stack plus payments and growing AI use — a main ransomware and breach target, and the shape of the course capstone.'],
  cia:[4,4,4,4,1],stride:[4,4,3,5,4,4],fx:{phy:2,net:4,edge:4,idn:5,app:5,data:5,ai:4,ops:4},
  jewels:[['客户与员工个人数据','Customer and employee personal data'],['支付与财务系统','Payment and finance systems'],['身份提供方 (IdP) 与管理员账户','The identity provider and admin accounts'],['源代码、商业机密、合同','Source code, trade secrets, contracts'],['业务连续性（停一天的损失）','Business continuity (the cost of a day down)']],
  adv:{crime:5,apt:3,ins:4,hack:2,opp:4,ai:3},act:{ent:5,gov:2,res:2,sup:5,isp:3},csf:[3,3,3,3,3,3],
  regs:['PCI DSS 4.0.1','SOC 2 / ISO 27001','GDPR / CCPA / 个保法','NIS2（重要实体）'],
  risks:[
   R('idn','身份失守 → 全面沦陷','Identity compromise → total compromise','钓鱼 + MFA 绕过拿到 SSO 会话，再申请高权限或添加 OAuth 应用。','Phishing plus MFA bypass yields an SSO session, then privilege requests or rogue OAuth apps.','抗钓鱼 MFA、条件访问、管理员分离账户、OAuth 应用审批。','Phishing-resistant MFA, conditional access, separate admin accounts, OAuth app approval.','更多摩擦；遗留系统可能不支持现代认证。','More friction; legacy systems may not support modern auth.'),
   R('app','API 越权 (BOLA/BFLA)','API broken authorization (BOLA/BFLA)','把 ID 换成别人的就能读到别人的订单——扫描器看不出来。','Swap an ID and read someone else’s order — invisible to scanners.','网关鉴权 + 服务内对象所有权检查 + 端点×角色授权矩阵测试。','Gateway authZ + in-service ownership checks + an endpoint × role test matrix.','每个端点都要写与维护授权测试。','Every endpoint needs authorization tests to write and maintain.'),
   R('ops','勒索软件 + 数据外泄','Ransomware + data theft','初始访问后横向移动，先偷数据再加密，双重勒索。','After initial access, lateral movement, exfiltration, then encryption — double extortion.','分段、EDR、不可变备份、出站监测、演练过的恢复。','Segmentation, EDR, immutable backups, egress monitoring, rehearsed recovery.','备份与 SOC 成本高；恢复演练会影响业务。','Backups and a SOC cost money; restore drills disrupt business.'),
   R('ai','企业 AI 助手 / Agent','Enterprise AI assistants / agents','RAG 检索到用户无权看的文档；Agent 被邮件中的指令驱动去外发数据。','RAG retrieves documents the user may not see; an agent steered by an email exfiltrates data.','检索前权限过滤、工具网关、外发与删除需审批、全链路追踪。','Permission filtering before retrieval, a tool gateway, approval for sending and deleting, full traces.','审批太多没人看，太少会越权——按风险分级。','Too many approvals get ignored, too few overreach — tier by risk.'),
   R('data','SaaS 与第三方','SaaS and third parties','业务数据散落在几十个 SaaS；一个供应商被攻破即暴露你的数据。','Business data spread over dozens of SaaS apps; one breached vendor exposes yours.','SaaS 清单、SSO 统一接入、最小 OAuth 范围、供应商评估与合同条款。','A SaaS inventory, SSO for all, minimal OAuth scopes, vendor reviews and contract clauses.','评估消耗采购周期。','Reviews slow procurement.')],
  path:['user','dev','lan','dns','cdn','tls','gw','svc','db','ai','ext','log'],
  scen:[['演练：周五晚财务共享盘文件开始被批量改名，SOC 发现一台主机连向未知境外地址。','Exercise: Friday night, files on the finance share start being renamed en masse and a host beacons to an unknown address.'],['检查：谁有权隔离主机与禁用账户？备份最近一次恢复测试是何时？是否需要监管与客户通报？时限是多少？','Check: who may isolate hosts and disable accounts? When was a backup last restored? Do regulators and customers need notice, and by when?']],
  crs:['◆ 这就是 capstone 的形态：React → API 网关 → 后端 → 数据 → LLM+RAG+Agent，每一跳都有信任边界。','◆ This is the capstone shape: React → API gateway → back end → data → LLM+RAG+agent, with a trust boundary at every hop.'],
  sub:{retail:['零售：POS 网段与顾客 Wi-Fi 必须分离；卡号令牌化，门店不落地明文卡号（PCI DSS）。','Retail: POS segment separated from guest Wi-Fi; tokenized card numbers never stored in-store (PCI DSS).'],mall:['商场：多租户共享楼宇网络与停车、广播系统；租户间隔离与楼宇系统（BMS）安全是关键。','Mall: tenants share building networks, parking and PA systems; tenant isolation and building-management security are key.'],hotel:['酒店：宾客 Wi-Fi、门卡系统、预订平台与支付；宾客数据与门锁系统都是目标。','Hotel: guest Wi-Fi, key-card systems, booking platforms and payment; guest data and door-lock systems are targets.'],office:['写字楼办公：典型零信任 + SSO + SaaS 环境。','Office: the classic zero-trust + SSO + SaaS environment.'],tower:['超高层综合体：多业态共用楼宇自控（电梯、空调、消防联动），IT 与楼宇 OT 必须分离。','Mixed-use tower: shared building automation (lifts, HVAC, fire interlocks) — keep IT apart from building OT.'],food:['餐饮：扫码点餐与外卖平台账户、POS 与会员系统。','Food & drink: QR ordering, delivery-platform accounts, POS and loyalty systems.'],market:['超市：POS、电子价签、冷链监控与供应商对接系统。','Supermarket: POS, electronic shelf labels, cold-chain monitoring and supplier links.']}},

 pub:{lv:4,lvw:['政务与公共安全系统：公民数据集中、服务不能停，且是国家级与黑客行动主义者的目标。','Government and public-safety systems: concentrated citizen data, services that cannot stop, and targets for nation-states and hacktivists.'],
  cia:[5,5,5,4,4],stride:[4,5,5,5,5,4],fx:{phy:3,net:4,edge:4,idn:5,app:4,data:5,ai:3,ops:5},
  jewels:[['公民身份与登记数据','Citizen identity and registry data'],['应急调度与通信','Emergency dispatch and communications'],['案件、证据与司法记录（完整性）','Case files, evidence and court records (integrity)'],['公共服务门户的可用性','Availability of public-service portals']],
  adv:{crime:4,apt:5,ins:3,hack:4,opp:4,ai:2},act:{ent:2,gov:5,res:4,sup:4,isp:3},csf:[4,3,4,4,4,4],
  regs:['FISMA / FedRAMP','NIST SP 800-53','CJIS（执法）','等保 2.0（三级及以上）','NIS2'],
  risks:[
   R('ops','公共服务中断','Public-service outage','勒索软件或 DDoS 使办事、缴费、调度系统停摆，影响市民生活甚至生命。','Ransomware or DDoS halts permits, payments and dispatch — hurting daily life or even safety.','关键服务的降级与手工备用流程、离线备份、抗 DDoS、跨部门演练。','Degraded and manual fallback procedures, offline backups, anti-DDoS, cross-agency drills.','备用流程需要长期维护与培训。','Fallbacks need ongoing maintenance and training.'),
   R('data','记录完整性','Record integrity','证据与登记数据被篡改比被偷更危险——会导致错误决定。','Altered evidence or records are worse than stolen ones — they lead to wrong decisions.','签名与哈希链、写一次存储、职责分离、完整审计日志。','Signatures and hash chains, write-once storage, separation of duties, full audit logs.','不可变存储改错成本高、需要更正流程。','Immutable storage makes corrections costly and needs an amendment process.'),
   R('idn','高权限与外包账户','Privileged and contractor accounts','外包运维、共用账户、离职未回收是常见缺口。','Contractor admins, shared accounts and unrevoked leavers are common gaps.','PAM、即时授权、会话录屏、定期权限复核。','PAM, just-in-time elevation, session recording, periodic access reviews.','复核工作量大。','Reviews are labour-intensive.'),
   R('net','老旧系统与边缘设备','Legacy systems and edge devices','长期在用的旧系统难以打补丁；VPN/防火墙等边缘设备是国家级对手的常用入口。','Long-lived legacy systems resist patching; VPN and firewall appliances are favoured nation-state entry points.','资产清单、边缘设备按 KEV 快速修补、隔离旧系统、逐步迁移到 ZTNA。','Asset inventory, fast KEV patching of edge devices, isolate legacy, migrate toward ZTNA.','替换旧系统周期长、预算审批慢。','Legacy replacement is slow and budget approval slower.'),
   R('app','公共门户','Public portals','面向全体市民的门户是高频攻击面；高峰期（报税、选课、补贴申请）易被压垮。','Citizen-facing portals are constantly probed and buckle at peaks (tax, enrolment, benefit windows).','OWASP 测试、WAF、排队与限流、容量预案。','OWASP testing, WAF, queuing and rate limits, capacity plans.','排队影响体验。','Queues hurt the experience.')],
  path:['user','dev','lan','isp','dns','cdn','tls','gw','svc','db','ext','log'],
  scen:[['演练：市政门户被 DDoS，同时社交媒体出现「市民数据已泄露」的帖子。','Exercise: the city portal is under DDoS while social media claims “citizen data leaked”.'],['检查：如何核实泄露真伪？对外口径由谁发布？线下办理通道是否可用？向哪个 CERT 通报？','Check: how is the leak claim verified? Who speaks publicly? Is the in-person channel ready? Which CERT gets notified?']],
  crs:['◆ 分级与持续监测：系统按影响定级（FIPS 199 / 等保），再选控制基线，而不是一次性过审。','◆ Grade and monitor: categorise by impact (FIPS 199 / MLPS), pick a control baseline, then monitor continuously — not a one-off pass.'],
  sub:{police:['警察局：执法数据、调度与通信系统，受 CJIS 等专门要求约束；证据链完整性至关重要。','Police: law-enforcement data, dispatch and comms under rules such as CJIS; chain-of-custody integrity is vital.'],fire:['消防站：调度、车载终端与无线通信；可用性优先于一切。','Fire station: dispatch, in-vehicle terminals and radio — availability above all.'],court:['法院：电子卷宗与庭审系统；完整性与不可抵赖性（Repudiation）是核心。','Court: e-filing and hearing systems; integrity and non-repudiation are central.'],gov:['政府办公：政务云、公文与审批系统、公民门户。','Government office: government cloud, document and approval systems, citizen portals.'],post:['邮政：包裹追踪与通知系统常被仿冒用于钓鱼短信。','Post office: tracking and notification systems are widely spoofed in phishing texts.']}},

 edu:{lv:3,lvw:['开放的网络文化 + 大量自带设备 + 有价值的科研数据；预算有限但攻击面巨大。','An open network culture, masses of personal devices and valuable research data — a huge surface on a limited budget.'],
  cia:[4,4,4,4,2],stride:[5,3,2,4,4,4],fx:{phy:2,net:5,edge:3,idn:5,app:4,data:4,ai:5,ops:3},
  jewels:[['学生与未成年人数据','Student and minors’ data'],['科研数据与知识产权','Research data and intellectual property'],['统一身份（校园 SSO）','Campus single sign-on'],['教学平台与考试系统的可用性','Availability of learning and exam platforms']],
  adv:{crime:4,apt:4,ins:3,hack:2,opp:5,ai:3},act:{ent:2,gov:3,res:4,sup:4,isp:3},csf:[2,3,3,2,3,3],
  regs:['FERPA / COPPA（美国）','GDPR / 个保法（未成年人保护）','出口管制（科研）'],
  risks:[
   R('net','开放网络 + 自带设备','Open network + personal devices','成千上万未管理的设备，实验室设备常年不更新。','Thousands of unmanaged devices; lab instruments rarely updated.','按身份分区（学生/教职工/访客/实验室/IoT），802.1X 接入，实验室设备隔离。','Zone by role (students/staff/guests/labs/IoT), 802.1X access, isolated lab gear.','学术自由文化与限制之间要平衡。','Balance restrictions against academic openness.'),
   R('idn','校园账户被盗','Campus account theft','一个账户能访问邮箱、网盘、图书馆数据库与 VPN；常被转卖。','One account opens mail, storage, library databases and VPN — and gets resold.','MFA 全覆盖、异常登录检测、毕业/离职自动回收。','MFA for everyone, anomalous-login detection, automatic deprovisioning on graduation or exit.','临时访客与合作者管理复杂。','Visitors and collaborators are complex to manage.'),
   R('data','科研数据','Research data','国家级对手关注前沿科研；数据集常放在个人网盘或公开存储。','Nation-state interest in frontier research; datasets end up in personal drives or public buckets.','数据分级、受控研究环境、出口管制审查、存储桶扫描。','Data classification, controlled research environments, export-control review, bucket scanning.','合规流程拖慢科研合作。','Compliance slows collaboration.'),
   R('ai','校园 AI 助手','Campus AI assistant','◆ 课程案例 CampusAssist：RAG 跨租户泄露、过度代理、间接注入。','◆ Course case CampusAssist: RAG cross-tenant leakage, excessive agency, indirect injection.','按用户权限检索、工具允许清单、记录「工具记录 / 工单行 / 检索片段 ID」作为证据。','Permission-aware retrieval, tool allowlists, evidence as tool records / ticket rows / chunk ids.','评测与红队需要持续投入。','Evaluation and red-teaming need ongoing effort.'),
   R('app','选课与考试高峰','Registration and exam peaks','高峰流量压垮系统，或在考试期间被 DDoS。','Peaks overwhelm systems, or DDoS hits during exams.','限流、排队、CDN、容量测试与备用考试方案。','Rate limits, queues, CDN, load tests and a fallback exam plan.','备用方案需要额外准备。','Fallbacks take extra preparation.')],
  path:['user','dev','lan','isp','dns','tls','gw','svc','db','ai','log'],
  scen:[['演练：校园 AI 助手被发现能回答「某同学的成绩是多少」。','Exercise: the campus AI assistant answers “what grade did student X get?”'],['检查：检索前是否按提问者权限过滤？测试结论用 pass / fail / inconclusive / not executed 记录了吗？修复后是否重跑同一测试 + 正常任务回归？','Check: is retrieval filtered by the asker’s rights? Are results labelled pass / fail / inconclusive / not executed? After the fix, was the same test re-run plus a normal-task regression?']],
  crs:['◆ CSE635 AI 实验的现实背景：CampusAssist、RAG 评估（P@k、R@k、忠实度、授权维度）。','◆ The real backdrop for the CSE635 AI labs: CampusAssist and RAG evaluation (P@k, R@k, faithfulness, authorization).'],
  sub:{kinder:['幼儿园：家长 App、监控视频与儿童信息——隐私保护要求最高。','Kindergarten: parent apps, camera feeds and child data — the strictest privacy needs.'],school:['中小学：学生设备管理、内容过滤与家校沟通平台。','School: student-device management, content filtering, parent-communication platforms.'],univ:['大学：多校区、多学院自治网络，统一身份与分区是关键。','University: multi-campus, departmental networks — unified identity and zoning are key.'],lib:['图书馆：公共终端、访客 Wi-Fi、电子资源代理访问。','Library: public terminals, guest Wi-Fi, e-resource proxies.'],research:['科研机构：高性能计算、敏感数据集、国际合作与出口管制。','Research institute: HPC, sensitive datasets, international collaboration and export control.']}},

 med:{lv:4,lvw:['停机可能危及生命，病历是高价值数据，医疗设备难以打补丁——勒索软件的头号目标行业之一。','Downtime can cost lives, records are valuable and devices are hard to patch — one of ransomware’s top target sectors.'],
  cia:[5,5,5,5,5],stride:[3,5,3,5,5,3],fx:{phy:3,net:5,edge:3,idn:4,app:4,data:5,ai:3,ops:5},
  jewels:[['电子病历 (EHR) 与影像','Electronic health records and imaging'],['联网医疗设备（输液泵、监护仪）','Connected medical devices (infusion pumps, monitors)'],['急诊与手术排程的可用性','Availability of emergency and surgical scheduling'],['药品与冷链系统','Pharmacy and cold-chain systems']],
  adv:{crime:5,apt:2,ins:3,hack:1,opp:4,ai:2},act:{ent:4,gov:4,res:5,sup:5,isp:3},csf:[3,3,4,4,4,5],
  regs:['HIPAA 安全规则','FDA 上市前网络安全要求（医疗器械）','GDPR 健康数据','等保 2.0 · 医疗卫生行业'],
  risks:[
   R('ops','勒索软件导致诊疗中断','Ransomware halting care','HIS/EHR 被加密会延误手术、转移救护车。','Encrypted HIS/EHR systems delay surgery and divert ambulances.','离线不可变备份、纸质降级流程、快速恢复演练、分段。','Offline immutable backups, paper downtime procedures, fast-restore drills, segmentation.','降级流程要定期训练医护人员。','Downtime procedures need regular staff training.'),
   R('net','医疗设备网络','Medical-device network','设备运行旧操作系统、厂商不允许自行打补丁。','Devices run old operating systems and vendors forbid self-patching.','独立设备网段、只允许必要通信、被动监测、厂商 SBOM 与补丁计划。','A dedicated device segment, only necessary flows, passive monitoring, vendor SBOMs and patch plans.','隔离可能影响设备与系统的集成。','Isolation can complicate device integration.'),
   R('data','病历隐私','Record privacy','病历在黑市价值高；内部人员越权查看名人病历也是常见事件。','Records fetch high prices; insiders snooping on famous patients is a recurring event.','基于角色与诊疗关系的访问、访问审计与告警、「破玻璃」紧急访问留痕。','Access by role and care relationship, audited access with alerts, logged break-glass access.','过严的访问会妨碍急救。','Over-strict access can obstruct emergency care.'),
   R('idn','第三方与远程运维','Third parties and remote support','设备厂商远程维护通道、计费与影像外包服务。','Vendor remote-maintenance channels, outsourced billing and imaging services.','受控跳板、按需开启、会话录像、合同中的安全条款。','Controlled jump hosts, on-demand access, session recording, security clauses in contracts.','临时开通可能拖慢维修。','On-demand access can slow repairs.'),
   R('ai','临床 AI','Clinical AI','AI 生成的病历摘要或建议出现幻觉；训练数据含个人健康信息。','Hallucinated summaries or advice; training data containing personal health information.','人工复核临床结论、数据去标识化、模型评测与监控。','Clinician review of conclusions, de-identification, model evaluation and monitoring.','复核增加工作量。','Review adds workload.')],
  path:['user','dev','lan','isp','tls','gw','svc','db','ext','log'],
  scen:[['演练：凌晨 2 点急诊系统无法登录，影像服务器文件后缀被改。','Exercise: at 2 a.m. the emergency department can’t log in and imaging files have new extensions.'],['检查：纸质流程能否立即启用？救护车分流由谁决定？最近一次恢复测试用了多久（RTO）？','Check: can paper procedures start now? Who decides ambulance diversion? How long did the last restore take (RTO)?']],
  crs:['◆ 可用性优先：预防（网关、分段）与检测（告警呼叫值班）都要有，因为任何单层都会失效。','◆ Availability first: prevention (gateways, segmentation) and detection (alerts that page on-call) are both needed because any single layer fails.'],
  sub:{hosp:['医院：临床网、设备网、访客网、科研网多网并存，急诊不能停。','Hospital: clinical, device, guest and research networks side by side; the ED cannot stop.'],clinic:['诊所：通常依赖云端电子病历与小型 IT 外包——外包商安全决定诊所安全。','Clinic: usually cloud EHR plus small outsourced IT — the provider’s security is the clinic’s security.'],pharm:['药店：处方系统、医保结算与库存；处方篡改是完整性风险。','Pharmacy: prescription, insurance billing and inventory systems; prescription tampering is an integrity risk.'],care:['养老护理：呼叫与定位设备、用药记录；居民隐私与人身安全并重。','Care home: call and location devices, medication records; privacy and physical safety together.'],vet:['宠物医院：预约与支付系统，客户联系方式泄露常被用于诈骗。','Veterinary: booking and payment systems; leaked contact details feed scams.'],dent:['牙科：影像设备与云端预约系统，通常为小型 IT。','Dentist: imaging devices and cloud booking, usually small-scale IT.']}},

 ind:{lv:4,lvw:['IT 与 OT（工控）交汇：一次网络事件可能变成物理事故或生产停摆；数据中心是数字经济的心脏。','IT meets OT: a cyber incident can become a physical accident or a halted line; data centres are the heart of the digital economy.'],
  cia:[3,5,5,2,5],stride:[4,5,3,3,5,4],fx:{phy:5,net:5,edge:2,idn:4,app:2,data:3,ai:3,ops:4},
  jewels:[['工控系统 (PLC/SCADA) 与安全仪表系统','Control systems (PLC/SCADA) and safety instrumented systems'],['生产配方与工艺数据','Recipes and process data'],['仓储与物流调度','Warehouse and logistics scheduling'],['电力、制冷（数据中心）','Power and cooling (data centres)']],
  adv:{crime:5,apt:4,ins:3,hack:2,opp:3,ai:2},act:{ent:5,gov:3,res:1,sup:5,isp:4},csf:[3,3,3,3,4,5],
  regs:['IEC 62443','NIST SP 800-82r3','NIS2（制造业、数据中心）','关键信息基础设施安全保护条例'],
  risks:[
   R('net','IT → OT 横向蔓延','IT → OT spread','办公网的勒索软件穿过扁平网络进入产线。','Office ransomware crosses a flat network into the production line.','Purdue 分层 + IT/OT 之间的 DMZ、单向网关、OT 资产清单。','Purdue zoning with an IT/OT DMZ, one-way gateways, an OT asset inventory.','隔离增加数据交换与远程支持的难度。','Isolation complicates data exchange and remote support.'),
   R('idn','远程运维通道','Remote-maintenance access','厂商与工程师的远程连接常年开启、共用账户。','Vendor and engineer remote links left open with shared accounts.','经跳板机 + MFA + 按需审批 + 会话录像。','Through a jump host + MFA + on-demand approval + session recording.','紧急维修时审批会拖延。','Approvals slow emergency repairs.'),
   R('phy','物理与安全系统','Physical and safety systems','工控协议常无认证；安全仪表系统必须独立于控制系统。','Industrial protocols often lack authentication; safety systems must stay independent of control.','物理隔离安全系统、端口锁定、变更管理。','Physically separate safety systems, locked ports, change management.','改造产线成本高。','Retrofitting lines is costly.'),
   R('ops','停产与恢复','Shutdown and recovery','恢复 OT 需要已知良好的配置与工程文件备份。','OT recovery needs known-good configurations and engineering-file backups.','离线保存 PLC 程序与配置、恢复演练、手动运行方案。','Offline copies of PLC programs and configs, recovery drills, manual-operation plans.','演练需要停线窗口。','Drills need downtime windows.'),
   R('app','供应链与物流平台','Supply chain and logistics platforms','供应商门户、EDI 与物流平台把多家企业连在一起。','Supplier portals, EDI and logistics platforms tie many firms together.','供应商分级管理、最小接口权限、异常订单检测。','Tiered supplier management, minimal interface rights, anomalous-order detection.','供应商配合度不一。','Supplier cooperation varies.')],
  path:['user','dev','lan','isp','gw','svc','db','ext','log'],
  scen:[['演练：仓库管理系统被加密，自动分拣停止，但 PLC 仍在运行。','Exercise: the warehouse management system is encrypted; sorting stops but PLCs still run.'],['检查：IT/OT 之间的连接能否立即切断？手动作业能维持多久？工程文件离线备份在哪里？','Check: can the IT/OT link be cut immediately? How long can manual work continue? Where are offline engineering backups?']],
  crs:['◆ 关键层级：能不自动化就不自动化；必须自动化时逐动作审批 + kill switch + 高管签字。','◆ Critical tier: avoid automation; if essential, per-action approval + kill switch + executive sign-off.'],
  sub:{dc:['数据中心：电力与制冷冗余（N+1/2N）、物理门禁多层、租户隔离与运维权限分离；它本身就是别人的「物理层」。','Data centre: power and cooling redundancy (N+1/2N), layered physical access, tenant isolation, separated operator rights — it is everyone else’s physical layer.'],ware:['仓储物流：仓储管理系统、手持终端、AGV 与月台调度。','Warehouse: WMS, handheld terminals, AGVs and dock scheduling.'],fac:['工厂：PLC/SCADA、MES、安全仪表系统，IT/OT 融合点最危险。','Factory: PLC/SCADA, MES, safety systems — the IT/OT junction is the riskiest point.'],craft:['作坊/车间：小型数控设备与个人电脑混用，最基本的分段与备份就能大幅降险。','Workshop: small CNC tools mixed with PCs — basic segmentation and backups cut risk sharply.']}},

 cul:{lv:2,lvw:['票务、场馆 Wi-Fi 与大型活动：可用性与人群安全高峰集中在活动当天。','Ticketing, venue Wi-Fi and big events: availability and crowd safety peak on event day.'],
  cia:[3,3,5,3,4],stride:[4,3,2,3,5,2],fx:{phy:3,net:4,edge:4,idn:3,app:4,data:3,ai:2,ops:3},
  jewels:[['票务与支付','Ticketing and payment'],['场馆广播、屏幕与门禁','PA, screens and access gates'],['藏品数据库与数字资产','Collection databases and digital assets'],['观众个人数据','Visitor personal data']],
  adv:{crime:4,apt:1,ins:2,hack:4,opp:4,ai:1},act:{ent:4,gov:3,res:4,sup:4,isp:4},csf:[2,2,3,3,3,3],
  regs:['PCI DSS（票务支付）','GDPR / 个保法','大型活动安保要求'],
  risks:[
   R('edge','票务高峰与黄牛机器人','Ticket peaks and scalper bots','开票瞬间流量与机器人抢票压垮系统。','On-sale surges and bots overwhelm ticketing.','排队系统、Bot 管理、实名与限购。','Queues, bot management, named tickets and purchase limits.','真实用户也会被挡在排队外。','Real fans wait in queues too.'),
   R('net','场馆 Wi-Fi 与运营网','Venue Wi-Fi and operations','观众网与闸机、广播、屏幕系统混在一起。','Visitor Wi-Fi mixed with gates, PA and screens.','运营网独立、屏幕与广播签名内容、应急广播物理备份。','A separate operations network, signed screen/PA content, physical backup for emergency PA.','多套网络增加维护。','Several networks add maintenance.'),
   R('app','网页篡改与舆情','Defacement and public pressure','活动期间网站或大屏被篡改显示不当内容。','Websites or big screens defaced during events.','内容发布双人审核、CMS 加固、快速下线预案。','Two-person approval for publishing, CMS hardening, a fast takedown plan.','发布速度变慢。','Publishing slows down.'),
   R('data','观众数据','Visitor data','票务与会员数据集中泄露。','Ticketing and membership data leak in bulk.','最小收集、令牌化支付、供应商评估。','Minimal collection, tokenized payments, vendor review.','营销希望收集更多。','Marketing wants more data.'),
   R('ops','活动日事件响应','Event-day response','事故发生在数万人聚集时，网络与物理安全要联动。','Incidents strike with tens of thousands present; cyber and physical security must coordinate.','联合指挥、通信备份、演练过的疏散广播。','Joint command, backup comms, rehearsed evacuation announcements.','跨团队协调成本高。','Cross-team coordination is costly.')],
  path:['user','dev','lan','dns','cdn','tls','gw','svc','db','log'],
  scen:[['演练：开场前 30 分钟闸机系统离线，同时票务网站出现异常流量。','Exercise: 30 minutes before kick-off the gates go offline and the ticket site sees abnormal traffic.'],['检查：闸机是否有离线验票模式？谁决定延迟入场？广播是否有独立备用？','Check: do gates have an offline mode? Who decides to delay entry? Is there an independent backup PA?']],
  crs:['◆ 可用性（STRIDE 中的 D）是此类建筑的主风险；限流 + 排队 + CDN。','◆ Availability (the D in STRIDE) dominates here; rate limits + queues + CDN.'],
  sub:{stadium:['体育场馆：闸机、大屏、广播与安防系统，峰值人流数万。','Stadium: gates, giant screens, PA and security systems with tens of thousands present.'],museum:['博物馆/美术馆：藏品管理、数字化资产、环境监控（温湿度）。','Museum: collection management, digitised assets, environmental monitoring.'],studio:['影音制作：未发布作品是核心资产，泄露即损失；传输用加密与水印。','Studios: unreleased work is the crown jewel; encrypt and watermark transfers.'],theatre:['剧院：票务、舞台灯光与音响控制网络。','Theatre: ticketing plus stage-lighting and sound control networks.'],cinema:['电影院：数字放映设备与密钥（KDM）管理。','Cinema: digital projectors and key delivery (KDM) management.']}},

 trn:{lv:4,lvw:['城市生命线：交通与公用设施一旦中断影响整座城市。具体设施的细节不公开，这里只讲通用原则。','City lifelines: an outage affects the whole city. Specific facilities’ details are not public; only general principles here.'],
  cia:[3,5,5,3,5],stride:[4,5,3,3,5,4],fx:{phy:5,net:5,edge:3,idn:4,app:3,data:3,ai:2,ops:5},
  jewels:[['运营控制与信号系统','Operations control and signalling'],['旅客信息与广播','Passenger information and PA'],['票务与支付','Ticketing and payment'],['电力、水、燃料供应','Power, water and fuel supply']],
  adv:{crime:4,apt:5,ins:3,hack:4,opp:3,ai:1},act:{ent:4,gov:5,res:4,sup:5,isp:4},csf:[4,3,4,4,4,4],
  regs:['NIS2（交通、能源）','TSA 安全指令（美国管道/铁路）','IEC 62443','关键信息基础设施安全保护条例'],
  risks:[
   R('net','控制系统隔离','Control-system isolation','运营控制必须与旅客与办公网络完全分离。','Operations control must be fully separated from passenger and office networks.','分区分级、单向网关、控制网不接公网。','Zoning, one-way gateways, no internet path to control networks.','运营数据共享变难。','Sharing operational data gets harder.'),
   R('ops','大面积中断','Wide-area disruption','一次事件影响数十万人出行或供应。','One incident disrupts hundreds of thousands of trips or supplies.','降级运行方案、手动调度、跨机构演练。','Degraded-mode operations, manual dispatch, cross-agency drills.','备用方案运行成本高。','Fallbacks are costly to keep ready.'),
   R('app','旅客信息被篡改','Passenger-information tampering','信息屏与广播被篡改会造成恐慌。','Tampered displays or PA can cause panic.','内容签名、发布审批、物理切断能力。','Signed content, publishing approval, a physical cut-off.','更新速度变慢。','Updates slow down.'),
   R('idn','供应商远程接入','Vendor remote access','信号、车辆与设备厂商的远程维护通道。','Remote maintenance by signalling, vehicle and equipment vendors.','按需开通、跳板、录像、合同约束。','On-demand access, jump hosts, recording, contractual controls.','维修响应变慢。','Repairs respond more slowly.'),
   R('phy','物理与 GNSS 依赖','Physical and GNSS dependence','授时与定位依赖卫星信号；干扰与欺骗会影响运营。','Timing and positioning rely on satellite signals; jamming and spoofing affect operations.','多源授时（地面时钟备份）、异常检测。','Multi-source timing (terrestrial clock backup), anomaly detection.','额外硬件成本。','Extra hardware cost.')],
  path:['user','dev','lan','isp','tls','gw','svc','db','ext','log'],
  scen:[['演练：车站信息屏显示错误的停运通知，社交媒体开始传播。','Exercise: station displays show a false suspension notice and social media amplifies it.'],['检查：能否在几分钟内手动关闭信息屏？官方更正由谁发布？日志能否区分故障与篡改？','Check: can displays be shut off manually within minutes? Who issues the correction? Can logs tell fault from tampering?']],
  crs:['◆ 关键层级原则同样适用：尽量不自动化，必须时要人审批与 kill switch。','◆ The critical-tier rule applies: avoid automation; if essential, human approval and a kill switch.'],
  sub:{rail:['火车/地铁站：信号与运营控制、闸机、旅客信息系统。','Rail/metro: signalling and operations control, gates, passenger information.'],air:['航站楼：离港系统、行李处理、航旅信息屏；大量第三方系统共存。','Airport terminal: departure control, baggage handling, flight displays — many third-party systems side by side.'],util:['公用设施：属于关键基础设施，只讲通用原则——隔离、冗余、手动运行能力。','Utility: critical infrastructure — general principles only: isolation, redundancy, manual operation.'],fuel:['加油站/充电站：支付终端与充电管理平台（OCPP），充电桩固件更新与身份认证。','Fuel/EV charging: payment terminals and charge-management platforms (OCPP); charger firmware and authentication.'],parking:['停车楼：车牌识别、支付与门杆控制。','Parking: plate recognition, payment and barrier control.'],bus:['公交站：实时到站信息与电子票务。','Bus station: real-time arrivals and e-ticketing.'],ferry:['码头：票务、船舶调度与港口通信。','Ferry terminal: ticketing, vessel scheduling and port comms.']}},

 rel:{lv:1,lvw:['以社区与志愿者为主的小型 IT：网站、捐赠、会员名册与直播。损失面小，但成员信息敏感。','Small, volunteer-run IT: a website, donations, member lists and streaming. Small blast radius, sensitive member data.'],
  cia:[4,2,3,5,3],stride:[4,3,1,4,3,2],fx:{phy:1,net:2,edge:2,idn:4,app:2,data:4,ai:1,ops:1},
  jewels:[['成员名册（敏感个人信息）','Member lists (sensitive personal data)'],['捐赠与支付','Donations and payments'],['网站与社交账号','Website and social accounts'],['直播与音响设备','Streaming and sound equipment']],
  adv:{crime:3,apt:1,ins:2,hack:3,opp:4,ai:1},act:{ent:2,gov:2,res:5,sup:4,isp:3},csf:[1,1,2,1,1,2],
  regs:['GDPR 特殊类别数据（宗教信仰）','个保法 · 敏感个人信息','捐赠与慈善法规'],
  risks:[
   R('data','成员信息','Member information','宗教信仰属于敏感个人信息，泄露可能带来歧视或人身风险。','Religious belief is sensitive personal data; a leak can bring discrimination or physical risk.','最小收集、访问限于少数人、加密存储。','Collect minimally, restrict access to a few, store encrypted.','管理更繁琐。','Administration gets more cumbersome.'),
   R('idn','共用账户','Shared accounts','网站、社交与捐赠平台常由志愿者共用一个口令。','Volunteers share one password for the website, social media and donations.','每人独立账户 + MFA、志愿者离开即回收。','Individual accounts + MFA, revoked when volunteers leave.','需要有人负责管理。','Someone has to own administration.'),
   R('app','捐赠诈骗','Donation fraud','仿冒的捐款链接与假冒负责人的消息。','Fake donation links and messages impersonating leaders.','官方渠道公示、回拨核实、二人复核资金变动。','Publish official channels, verify by call-back, two-person approval for fund changes.','流程变慢。','Slower processes.'),
   R('net','公共 Wi-Fi','Public Wi-Fi','访客与办公设备共网。','Visitors and office devices on one network.','访客网隔离。','Isolate the guest network.','需要一台支持多网段的路由器。','Needs a router that supports multiple segments.'),
   R('edge','网站篡改与骚扰','Defacement and harassment','节日期间网站被篡改或遭 DDoS。','Defacement or DDoS around festivals.','托管平台 + CDN、及时更新插件。','Managed hosting + CDN, timely plugin updates.','托管费用。','Hosting fees.')],
  path:['user','dev','lan','dns','cdn','tls','svc','db'],
  scen:[['演练：社交账号被盗，发布了虚假的募捐链接。','Exercise: the social account is hijacked and posts a fake donation link.'],['检查：账号找回由谁负责？如何通知成员？捐赠平台能否冻结可疑收款？','Check: who recovers the account? How are members warned? Can the donation platform freeze suspicious payouts?']],
  crs:['◆ 资产排序同样适用小组织：先保护成员名册与资金。','◆ Asset ranking applies to small organisations too: protect the member list and funds first.'],
  sub:{}}
};
// sensitive real-world sector reminder (shown for pub / trn / ind / med)
K.sens=['敏感行业：只展示公开框架与通用原则，不对任何真实设施作具体分析。','Sensitive sector: public frameworks and general principles only — no specific analysis of any real facility.'];
})();
// Sentinel Earth · Cyber Security Dossier viewer (情报档案). Opens from a building's panel.
// window.SE_DOS.open({k, s, name, cls:[zh,en], sub:[zh,en], col, lat, lon, h})
(function(){
var K=window.SE_DOSSIER;if(!K)return;
var root=document.documentElement,box=null,cur=null,tab='brief',sel={layer:null,hop:null};
function lang(){var l=root.getAttribute('data-lang');return l==='en'||l==='bi'?l:'zh';}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
// block text: bi shows zh then en on its own line
function T(p){if(!Array.isArray(p))return esc(p);var l=lang();if(l==='en')return esc(p[1]);if(l==='bi'&&p[1]&&p[1]!==p[0])return esc(p[0])+'<span class="dz-en">'+esc(p[1])+'</span>';return esc(p[0]);}
// inline text: bi shows "zh / en"
function S(p){if(!Array.isArray(p))return esc(p);var l=lang();if(l==='en')return esc(p[1]);if(l==='bi'&&p[1]&&p[1]!==p[0])return esc(p[0])+' <i class="dz-sl">/</i> '+esc(p[1]);return esc(p[0]);}
// plain text for SVG
function P(p,short){if(!Array.isArray(p))return String(p);var l=lang();if(l==='en')return p[1];if(l==='bi'&&!short)return p[0]+' · '+p[1];return l==='bi'?p[0]:p[0];}
var LV=['var(--sl1)','var(--sl2)','var(--sl3)','var(--sl4)','var(--sl5)'];
function lvc(v){return LV[Math.max(0,Math.min(4,Math.round(v)-1))];}
function layer(id){for(var i=0;i<K.layers.length;i++)if(K.layers[i].id===id)return K.layers[i];return null;}
function hop(id){for(var i=0;i<K.e2e.length;i++)if(K.e2e[i].id===id)return K.e2e[i];return null;}
function A(){return K.arch[cur&&cur.k]||K.arch.com;}
function chips(a,cls){return '<div class="dz-chips">'+a.map(function(x){return '<span class="dz-chip '+(cls||'')+'">'+(Array.isArray(x)?S(x):esc(x))+'</span>';}).join('')+'</div>';}
function card(title,body,cls){return '<section class="dz-card '+(cls||'')+'">'+(title?'<h4>'+title+'</h4>':'')+body+'</section>';}
function pc(pro,con){return '<div class="dz-pc"><div class="pro"><b>'+S(['利','Pro'])+'</b>'+T(pro)+'</div><div class="con"><b>'+S(['弊','Con'])+'</b>'+T(con)+'</div></div>';}
function ul(a){return '<ul class="dz-ul">'+a.map(function(x){return '<li>'+T(x)+'</li>';}).join('')+'</ul>';}
function H(z,e){return S([z,e]);}

// ---------- SVG helpers ----------
function radar(vals,labels,color,max){var n=vals.length,cx=120,cy=112,r=78,pts=[],g='';max=max||5;
 for(var k=1;k<=max;k++){var ring=[];for(var i=0;i<n;i++){var a=-Math.PI/2+i*2*Math.PI/n;ring.push((cx+Math.cos(a)*r*k/max).toFixed(1)+','+(cy+Math.sin(a)*r*k/max).toFixed(1));}g+='<polygon points="'+ring.join(' ')+'" fill="none" stroke="var(--grid)" />';}
 for(i=0;i<n;i++){var a2=-Math.PI/2+i*2*Math.PI/n,x=cx+Math.cos(a2)*r,y=cy+Math.sin(a2)*r;g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--grid)"/>';
  var lx=cx+Math.cos(a2)*(r+16),ly=cy+Math.sin(a2)*(r+16);var anc=Math.abs(Math.cos(a2))<.2?'middle':Math.cos(a2)>0?'start':'end';
  g+='<text x="'+lx.toFixed(1)+'" y="'+(ly+4).toFixed(1)+'" text-anchor="'+anc+'" class="dz-ax">'+esc(P(labels[i],true))+' <tspan class="dz-axv">'+vals[i]+'</tspan></text>';
  pts.push((cx+Math.cos(a2)*r*vals[i]/max).toFixed(1)+','+(cy+Math.sin(a2)*r*vals[i]/max).toFixed(1));}
 g+='<polygon points="'+pts.join(' ')+'" fill="'+color+'" fill-opacity=".22" stroke="'+color+'" stroke-width="2"/>';
 pts.forEach(function(p){var q=p.split(',');g+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="3" fill="'+color+'"/>';});
 return '<svg viewBox="-24 0 288 230" class="dz-svg dz-radar" role="img">'+g+'</svg>';}
function bars(rows,max,unit){// rows [label(pair), value, color?]
 return '<div class="dz-bars">'+rows.map(function(r){var w=Math.max(4,r[1]/max*100);return '<div class="dz-bar"><span class="l">'+S(r[0])+'</span><span class="t"><i style="width:'+w+'%;background:'+(r[2]||lvc(r[1]/max*5))+'"></i></span><em>'+r[1]+(unit||'')+'</em></div>';}).join('')+'</div>';}
function gauge(lv){var s='';for(var i=1;i<=5;i++)s+='<i class="'+(i<=lv?'on':'')+'" style="--c:'+LV[i-1]+'"></i>';return '<span class="dz-gauge" title="'+lv+'/5">'+s+'</span>';}

// ---------- tabs ----------
var R={};
R.brief=function(){var a=A(),out='';
 if(/^(pub|trn|ind|med)$/.test(cur.k))out+='<div class="dz-warn">'+T(K.sens)+'</div>';
 var axes=[['机密','Conf.'],['完整','Integ.'],['可用','Avail.'],['隐私','Privacy'],['人身','Safety']];
 var st=[['仿冒 S','Spoof S'],['篡改 T','Tamper T'],['抵赖 R','Repud. R'],['泄露 I','Disclose I'],['拒绝服务 D','DoS D'],['提权 E','Elev. E']];
 out+='<div class="dz-grid g3">'
  +card(H('暴露等级','Exposure tier'),'<div class="dz-big">'+gauge(a.lv)+'<b>'+a.lv+'</b><small>/5</small></div><p>'+T(a.lvw)+'</p>')
  +card(H('安全目标权重','Security objectives'),radar(a.cia,axes,'var(--hud)')+'<p class="dz-cap">'+T(['C·I·A + 隐私 + 人身安全，0–5：该类建筑最在乎什么。','C·I·A + privacy + physical safety, 0–5: what this class cares about most.'])+'</p>')
  +card(H('STRIDE 威胁画像','STRIDE profile'),radar(a.stride,st,'var(--warn)')+'<p class="dz-cap">'+T(['◆ Week 2：对 DFD 每个元素逐项过 STRIDE。','◆ Week 2: walk STRIDE over every DFD element.'])+'</p>')
  +'</div>';
 out+='<div class="dz-grid g2">'
  +card(H('核心资产（皇冠宝石）','Crown jewels'),'<ol class="dz-ol">'+a.jewels.map(function(j){return '<li>'+T(j)+'</li>';}).join('')+'</ol><p class="dz-cap">'+T(['◆ Week 1：先排出前 5 名资产，再谈控制。','◆ Week 1: rank the top five assets before choosing controls.'])+'</p>')
  +card(H('对手画像（相对权重）','Adversaries (relative weight)'),bars(K.adv.map(function(v){return [v.n,a.adv[v.id]||0];}),5)+'<p class="dz-cap">'+T(['详细动机与防御见「对手与检测响应」。','Motives and defences in “Adversaries & response”.'])+'</p>')
  +'</div>';
 out+='<h3 class="dz-h">'+H('五大风险：威胁 → 控制 → 利弊','Top five risks: threat → control → trade-off')+'</h3><div class="dz-risks">'
  +a.risks.map(function(r,i){var L=layer(r.l);return '<article class="dz-risk"><header><span class="n">R'+(i+1)+'</span><b>'+S(r.n)+'</b><button class="dz-tag" data-go-layer="'+r.l+'">'+(L?S(L.n):'')+'</button></header>'
   +'<div class="dz-r3"><div><em>'+S(['威胁','Threat'])+'</em>'+T(r.w)+'</div><div><em>'+S(['控制','Control'])+'</em>'+T(r.c)+'</div><div><em>'+S(['代价 / 弊','Trade-off'])+'</em>'+T(r.x)+'</div></div></article>';}).join('')+'</div>';
 var csfMax=4;
 out+='<div class="dz-grid g2">'
  +card(H('NIST CSF 2.0 目标成熟度','NIST CSF 2.0 target tier'),bars(K.csf.map(function(f,i){return [[f[0]+' '+f[1],f[0]+' '+f[2]],a.csf[i],'var(--b1)'];}),csfMax)+'<p class="dz-cap">'+T(['层级 1 部分 · 2 风险知情 · 3 可重复 · 4 自适应——对该类建筑合理的目标，而非现状。','Tier 1 partial · 2 risk-informed · 3 repeatable · 4 adaptive — a sensible target for this class, not a measurement.'])+'</p>')
  +card(H('合规框架','Compliance frame'),chips(a.regs)+'<p class="dz-cap">'+T(K.regsNote)+'</p>'
   +(cur.sk&&a.sub[cur.sk]?'<div class="dz-sub"><b>'+S(cur.sub||['子类','Sub-class'])+'</b>'+T(a.sub[cur.sk])+'</div>':''))
  +'</div>';
 out+=card(H('桌面推演','Tabletop exercise'),'<div class="dz-scen"><p><span class="dz-k">INJECT</span>'+T(a.scen[0])+'</p><p><span class="dz-k">CHECK</span>'+T(a.scen[1])+'</p></div>','dz-scenc');
 out+=card(H('课程连接','Course link'),'<p>'+T(a.crs)+'</p>');
 return out;};

R.layers=function(){var a=A(),id=sel.layer||(a.risks[0]&&a.risks[0].l)||'app',w=500,rowH=40,n=K.layers.length,g='';
 for(var i=0;i<n;i++){var L=K.layers[n-1-i],f=a.fx[L.id]||1,y=8+i*rowH,bw=170+f*64,x=(w-bw)/2,on=L.id===id,hot=a.risks.some(function(r){return r.l===L.id;});
  g+='<g class="dz-lay'+(on?' on':'')+'" data-layer="'+L.id+'" tabindex="0" role="button"><rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+(rowH-8)+'" rx="7" style="fill:'+lvc(f)+';fill-opacity:'+(on?.5:.2)+';stroke:'+lvc(f)+'"/>'
   +'<text x="'+(w/2)+'" y="'+(y+rowH/2+1)+'" text-anchor="middle" class="dz-lt">'+esc(P(L.n))+'</text>'
   +(hot?'<circle cx="'+(x+bw-14)+'" cy="'+(y+(rowH-8)/2)+'" r="5" fill="var(--alert)"/>':'')+'</g>';}
 var L2=layer(id),rk=a.risks.filter(function(r){return r.l===id;});
 return '<p class="dz-lead">'+T(['八层从下（物理）到上（治理）。条越宽 = 该类建筑越需要重视这一层；红点 = 五大风险落在此层。点一层看细节。','Eight layers from physical (bottom) to governance (top). Wider bar = more emphasis for this class; red dot = a top-five risk lives here. Click a layer.'])+'</p>'
  +'<div class="dz-split"><div><svg viewBox="0 0 '+w+' '+(n*rowH+12)+'" class="dz-svg dz-stack">'+g+'</svg></div><div class="dz-det">'
  +'<h3>'+S(L2.n)+' '+gauge(a.fx[id]||1)+'</h3><p>'+T(L2.w)+'</p>'
  +(rk.length?'<div class="dz-hot">'+rk.map(function(r){return '<b>⚑ '+S(r.n)+'</b>'+T(r.w);}).join('')+'</div>':'')
  +'<div class="dz-grid g2"><div><h5>'+H('典型威胁','Typical threats')+'</h5>'+ul(L2.t)+'</div><div><h5>'+H('关键控制','Key controls')+'</h5>'+ul(L2.c)+'</div></div>'
  +pc(L2.pc[0],L2.pc[1])+'<h5>'+H('标准','Standards')+'</h5>'+chips(L2.std)+'<p class="dz-crs">'+T(L2.crs)+'</p></div></div>';};

R.e2e=function(){var a=A(),hs=K.e2e,id=sel.hop||a.path[Math.min(a.path.length-1,8)]||'svc',cols=window.innerWidth<760?2:4,cw=172,chh=74,g='',rows=Math.ceil(hs.length/cols),W=cols*cw+20;
 function pos(i){var r=Math.floor(i/cols),c=i%cols;if(r%2)c=cols-1-c;return {x:10+c*cw+cw/2,y:14+r*chh+24};}
 for(var i=0;i<hs.length-1;i++){var p=pos(i),q=pos(i+1),on=a.path.indexOf(hs[i].id)>=0&&a.path.indexOf(hs[i+1].id)>=0;g+='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+q.x+'" y2="'+q.y+'" class="dz-ln'+(on?' on':'')+'"/>';}
 hs.forEach(function(h,i){var p=pos(i),on=a.path.indexOf(h.id)>=0,s=h.id===id;
  g+='<g class="dz-hop'+(on?'':' off')+(s?' sel':'')+'" data-hop="'+h.id+'" tabindex="0" role="button"><rect x="'+(p.x-80)+'" y="'+(p.y-20)+'" width="160" height="40" rx="9" style="stroke:'+lvc(h.r)+'"/><circle cx="'+(p.x-68)+'" cy="'+p.y+'" r="5" style="fill:'+lvc(h.r)+'"/><text x="'+(p.x+6)+'" y="'+(p.y+4)+'" text-anchor="middle" class="dz-ht">'+esc(P(h.n,true))+'</text><text x="'+(p.x+74)+'" y="'+(p.y-8)+'" text-anchor="end" class="dz-hn">'+(i+1)+'</text></g>';});
 var h=hop(id);
 return '<p class="dz-lead">'+T(['一次请求从人到数据再回来的完整点到点路径。亮的节点 = 该类建筑典型会经过的跳；颜色 = 该跳的基础风险（绿→红）。点节点看「保护 / 失效 / 利弊」。','One request’s full point-to-point path, person → data → back. Lit hops = the ones this class typically traverses; colour = the hop’s base risk (green → red). Click a hop for protects / fails / trade-off.'])+'</p>'
  +'<svg viewBox="0 0 '+W+' '+(rows*chh+14)+'" class="dz-svg dz-path">'+g+'</svg>'
  +'<div class="dz-det"><h3>'+S(h.n)+' '+gauge(h.r)+'</h3><div class="dz-r3"><div><em>'+S(['保护','Protects'])+'</em>'+T(h.p)+'</div><div><em>'+S(['会怎样失效','How it fails'])+'</em>'+T(h.f)+'</div><div><em>'+S(['利弊','Trade-off'])+'</em>'+T(h.x)+'</div></div></div>'
  +card(H('端到端原则','End-to-end principles'),ul([['每一跳都是信任边界：不信任上一跳传来的任何东西','Every hop is a trust boundary: trust nothing the previous hop hands you'],['加密要端到端，授权要逐跳——TLS 不会帮你判断「谁能读这条记录」','Encrypt end to end, authorize at every hop — TLS can’t tell who may read this record'],['◆ LLM 输出边界：模型输出是「不可信的建议文本」','◆ The LLM output boundary: model output is untrusted advisory text'],['日志要能把一次请求从头串到尾（追踪 ID）','Logs must stitch one request end to end (trace IDs)']]));};

R.idn=function(){var I=K.idn,out='<div class="dz-grid g3">'+I.triad.map(function(t){return card(esc(t[0]),'<p>'+T([t[2],t[3]])+'</p>');}).join('')+'</div>';
 out+=card(H('MFA 强度阶梯','MFA strength ladder'),'<div class="dz-ladder">'+I.mfa.map(function(m){return '<div class="dz-rung"><span class="l">'+S([m[0],m[1]])+'</span><span class="t"><i style="width:'+(m[2]/5*100)+'%;background:'+lvc(6-m[2])+'"></i></span><em>'+T([m[3],m[4]])+'</em></div>';}).join('')+'</div>');
 // sequence diagram
 var ln=I.seq.lanes,st=I.seq.steps,W=680,lx=function(k){return 85+k*170;},bi=lang()==='bi',rh=bi?44:34,top=46,g='';
 ln.forEach(function(l,k){g+='<rect x="'+(lx(k)-72)+'" y="6" width="144" height="28" rx="6" class="dz-lane"/><text x="'+lx(k)+'" y="24" text-anchor="middle" class="dz-lt">'+esc(P(l,true))+'</text><line x1="'+lx(k)+'" y1="34" x2="'+lx(k)+'" y2="'+(top+st.length*rh+6)+'" class="dz-life"/>';});
 st.forEach(function(s,i){var y=top+i*rh+rh*.62,x1=lx(s[0]),x2=lx(s[1]),mid=(x1+x2)/2,self=s[0]===s[1],l=lang();
  if(self){g+='<path d="M'+x1+' '+(y-8)+' h28 v14 h-24" class="dz-arr" marker-end="url(#dzA)"/>';mid=x1+92;}
  else g+='<line x1="'+x1+'" y1="'+y+'" x2="'+(x2+(x2>x1?-4:4))+'" y2="'+y+'" class="dz-arr" marker-end="url(#dzA)"/>';
  var tx=self?x1+34:mid,anc=self?'start':'middle',zh=s[2],en=s[3];
  g+='<text x="'+tx+'" y="'+(y-6-(bi?11:0))+'" text-anchor="'+anc+'" class="dz-st"><tspan class="dz-sn">'+(i+1)+'</tspan> '+esc(l==='en'?en:zh)+'</text>'+(bi?'<text x="'+tx+'" y="'+(y-6)+'" text-anchor="'+anc+'" class="dz-st en">'+esc(en)+'</text>':'');});
 out+=card(H('OAuth 2.0 授权码 + PKCE（OIDC）时序','OAuth 2.0 authorization code + PKCE (OIDC) sequence'),'<div class="dz-scroll"><svg viewBox="0 0 '+W+' '+(top+st.length*rh+14)+'" class="dz-svg dz-seq"><defs><marker id="dzA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--hud)"/></marker></defs>'+g+'</svg></div><p class="dz-cap">'+T(['PKCE 让被截获的授权码无法单独兑换令牌；state 防 CSRF。第 9 步之后仍要做对象级授权——这是 BOLA 发生的地方。','PKCE makes an intercepted code useless on its own; state stops CSRF. After step 9 you still need object-level authorization — that is where BOLA lives.'])+'</p>');
 out+='<h3 class="dz-h">'+H('令牌设计的利弊','Token designs: pros and cons')+'</h3><div class="dz-grid g2">'+I.tokens.map(function(t){return card(S(t.n),pc(t.pro,t.con));}).join('')+'</div>';
 out+=card(H('课程要点与常见坑','Course points & classic traps'),ul(I.pits));return out;};

R.crypto=function(){var C=K.crypto,out='<div class="dz-scroll"><table class="dz-tb"><thead><tr><th>'+H('用途','Purpose')+'</th><th>'+H('推荐','Use')+'</th><th>'+H('避免','Avoid')+'</th><th>'+H('要点','Note')+'</th></tr></thead><tbody>'
 +C.rows.map(function(r){return '<tr><td><b>'+S(r[0])+'</b></td><td class="ok">'+esc(r[1])+'</td><td class="no">'+esc(r[2])+'</td><td>'+T(r[3])+'</td></tr>';}).join('')+'</tbody></table></div>';
 var n=C.pqc.length,W=700,g='<line x1="30" y1="40" x2="'+(W-20)+'" y2="40" class="dz-tl"/>';
 C.pqc.forEach(function(p,i){var x=40+i*(W-80)/(n-1),fut=/^20(3)/.test(p[0]);g+='<circle cx="'+x+'" cy="40" r="7" style="fill:'+(fut?'var(--warn)':'var(--hud)')+'"/><text x="'+x+'" y="24" text-anchor="middle" class="dz-yr">'+esc(p[0])+'</text>';});
 out+=card(H('后量子密码时间线','Post-quantum timeline'),'<div class="dz-scroll"><svg viewBox="0 0 '+W+' 60" class="dz-svg dz-tlsvg">'+g+'</svg></div><ol class="dz-ol dz-tlol">'+C.pqc.map(function(p){return '<li><span class="dz-k">'+esc(p[0])+'</span>'+T([p[1],p[2]])+'</li>';}).join('')+'</ol>');
 out+=card(H('原则','Principles'),ul(C.notes));return out;};

R.net=function(){var g='<rect x="10" y="40" width="120" height="50" rx="8" class="dz-box"/><text x="70" y="62" text-anchor="middle" class="dz-lt">'+esc(P(['主体','Subject'],true))+'</text><text x="70" y="78" text-anchor="middle" class="dz-cap2">'+esc(P(['人 / 设备 / Agent','user / device / agent'],true))+'</text>'
 +'<rect x="250" y="40" width="130" height="50" rx="8" class="dz-box hot"/><text x="315" y="62" text-anchor="middle" class="dz-lt">PEP</text><text x="315" y="78" text-anchor="middle" class="dz-cap2">'+esc(P(['策略执行点','enforcement'],true))+'</text>'
 +'<rect x="500" y="40" width="130" height="50" rx="8" class="dz-box"/><text x="565" y="62" text-anchor="middle" class="dz-lt">'+esc(P(['资源','Resource'],true))+'</text><text x="565" y="78" text-anchor="middle" class="dz-cap2">'+esc(P(['应用 / 数据','app / data'],true))+'</text>'
 +'<rect x="250" y="130" width="130" height="50" rx="8" class="dz-box pdp"/><text x="315" y="152" text-anchor="middle" class="dz-lt">PDP</text><text x="315" y="168" text-anchor="middle" class="dz-cap2">'+esc(P(['策略决策点','decision'],true))+'</text>'
 +'<line x1="130" y1="65" x2="246" y2="65" class="dz-arr" marker-end="url(#dzB)"/><line x1="380" y1="65" x2="496" y2="65" class="dz-arr" marker-end="url(#dzB)"/><line x1="315" y1="90" x2="315" y2="126" class="dz-arr dash" marker-end="url(#dzB)"/>'
 +'<text x="400" y="150" class="dz-cap2">'+esc(P(['身份 · 设备状态 · 上下文 · 威胁情报','identity · posture · context · threat intel'],true))+'</text>';
 var out=card(H('零信任：每个请求都要过 PDP / PEP','Zero trust: every request passes a PDP / PEP'),'<div class="dz-scroll"><svg viewBox="0 0 650 196" class="dz-svg"><defs><marker id="dzB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--hud)"/></marker></defs>'+g+'</svg></div><p class="dz-cap">NIST SP 800-207</p>');
 out+='<div class="dz-grid g2">'+K.net.map(function(x){return card(S(x.n),'<p>'+T(x.d)+'</p>'+pc(x.pro,x.con));}).join('')+'</div>';return out;};

R.cloud=function(){var M=K.cloud.srm,cw=110,rh=30,lw=170,W=lw+M.cols.length*cw+10,g='',col=['var(--sl1)','var(--sl3)','var(--hud)'];
 M.cols.forEach(function(c,i){g+='<text x="'+(lw+i*cw+cw/2)+'" y="18" text-anchor="middle" class="dz-lt">'+esc(c)+'</text>';});
 M.rows.forEach(function(r,j){var y=28+j*rh;g+='<text x="'+(lw-8)+'" y="'+(y+19)+'" text-anchor="end" class="dz-cap2">'+esc(P(r[0],true))+'</text>';
  r[1].forEach(function(v,i){g+='<rect x="'+(lw+i*cw+3)+'" y="'+(y+3)+'" width="'+(cw-6)+'" height="'+(rh-6)+'" rx="4" style="fill:'+(v===2?'var(--b1)':v===1?'var(--warn)':'var(--sl1)')+';fill-opacity:'+(v===2?.55:v===1?.45:.25)+'"/>';});});
 var leg='<div class="dz-legend"><span><i style="background:var(--b1)"></i>'+S(['客户负责','Customer'])+'</span><span><i style="background:var(--warn)"></i>'+S(['共同负责','Shared'])+'</span><span><i style="background:var(--sl1);opacity:.5"></i>'+S(['云厂商负责','Provider'])+'</span></div>';
 var out=card(H('共享责任模型','Shared-responsibility model'),'<div class="dz-scroll"><svg viewBox="0 0 '+W+' '+(30+M.rows.length*rh)+'" class="dz-svg">'+g+'</svg></div>'+leg+'<p class="dz-cap">'+T(['无论哪种模式，「数据」和「谁能访问」永远是客户的责任。','Whatever the model, data and who may access it always stay with the customer.'])+'</p>');
 out+='<div class="dz-grid g2">'+K.cloud.items.map(function(x){return card(S(x.n),'<p>'+T(x.d)+'</p>'+pc(x.pro,x.con));}).join('')+'</div>';return out;};

R.supply=function(){var Sp=K.supply,n=Sp.gates.length,W=720,cw=W/n,g='';
 Sp.gates.forEach(function(s,i){var x=i*cw;g+='<path d="M'+(x+2)+' 10 h'+(cw-16)+' l14 26 l-14 26 h-'+(cw-16)+' l14 -26z" class="dz-gate" style="fill-opacity:'+(.15+i*.07)+'"/><text x="'+(x+cw/2+4)+'" y="33" text-anchor="middle" class="dz-lt">'+esc(P([s[0],s[1]],true))+'</text><text x="'+(x+cw/2+4)+'" y="76" text-anchor="middle" class="dz-cap2">'+esc(s[2])+'</text>';});
 var out=card(H('◆ DevSecOps 流水线门禁（Lab 3）','◆ DevSecOps pipeline gates (Lab 3)'),'<div class="dz-scroll"><svg viewBox="0 0 '+W+' 86" class="dz-svg">'+g+'</svg></div><p class="dz-cap">'+T(['◆ 流水线就是可执行的安全策略。但 BOLA/BFLA 等业务逻辑问题门禁抓不到——要人工审查 + 回归测试；「扫描通过 ≠ 安全」。','◆ The pipeline is executable security policy. Business-logic flaws like BOLA/BFLA slip past the gates — they need human review + regression tests; a clean scan doesn’t prove security.'])+'</p>');
 var fw=[100,82,64,48];g='';Sp.triage.forEach(function(t,i){var w=fw[i]*5.2,x=(520-w)/2,y=8+i*44;g+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="36" rx="6" style="fill:'+LV[i+1]+';fill-opacity:.28;stroke:'+LV[i+1]+'"/><text x="260" y="'+(y+23)+'" text-anchor="middle" class="dz-lt">'+esc(t[0])+' · '+esc(P([t[1],t[2]],true))+'</text>';});
 out+='<div class="dz-grid g2">'+card(H('漏洞优先级漏斗','Vulnerability prioritisation funnel'),'<svg viewBox="0 0 520 186" class="dz-svg">'+g+'</svg><p class="dz-cap">'+T(['不是所有「严重」都同样紧急：先修已被利用且暴露在外、又落在关键资产上的。','Not every “critical” is equally urgent: fix what is exploited, exposed and on a crown-jewel asset first.'])+'</p>')
  +card(H('补丁时限（常见基准）','Patch deadlines (common baseline)'),'<table class="dz-tb"><tbody>'+Sp.sla.map(function(s){return '<tr><td>'+S([s[0],s[1]])+'</td><td class="ok"><b>'+esc(s[2])+'</b></td></tr>';}).join('')+'</tbody></table><p class="dz-cap">'+T(['具体时限以组织政策与法规为准（如 CISA BOD 22-01 对 KEV 的要求）。','Actual deadlines follow policy and regulation (e.g. CISA BOD 22-01 for KEV).'])+'</p>')+'</div>';
 out+='<div class="dz-grid g2">'+Sp.items.map(function(x){return card(S(x.n),'<p>'+T(x.d)+'</p>'+pc(x.pro,x.con));}).join('')+'</div>';
 out+=card(H('公开的历史案例','Public historical cases'),'<div class="dz-cases">'+Sp.cases.map(function(c){return '<div><span class="dz-k">'+esc(c[0])+'</span><b>'+esc(c[1])+'</b><p>'+T([c[2],c[3]])+'</p></div>';}).join('')+'</div>');return out;};

R.actors=function(){var a=A(),ac=K.actors,ly=K.layers,cw=64,lw=130,rh=34,W=lw+ly.length*cw+8,g='';
 ly.forEach(function(L,i){g+='<text x="'+(lw+i*cw+cw/2)+'" y="16" text-anchor="middle" class="dz-cap2">'+esc(L.n[0].split(' ')[0])+'</text>';});
 ac.forEach(function(x,j){var y=24+j*rh;g+='<text x="'+(lw-8)+'" y="'+(y+21)+'" text-anchor="end" class="dz-lt">'+esc(x.ic+' '+P(x.n,true))+'</text>';
  ly.forEach(function(L,i){var v=x.resp[L.id]||0;g+='<rect x="'+(lw+i*cw+3)+'" y="'+(y+3)+'" width="'+(cw-6)+'" height="'+(rh-6)+'" rx="4" style="fill:var(--hud);fill-opacity:'+(.06+v*.2)+'"/><text x="'+(lw+i*cw+cw/2)+'" y="'+(y+21)+'" text-anchor="middle" class="dz-cap2">'+(v?'●'.repeat(v):'·')+'</text>';});});
 var out=card(H('责任热力图：谁对哪一层负责','Responsibility heat map: who owns which layer'),'<div class="dz-scroll"><svg viewBox="0 0 '+W+' '+(30+ac.length*rh)+'" class="dz-svg">'+g+'</svg></div><p class="dz-cap">'+T(['列 = L0 物理 … L7 运营；● 越多责任越重。','Columns = L0 physical … L7 operations; more dots = heavier responsibility.'])+'</p>');
 out+=card(H('对该类建筑的影响力','Influence on this class'),bars(ac.map(function(x){return [x.n,a.act[x.id]||0,'var(--hud)'];}),5));
 out+='<div class="dz-grid g2">'+ac.map(function(x){return card('<span class="dz-ic">'+x.ic+'</span>'+S(x.n),'<p>'+T(x.role)+'</p><dl class="dz-dl"><dt>'+S(['掌控的控制','Controls they own'])+'</dt><dd>'+T(x.ctl)+'</dd><dt>'+S(['主要风险','Main risks'])+'</dt><dd>'+T(x.risk)+'</dd></dl>'+pc(x.pc[0],x.pc[1]));}).join('')+'</div>';return out;};

R.threat=function(){var a=A(),out='<div class="dz-grid g3">'+K.adv.map(function(v){var w=a.adv[v.id]||0;return card(S(v.n)+' '+gauge(w),'<dl class="dz-dl"><dt>'+S(['动机','Motive'])+'</dt><dd>'+T(v.m)+'</dd><dt>'+S(['常见途径','Typical routes'])+'</dt><dd>'+T(v.v)+'</dd><dt>'+S(['防御重点','Defence focus'])+'</dt><dd>'+T(v.d)+'</dd></dl>',w>=4?'hot':'');}).join('')+'</div>';
 out+=card(H('MITRE ATT&CK 战术 · 防守方在哪里看','MITRE ATT&CK tactics · where defenders look'),'<div class="dz-attack">'+K.attack.map(function(t,i){return '<div><span class="dz-k">'+(i+1)+' · '+esc(t[0])+'</span><b>'+S([t[1],t[2]])+'</b><p>'+T([t[3],t[4]])+'</p></div>';}).join('')+'</div>');
 var n=K.ir.length,cx=170,cy=150,r=110,g='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" class="dz-ring"/>';
 K.ir.forEach(function(s,i){var an=-Math.PI/2+i*2*Math.PI/n,x=cx+Math.cos(an)*r,y=cy+Math.sin(an)*r;g+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="30" class="dz-node"/><text x="'+x.toFixed(1)+'" y="'+(y+4).toFixed(1)+'" text-anchor="middle" class="dz-lt sm">'+esc(P([s[0],s[1]],true))+'</text>';});
 g+='<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" class="dz-lt">SP 800-61r3</text><text x="'+cx+'" y="'+(cy+14)+'" text-anchor="middle" class="dz-cap2">CSF 2.0</text>';
 out+='<div class="dz-grid g2">'+card(H('事件响应循环','Incident-response loop'),'<svg viewBox="0 0 340 300" class="dz-svg">'+g+'</svg><ol class="dz-ol">'+K.ir.map(function(s){return '<li><b>'+S([s[0],s[1]])+'</b> — '+T([s[2],s[3]])+'</li>';}).join('')+'</ol>')
  +card(H('NIST CSF 2.0 六大功能','NIST CSF 2.0 functions'),'<div class="dz-csf">'+K.csf.map(function(f,i){return '<div><span class="dz-k">'+f[0]+'</span><b>'+S([f[1],f[2]])+'</b><p>'+T([f[3],K.csfEn[i]])+'</p></div>';}).join('')+'</div><h5>'+H('◆ 预防 vs 检测','◆ Prevention vs detection')+'</h5>'+'<div class="dz-pd">'+K.prevdet.map(function(p){return '<div><b>'+S([p[0],p[1]])+'</b>'+T([p[2],p[3]])+'</div>';}).join('')+'</div>')+'</div>';return out;};

R.ai=function(){var X=K.ai,g='';
 var box=function(x,y,w,h,z,e,c,cls){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" class="dz-box '+(cls||'')+'"/><text x="'+(x+w/2)+'" y="'+(y+h/2-2)+'" text-anchor="middle" class="dz-lt">'+esc(P([z,e],true))+'</text>'+(c?'<text x="'+(x+w/2)+'" y="'+(y+h/2+14)+'" text-anchor="middle" class="dz-cap2">'+esc(P(c,true))+'</text>':'');};
 g+=box(10,30,120,56,'不可信输入','Untrusted input',['文档 · 邮件 · 网页','docs · mail · web'],'');
 g+=box(170,30,120,56,'LLM','LLM',['只能「提议」','can only propose'],'');
 g+=box(330,22,150,72,'策略层 / 工具网关','Policy / tool gateway',['允许清单 · 分级 · 审批','allowlist · tiers · approval'],'hot');
 g+=box(520,30,120,56,'工具 / 动作','Tool / action',['最小权限身份','least-privilege identity'],'');
 g+=box(250,130,250,46,'可观测性：完整追踪 + 告警呼叫人','Observability: full traces + paging alerts',null,'pdp');
 g+='<line x1="130" y1="58" x2="166" y2="58" class="dz-arr" marker-end="url(#dzC)"/><line x1="290" y1="58" x2="326" y2="58" class="dz-arr" marker-end="url(#dzC)"/><line x1="480" y1="58" x2="516" y2="58" class="dz-arr" marker-end="url(#dzC)"/><line x1="405" y1="94" x2="405" y2="126" class="dz-arr dash" marker-end="url(#dzC)"/><line x1="580" y1="86" x2="500" y2="140" class="dz-arr dash" marker-end="url(#dzC)"/>';
 g+='<text x="405" y="14" text-anchor="middle" class="dz-cap2 warn">'+esc(P(['预防：在执行前拦下','prevention: stop before execution'],true))+'</text>';
 var out=card(H('◆ 模型提议，策略层决定','◆ The model proposes, the policy layer disposes'),'<div class="dz-scroll"><svg viewBox="0 0 650 190" class="dz-svg"><defs><marker id="dzC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--hud)"/></marker></defs>'+g+'</svg></div><p class="dz-cap">'+T(['◆ 你无法对一个从不读提示词的规则引擎做提示注入。假设任一层都会失效：预防 + 检测都要。','◆ You can’t prompt-inject a rule engine that never reads the prompt. Assume any layer fails: prevention + detection.'])+'</p>');
 out+=card(H('OWASP LLM Top 10（2026）与对应控制','OWASP LLM Top 10 (2026) and controls'),'<div class="dz-top10">'+X.top.map(function(t){return '<div><span class="dz-k">'+t[0]+'</span><b>'+S([t[1],t[2]])+'</b><p>'+T([t[3],t[4]])+'</p></div>';}).join('')+'</div>');
 out+=card(H('◆ Agent 风险分级（课程）','◆ Agent risk tiers (course)'),'<div class="dz-scroll"><table class="dz-tb"><thead><tr><th>'+H('级别','Tier')+'</th><th>'+H('动作范围','Scope')+'</th><th>'+H('控制','Controls')+'</th></tr></thead><tbody>'+X.tiers.map(function(t,i){return '<tr><td><b style="color:'+LV[i+1]+'">'+S([t[0],t[1]])+'</b></td><td>'+T([t[2],t[3]])+'</td><td>'+T([t[4],t[5]])+'</td></tr>';}).join('')+'</tbody></table></div>');
 out+='<div class="dz-grid g2">'+card(H('MCP 三种原语','MCP primitives'),'<dl class="dz-dl">'+X.mcp.map(function(m){return '<dt>'+S([m[0],m[1]])+'</dt><dd>'+T([m[2],m[3]])+'</dd>';}).join('')+'</dl>')
  +card(H('◆ 六层 AI 治理框架','◆ Six-layer AI governance'),'<div class="dz-stack6">'+X.gov.map(function(gv,i){return '<div style="--i:'+i+'">'+S(gv)+'</div>';}).join('')+'</div>')+'</div>';
 out+=card(H('◆ 课程原则','◆ Course principles'),ul(X.rules));return out;};

R.front=function(){var out='<div class="dz-grid g3">'+K.front.map(function(f){return card('<span class="dz-chip">'+S(f.t)+'</span> '+S(f.n),'<p>'+T(f.d)+'</p>');}).join('')+'</div>';
 out+=card(H('法规与标准时间线','Regulation & standards timeline'),'<div class="dz-cases">'+K.regs.map(function(r){return '<div><span class="dz-k">'+esc(r[0])+'</span><b>'+esc(r[1])+'</b><p>'+T([r[2],r[3]])+'</p></div>';}).join('')+'</div><p class="dz-cap">'+T(K.regsNote)+'</p>');return out;};

var PK='se-dos-pkg';function pkgGet(){try{return JSON.parse(localStorage.getItem(PK)||'{}')||{};}catch(e){return {};}}
function pkgSet(o){try{localStorage.setItem(PK,JSON.stringify(o));}catch(e){}}
R.course=function(){var C=K.course,st=pkgGet(),done=0;C.pkg.forEach(function(p,i){if(st[i])done++;});
 var out='<div class="dz-arc">'+C.arc.map(function(s,i){return '<span style="--i:'+i+'">'+S(s)+'</span>';}).join('<i>→</i>')+'</div>';
 out+=card(H('◆ 你的 capstone 架构','◆ Your capstone stack'),'<p class="dz-mono">'+T(C.stack)+'</p>');
 out+='<div class="dz-weeks">'+C.weeks.map(function(w){return '<div class="dz-wk"><span class="dz-k">'+esc(w[0])+'</span><b>'+S([w[1],w[2]])+'</b><p>'+T([w[3],w[4]])+'</p><button class="dz-tag" data-go-tab="'+w[5]+'">'+S(['在档案中查看 →','See in dossier →'])+'</button></div>';}).join('')+'</div>';
 out+=card(H('◆ Week 7 安全保障包（16 项）','◆ Week 7 assurance package (16 items)')+' <span class="dz-chip">'+done+'/16</span>','<div class="dz-pkg">'+C.pkg.map(function(p,i){return '<label><input type="checkbox" data-pkg="'+i+'"'+(st[i]?' checked':'')+'><span>'+(i+1)+'. '+S(p)+'</span></label>';}).join('')+'</div><p class="dz-cap">'+T(['勾选只保存在本浏览器。修复 = 修复 + 回归测试 + 证据；发现了没修不丢人，隐瞒才是。','Ticks stay in this browser only. Remediation = fix + regression test + evidence; an unfixed finding stated honestly beats a hidden one.'])+'</p>');
 out+=card(H('◆ 课程案例','◆ Course cases'),'<div class="dz-cases">'+C.cases.map(function(c){return '<div><b>'+S([c[0],c[1]])+'</b><p>'+T([c[2],c[3]])+'</p></div>';}).join('')+'</div><p class="dz-cap">'+T(C.cn)+'</p>');
 return out;};

// ---------- shell ----------
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).toUpperCase().slice(0,6);}
function build(){if(box)return;box=document.createElement('div');box.id='dossier';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.hidden=true;document.body.appendChild(box);
 box.addEventListener('click',function(e){var t=e.target.closest('[data-dz-close]');if(t||e.target===box){close();return;}
  t=e.target.closest('[data-tab]');if(t){tab=t.getAttribute('data-tab');render(true);return;}
  t=e.target.closest('[data-go-tab]');if(t){tab=t.getAttribute('data-go-tab');render(true);return;}
  t=e.target.closest('[data-go-layer]');if(t){sel.layer=t.getAttribute('data-go-layer');tab='layers';render(true);return;}
  t=e.target.closest('[data-layer]');if(t){sel.layer=t.getAttribute('data-layer');render(false);return;}
  t=e.target.closest('[data-hop]');if(t){sel.hop=t.getAttribute('data-hop');render(false);return;}});
 box.addEventListener('keydown',function(e){if(e.key==='Escape'){e.stopPropagation();close();}if((e.key==='Enter'||e.key===' ')&&e.target.getAttribute&&(e.target.getAttribute('data-layer')||e.target.getAttribute('data-hop'))){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 box.addEventListener('change',function(e){var t=e.target;if(t&&t.hasAttribute('data-pkg')){var o=pkgGet();o[t.getAttribute('data-pkg')]=t.checked?1:0;pkgSet(o);render(false);}});
 new MutationObserver(function(){if(!box.hidden)render(false);}).observe(root,{attributes:true,attributeFilter:['data-lang']});
 window.addEventListener('resize',function(){if(!box.hidden&&tab==='e2e')render(false);});}
function render(top){var a=A(),c=cur,main=box.querySelector('.dz-main'),sc=main?main.scrollTop:0;
 var nm=c.name?esc(c.name):S(c.cls||['建筑','Building']);
 box.innerHTML='<div class="dz-win"><header class="dz-hd"><div class="dz-id"><span class="dz-stamp">'+S(K.meta.stamp)+'</span><span class="dz-case">CASE SE-'+esc((c.k||'').toUpperCase())+'-'+hash((c.lat||0).toFixed(5)+','+(c.lon||0).toFixed(5)+(c.name||''))+'</span></div>'
  +'<h2>'+nm+'</h2><p class="dz-sub2"><i style="background:'+(c.col||'var(--hud)')+'"></i>'+S(c.cls||['',''])+(c.sub?' → '+S(c.sub):'')+(c.lat!=null?' · <span class="dz-mono">'+(+c.lat).toFixed(4)+'°, '+(+c.lon).toFixed(4)+'°</span>':'')+'</p>'
  +'<div class="dz-lvl"><span>'+S(['暴露等级','Exposure'])+'</span>'+gauge(a.lv)+'</div><button class="dz-x" data-dz-close aria-label="close">✕</button></header>'
  +'<div class="dz-note">'+T(K.meta.note)+' <em>'+T(K.meta.how)+'</em></div>'
  +'<nav class="dz-rail">'+K.dims.map(function(d){return '<button data-tab="'+d[0]+'" aria-pressed="'+(d[0]===tab)+'"><i>'+d[3]+'</i><span>'+S([d[1],d[2]])+'</span></button>';}).join('')+'</nav>'
  +'<main class="dz-main"><h3 class="dz-title">'+K.dims.filter(function(d){return d[0]===tab;}).map(function(d){return '<i>'+d[3]+'</i>'+S([d[1],d[2]]);})[0]+'</h3>'+(R[tab]||R.brief)()+'<footer class="dz-ft">'+T(['资料：CSE635 课程讲义与实验 · NIST CSF 2.0 / SP 800-207 / 800-61r3 / FIPS 203-205 · OWASP Top 10:2025 / LLM Top 10 2026 · MITRE ATT&CK · 公开行业报告。教学用途。','Sources: CSE635 lectures and labs · NIST CSF 2.0 / SP 800-207 / 800-61r3 / FIPS 203-205 · OWASP Top 10:2025 / LLM Top 10 2026 · MITRE ATT&CK · public industry reports. For teaching.'])+' · v'+K.ver+'</footer></main></div>';
 var m=box.querySelector('.dz-main');if(m){m.scrollTop=top?0:sc;m.querySelectorAll('svg.dz-svg').forEach(function(sv){var vb=(sv.getAttribute('viewBox')||'').split(/\s+/);var w=+vb[2];if(w)sv.style.maxWidth=Math.round(w*1.18)+'px';});}
 var on=box.querySelector('.dz-rail [aria-pressed="true"]');if(on&&top&&on.scrollIntoView)try{on.scrollIntoView({block:'nearest',inline:'center'});}catch(e){}}
var lastFocus=null;
function open(o){build();cur=o||{k:'com'};if(!K.arch[cur.k])cur.k='com';sel={layer:null,hop:null};tab=(o&&o.tab)||'brief';lastFocus=document.activeElement;box.hidden=false;document.body.classList.add('dz-open');render(true);var x=box.querySelector('.dz-x');if(x)x.focus();}
function close(){if(!box)return;box.hidden=true;document.body.classList.remove('dz-open');if(lastFocus&&lastFocus.focus)try{lastFocus.focus();}catch(e){}}
function label(){return S(['🛰 网络安全情报档案','🛰 Cyber security dossier']);}
function blurb(){return T(['13 个维度：分层架构 · 端到端 · 认证令牌 · 密码算法 · 网络路由线路 · 云与数据 · 供应链补丁 · 各方责任 · 对手与响应 · AI Agent · 前沿法规 · 课程映射','13 dimensions: layers · end-to-end · identity & tokens · crypto · network & lines · cloud & data · supply chain & patching · stakeholders · adversaries & response · AI agents · frontier & law · course map']);}
window.SE_DOS={open:open,close:close,label:label,blurb:blurb,isOpen:function(){return !!box&&!box.hidden;},_tab:function(t){tab=t;render(true);}};
})();
