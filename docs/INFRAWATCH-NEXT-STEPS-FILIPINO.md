# InfraWatch: Mga idadagdag at mga problemang kailangang ayusin


## Pinakasimpleng paliwanag

Marami nang gumaganang bahagi ang InfraWatch. Ang malaking problema ngayon ay hindi lang kakulangan ng features.

May tatlong pangunahing kailangang ayusin:

1. Hindi palaging bago at kumpleto ang project data.
2. Hindi pa kumpleto ang proseso ng paghawak ng citizen reports.
3. Ang AI ay umaasa sa data at cloud service. Kapag kulang ang data, may problema ang internet o provider, o naabot ang limit, maaapektuhan din ang sagot ng AI.

Ibig sabihin, kahit maganda ang dashboard at AI, hindi magiging maaasahan ang resulta kung kulang, luma, o hindi malinaw ang pinanggalingang data.

---

## A. Mga feature na idadagdag pa

### Unang priority: ayusin ang kasalukuyang sistema

#### 1. Mas maaasahang project data update

Idadagdag:

- Malinaw na error message kapag pumalya ang update.
- Automatic retry kapag pansamantalang unavailable ang ABEMIS.
- Alert para sa authorized staff kapag may failed update.
- Proteksiyon para hindi magsabay ang dalawang update.
- Bilang ng records na nakuha, tinanggal sa scope, naulit, naisulat, at pumalya.
- Paraan para ma-recover ang update na natigil sa gitna.
- Malinaw na "Data is outdated" warning habang ginagamit ang huling maayos na data.

Bakit kailangan:

Sampung sunod-sunod na project update ang pumalya matapos ang huling successful update noong August 11, 2026.

#### 2. Secure complaint assignment

Idadagdag:

- Mag-assign ng report sa tamang tao o opisina.
- Self-claim para sa authorized staff.
- Reassignment kapag kailangan.
- Dahilan kung bakit inilipat ang report.
- History kung sino ang humawak at kailan.
- Listahan ng "Unassigned" at "Assigned to me."

Bakit kailangan:

May issue review at reply na ngayon, pero wala pang kumpletong assignment system. Hindi pa malinaw kung sino ang responsable sa bawat report.

#### 3. Response deadline o SLA

Idadagdag kapag inaprubahan na ng BAFE:

- Deadline kung kailan dapat kilalanin o sagutin ang report.
- Deadline kung kailan ito dapat ma-resolve.
- "Due soon" at "Overdue" na listahan.
- Escalation kapag hindi naasikaso sa oras.
- Notification sa citizen at responsible staff.
- Kumpletong history ng deadline at mga aksiyon.

Bakit hindi pa magawa nang buo:

Wala pang opisyal na BAFE response time. Kailangan ding magdesisyon kung kasama ang weekends, holidays, at oras sa labas ng opisina.

#### 4. Automatic complaint routing

Idadagdag:

- Automatic na pagpili ng tamang region, program, o office.
- Fallback queue kapag walang malinaw na tatanggap.
- Manual override na may dahilan.
- Proteksiyon laban sa maling assignment at sabay-sabay na pagbabago.

Bakit hindi pa magawa:

Kailangan munang aprubahan kung aling opisina ang responsable sa bawat klase ng report. Dapat mauna ang manual assignment bago ang automatic routing.

#### 5. Kumpletong citizen update at report closure

Idadagdag:

- Notification kapag natanggap, na-assign, nasagot, o na-resolve ang report.
- Public resolution summary.
- Supporting evidence kapag isinara ang report.
- Reopen o request-for-review process.
- Malinaw na dahilan ng closure.

Bakit kailangan:

Nakakapag-submit at track na ang citizen, pero hindi pa kumpleto ang buong proseso mula assignment hanggang final closure.

### Ikalawang priority: transparency at public access

#### 6. CSV at JSON data download

Idadagdag:

- Download ng public project data bilang CSV o JSON.
- Susunod ang download sa filters na pinili ng user.
- May source at petsa ng huling successful update.
- Public fields lamang. Walang citizen information, private notes, o internal data.

Kasalukuyang kalagayan:

May nakikitang export control, pero wala pang gumaganang download feature.

#### 7. Mas maayos na infrastructure map

Idadagdag o aayusin:

- Totoong approved GeoServer layers.
- Tamang AMEFIP at INS filters.
- Tamang kulay at legend.
- Mas mabilis na loading at marker grouping.
- Region, province, project type, at status filters.
- Accessible list para sa keyboard at screen reader users.
- Listahan ng projects na kulang ang coordinates para maipabalik sa source-data correction process.

Hindi gagawin:

Hindi lalagyan ng imbentong coordinates ang mga project na walang official location.

#### 8. Project watchlist at action tracking

Idadagdag:

- Kumpletong listahan ng delayed at at-risk projects.
- Responsible officer o office.
- Dahilan kung bakit na-flag.
- Aksiyon na gagawin.
- Due date at status.
- Supporting evidence at history.

Bakit kailangan:

Nakakakita na ang dashboard ng delayed at at-risk projects, pero wala pang kumpletong record kung sino ang kikilos at ano ang ginawa.

#### 9. SMS Connect pilot

Idadagdag pagkatapos maayos ang report workflow:

- SMS kapag natanggap ang report.
- SMS kapag na-acknowledge.
- SMS kapag may hinihinging dagdag na impormasyon.
- SMS kapag resolved o closed.
- Consent, opt-out, delivery status, retry, at message-cost limit.

Bakit hindi pa ginagawa agad:

Kailangan ng provider, budget, sender name, privacy rules, at operational owner. Hindi makakatulong ang SMS kung hindi pa malinaw ang report assignment at status process.

### Panghuling priority: mas advanced na features

#### 10. Mas maayos na GeoVideo validation

Idadagdag:

- Before-and-after comparison.
- Capture date at source ng location data.
- Duplicate at possible-tampering checks.
- Approval bago gawing public ang evidence.
- Offline at resumable upload.
- Reviewer comments at decision.

#### 11. Monitoring rules para sa bawat infrastructure type

Idadagdag:

- Magkahiwalay na approved indicators para sa irrigation, warehouse, greenhouse, fisheries facility, cold storage, renewable energy, at iba pa.
- Tamang evidence checklist para sa bawat type.
- Sariling validation at analytics rules.

Bakit kailangan:

Hindi pare-pareho ang paraan ng pagsukat sa irrigation, warehouse, greenhouse, at iba pang facilities. Hindi dapat iisang formula ang gamitin sa lahat.

#### 12. Mas maayos na ANIA knowledge base

Idadagdag:

- Approved FAQ at BAFE information.
- Sources o links sa sagot.
- Regular accuracy tests.
- Admin control sa prompts at voice options.
- Malinaw na warning kapag luma o kulang ang data.
- Optional local AI model kapag praktikal na, may sapat na hardware, at pasado sa quality tests.

---

## B. Bakit hindi pa ganap na maayos ang analytics

### Problema 1: Luma ang kasalukuyang project data

- Huling successful project update: August 11, 2026.
- Failed updates pagkatapos nito: 10.

Epekto:

- Maaaring hindi makita ang pinakabagong status o progress.
- Maaaring tama ang computation ng dashboard pero luma ang input data.
- Hindi dapat tawaging real-time ang analytics.

Kailangang gawin:

Ayusin ang synchronization, error logging, retry, alerts, at source reconciliation.

### Problema 2: Kulang ang schedule data

Sa 25,916 projects:

- 5,014 lamang ang may valid start date at target completion date.
- Iyan ay 19.3% lamang ng lahat ng projects.
- 20,902 projects ang walang sapat na schedule dates para sa parehong assessment.

Epekto:

Hindi kayang tukuyin nang maayos kung on schedule, at risk, o delayed ang karamihan ng projects. Dapat lumabas ang "Cannot be assessed" sa halip na manghula.

Kailangang gawin:

Kumpletuhin at linisin ang start date, target completion date, project status, at progress evidence sa authoritative source.

### Problema 3: Kulang ang historical data para sa forecasting

Kasalukuyang snapshot data:

- 5,311 projects lang ang may snapshot.
- Isang araw lang ang historical snapshot: August 11, 2026.

Epekto:

Hindi pa sapat ang history para gumawa ng maaasahang completion forecast sa karamihan ng projects. Kailangan ng maraming data points sa magkakaibang araw para makita ang tunay na movement ng progress.

Kailangang gawin:

Ibalik ang regular successful synchronization at araw-araw na snapshot. Pagkatapos, sukatin kung accurate ang forecast bago ito tawaging predictive.

### Problema 4: Walang actual expenditure data

Mayroon ang system ng:

- Approved o allocated budget sa 25,908 projects.
- Supplier actual bid amount sa 8,259 projects lamang, o 31.9%.

Walang kumpirmadong field para sa:

- Actual money spent.
- Disbursement.
- Financial utilization.
- Final awarded contract value.
- Actual final project cost.

Epekto:

Hindi maaaring sabihin ng dashboard kung magkano na ang nagastos o kung over budget ang project. Approved budget at supplier bid lamang ang kasalukuyang maipapakita nang tama.

Kailangang gawin:

Humingi sa ABEMIS data owner ng opisyal na fields at malinaw na kahulugan. Hangga't wala, ipakitang unavailable ang expenditure.

### Problema 5: Hindi lahat ng projects ay puwedeng ilagay sa mapa

Sa 25,916 projects:

- 16,541 o 63.8% ang may valid official coordinates.
- 9,375 ang walang valid coordinates at hindi ipinapakita sa mapa.

Epekto:

Partial lamang ang nationwide map coverage.

Kailangang gawin:

I-report ang kulang o maling coordinates sa authoritative source. Huwag gumawa ng approximate o random locations.

### Problema 6: Maaaring hindi pare-pareho ang labels mula sa source

Posibleng magkakaiba ang spelling, capitalization, o tawag sa status at project type.

Epekto:

- Maaaring mahati sa dalawang category ang iisang uri ng project.
- Maaaring mali ang count kapag hindi pareho ang label.
- Ang lahat ng hindi irrigation ay kasalukuyang nade-default sa AMEFIP, kaya hindi pa ito ligtas para sa maraming programs at agencies.

Kailangang gawin:

Gumawa ng approved list at mapping para sa statuses, programs, at infrastructure types. Ipakita ang unknown values sa halip na awtomatikong hulaan.

### Problema 7: Limitado ang kasalukuyang priority list

- Sampung priority candidates lamang ang kinukuha ng backend.
- Lima lamang mula sa listahang iyon ang ipinapakita ng UI.

Epekto:

Hindi ito kumpletong listahan ng lahat ng delayed o at-risk projects.

Kailangang gawin:

Magdagdag ng complete, filtered, sorted, at paginated red-flag list.

---

## C. Bakit hindi pa ganap na maayos ang AI

### Unang paglilinaw: hindi pa napatunayang "masyadong mahal" ang AI

Ang kasalukuyang AI provider ay Google Gemini gamit ang `gemini-flash-latest`. May configured API key, at may recorded usage na:

- 124 chat turns.
- 105 completed.
- 5 failed.
- 2 naiwan sa processing state.
- 590,312 recorded input tokens.
- 119,419 recorded output tokens.
- 709,731 recorded tokens sa kabuuan.

Hindi sapat ang token record para sabihing magkano talaga ang binayaran. Maaaring free tier o paid tier ang account, at maaaring magbago ang model na tinutukoy ng `gemini-flash-latest`. Kailangang tingnan ang totoong provider billing report bago sabihing mahal o mura.

Ang tunay na risk ay ito:

- Cloud service ang ginagamit, kaya maaaring may bayad habang dumarami ang users.
- May provider quota at rate limits.
- Kapag down ang provider o internet, hindi makakasagot ang AI.
- Maaaring magbago ang model, presyo, o limit ng provider.

### Problema 1: Ang AI ay nakadepende sa kalidad ng project data

Hindi kayang punan ng AI ang nawawalang official data.

Kapag walang schedule date, expenditure, coordinates, o updated status:

- Hindi rin kayang ibigay ng AI ang tamang sagot.
- Dapat sabihin nitong unavailable ang data.
- Hindi ito dapat manghula.

Sa madaling salita:

> Hindi maaayos ng mas malakas na AI model ang kulang na database.

### Problema 2: Luma ang data na binabasa ng AI

Dahil August 11 pa ang huling successful project update, ang sagot ng AI tungkol sa project status ay maaari ring luma.

Kailangang gawin:

Ipakita sa bawat sagot ang petsa ng data at magbigay ng warning kapag stale ang source.

### Problema 3: Wala pang kumpletong approved knowledge base

Ang AI ay mahusay sa paghahanap ng project records at totals, pero wala pang kumpletong curated BAFE FAQ at policy library na may approved sources.

Epekto:

- Mahina ito para sa official policy at procedural questions.
- Maaaring tama ang pagkakasulat pero kulang ang authority ng sagot.
- Hindi dapat gamitin ang AI para gumawa ng opisyal na policy decision.

Kailangang gawin:

Maglagay ng approved FAQs, manuals, policies, at source citations. Dapat may owner na nag-aapprove at nag-a-update ng content.

### Problema 4: May limit ang response time at dami ng requests

Kasalukuyang configuration:

- 5 messages bawat minuto.
- 2,000 messages na global daily limit.
- Humigit-kumulang 55 segundo bago mag-timeout ang response.

Epekto:

- Maaaring ma-block ang user kapag maraming sabay-sabay na gumagamit.
- Maaaring maputol ang mahaba o mabagal na sagot.
- Kailangan ng maayos na mensahe kapag naabot ang limit o unavailable ang provider.

### Problema 5: May ilang chat requests na pumalya o hindi natapos

Sa 124 recorded chat turns:

- 105 ang completed, o 84.7%.
- 5 ang failed, o 4.0%.
- 2 ang naiwan sa processing state.
- May iba pang turns na nasa ibang terminal states.

Epekto:

Hindi sapat na gumana lamang ang AI sa ilang test questions. Kailangan ng monitoring para makita kung bakit pumalya, nag-timeout, o naiwan sa processing.

Kailangang gawin:

- Provider health monitoring.
- Malinaw ngunit secret-safe na error categories.
- Cleanup ng stuck processing records.
- Retry para sa safe transient failures.
- Regular end-to-end test sa totoong configured model.

### Problema 6: Kailangan pang higpitan ang data na nababasa ng AI

May AI project-detail tool na kailangang gawing explicit public field list sa halip na kumuha ng buong project row.

Epekto:

Habang nadaragdagan ang database fields, may panganib na makasama sa AI response ang field na hindi naman dapat public.

Kailangang gawin:

Gumamit ng fixed at tested public AI data format. Project name, public location, approved budget, public status, at approved source fields lamang ang dapat mabasa.

### Problema 7: Wala pang sapat na AI quality measurement

May safety at functional tests, pero kailangan pa ng formal question set para masukat ang:

- Accuracy.
- Tamang pagtanggi sa bawal na tanong.
- Tamang paggamit ng source.
- Tamang pagsabi kapag walang data.
- Filipino at English response quality.
- Response time.
- Average token use at cost bawat tanong.

Kailangang gawin:

Gumawa ng regular AI evaluation report bago palawakin ang paggamit.

### Kaya ba ng local AI para makatipid?

Posible ang maliit at quantized na local model, pero may kapalit:

- Mas mababa o mas hindi consistent ang sagot kumpara sa stronger cloud model.
- Mas mabagal lalo na kapag CPU lang.
- Mahihirapan kapag maraming sabay-sabay na users.
- Kailangan ng sariling model deployment, monitoring, updates, at security.

Ang kasalukuyang InfraWatch VM ay may 4 CPU at humigit-kumulang 7.2 GiB RAM. Maaari itong subukan sa maliit na model para sa FAQ o simpleng classification, pero hindi dapat ipalagay na kaya nitong palitan agad ang cloud AI para sa lahat ng chat requests.

Praktikal na approach:

1. Gumamit muna ng deterministic database answers para sa totals at project facts.
2. Gumamit ng approved FAQ search bago tumawag sa malaking AI model.
3. Gumamit ng maliit na local model para sa simpleng tanong kung pasado sa tests.
4. Gumamit lang ng cloud AI kapag kailangan ng mas mahusay na language generation.
5. Sukatin ang quality, bilis, at totoong gastos bago pumili.

---

## D. Simpleng priority list para sa next steps

### Gawin muna

1. Ayusin ang failed project updates.
2. Ipakita nang malinaw ang missing at stale data.
3. Ayusin ang private audit logs at report workflow.
4. Kumpletuhin ang report assignment.
5. Humingi ng official BAFE SLA rules.
6. Ayusin ang maling map filters at sample layers.
7. Gumawa ng AI usage, failure, at cost monitoring.

### Sunod na gawin

8. SLA deadlines at escalation.
9. Complete red-flag at staff action list.
10. CSV at JSON downloads.
11. Citizen closure notifications.
12. Approved BAFE FAQ para sa ANIA.
13. SMS pilot.

### Gawin kapag maayos na ang data foundation

14. Mas accurate na project completion forecasting.
15. Local AI pilot at cloud/local cost comparison.
16. Type-specific monitoring indicators.
17. Advanced GeoVideo validation at offline upload.

---

## E. Maikling sasabihin sa presentation

> "Marami nang gumaganang features ang InfraWatch, pero ang susunod na phase ay nakatuon sa reliability at accountability. Kailangan muna naming ayusin ang regular project data update, punan ang kulang na schedule at location data, at kumpletuhin ang assignment at response process ng citizen reports. Para sa AI, gumagana na ang project search at question answering, pero ang kalidad nito ay nakadepende sa completeness at freshness ng source data. Susukatin din namin ang provider cost, usage, failures, at posibilidad ng local AI bago palawakin ang serbisyo."

## F. Pinakaimportanteng mensahe

> "Hindi sapat na maganda ang dashboard o malakas ang AI. Dapat bago, kumpleto, malinaw, at mapagkakatiwalaan muna ang data."

Mas detalyadong technical reference:

- `docs/INFRAWATCH-NEXT-STEPS-ROADMAP.md`
- `docs/INFRAWATCH-NEXT-STEPS-SIMPLE.md`
