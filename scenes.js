/* NinjaPB 3D scene data: the first five shots of a pickleball rally.
   Coordinates in metres: x across (-3.048..3.048), y up, z along the court (-6.706..6.706), net at z=0.
   Kitchen (NVZ) lines at z = ±2.134. "You" play on the z>0 side and face -z. Right hand side is +x.
   path: ball nodes. Node 0 is the start (its T is a pre-roll delay). Each later node is reached T seconds
   after the previous one on a gravity parabola. hit = you strike here with that swing. by = that actor strikes
   (bh = on their backhand side). net = the ball dies in the net here. */
(function (root) {
  "use strict";

  var BL = 6.706, KL = 2.134, HW = 3.048;

  /* Swing keyframes in player-local axes [right, up, forward]; h = handle-to-head direction, n = face normal.
     R/F = where the sweet spot meets the ball relative to your feet. open = face tilt at contact in degrees
     (positive = open / facing up). ry = contact height the pre/post keyframes were drawn for.
     Angles are illustrative teaching values, not measurements. */
  var SWINGS = {
    ready: { name: "準備姿勢 Ready", grip: "大陸式握拍，握力放鬆", face: "拍面約與地面垂直", point: "球拍置於胸前 10–11 點鐘方向", pathTxt: "對手觸球前 0.2 秒完成 Split-Step 墊步", spinTxt: "—",
      pos: [0.1, 1.15, 0.4], h: [-0.35, 0.94, 0.1], n: [0, 0.1, 1] },
    serve: { name: "發球 Serve", grip: "大陸式～半西方式握拍，手腕不翻甩", face: "微閉 10°–15°", point: "肚臍以下觸球，拋球前伸 1 呎", pathTxt: "拍頭低於手腕、由下往上揮拍；下肢轉髖帶動肩膀", spinTxt: "刷上旋，過網後下墜壓深", spin: "top",
      R: 0.5, F: 0.45, open: -12, hc: [0.55, -0.8, 0.2],
      pre: { dt: -0.5, pos: [0.6, 0.75, -0.55], h: [0.4, -0.5, -0.75], n: [-0.3, -0.2, 0.9] },
      post: { dt: 0.4, pos: [0.05, 1.45, 0.6], h: [-0.3, 0.85, 0.4], n: [-0.5, -0.3, 0.8] } },
    ret: { name: "接發球 Return（鎖腕推擊）", grip: "大陸式握拍，手腕固定", face: "微開 5°–10°", point: "身體前方、約腰部高度", pathTxt: "不甩手腕，以肩膀把球平穩推高過網 3 呎以上", spinTxt: "平擊或輕微下旋，重點是高度與深度", spin: "back",
      R: 0.5, F: 0.45, open: 8, hc: [0.95, -0.2, 0.1],
      pre: { dt: -0.4, pos: [0.65, 0.8, -0.15], h: [0.85, -0.3, -0.4], n: [-0.35, 0.15, 0.9] },
      post: { dt: 0.35, pos: [0.35, 1.25, 0.8], h: [0.6, 0.55, 0.55], n: [-0.2, 0.3, 0.93] } },
    flat: { name: "✕ 平快短球（反例）", grip: "大陸式握拍", face: "接近垂直，球飛得又平又快", point: "腰部高度", pathTxt: "向前平推發力，沒有給球高度", spinTxt: "平擊", spin: "flat",
      R: 0.5, F: 0.45, open: -2, hc: [0.95, -0.2, 0.1],
      pre: { dt: -0.4, pos: [0.7, 0.85, -0.3], h: [0.8, -0.2, -0.55], n: [-0.45, 0, 0.9] },
      post: { dt: 0.3, pos: [0.2, 1.1, 0.85], h: [0.3, 0.5, 0.8], n: [-0.4, 0, 0.92] } },
    drive: { name: "抽球 Drive", grip: "大陸式～半西方式握拍", face: "接近垂直至微閉", point: "身體側前方，膝蓋到腰部之間", pathTxt: "短引拍、拍頭低於手腕 4 吋，轉髖由低向高刷；收拍短促", spinTxt: "強烈上旋，過網 1 呎內急墜到膝蓋以下", spin: "top",
      R: 0.55, F: 0.4, open: -8, hc: [0.8, -0.55, 0.15],
      pre: { dt: -0.38, pos: [0.7, 0.55, -0.3], h: [0.6, -0.65, -0.45], n: [-0.5, -0.1, 0.85] },
      post: { dt: 0.3, pos: [-0.05, 1.45, 0.55], h: [-0.4, 0.8, 0.4], n: [-0.6, -0.3, 0.75] } },
    force: { name: "✕ 失衡／低點硬抽（反例）", grip: "握得太緊", face: "低點硬抽，拍面來不及調整", point: "低於膝蓋，或後仰失衡時", pathTxt: "大引拍全力揮擊", spinTxt: "無法控制：不是掛網就是彈高", spin: "flat",
      R: 0.5, F: 0.4, open: -5, hc: [0.7, -0.7, 0.1],
      pre: { dt: -0.45, pos: [0.75, 0.6, -0.45], h: [0.5, -0.5, -0.7], n: [-0.6, 0, 0.8] },
      post: { dt: 0.35, pos: [-0.1, 1.5, 0.5], h: [-0.5, 0.8, 0.3], n: [-0.6, -0.3, 0.75] } },
    drop: { name: "吊球 Drop", grip: "大陸式握拍，握力放軟", face: "開放，把球托起來", point: "身體前方、低於腰部，屈膝", pathTxt: "由低到高輕送，不發力；頂點留在己方半場", spinTxt: "幾乎不帶旋轉，過網後下墜進廚房", spin: "back",
      R: 0.5, F: 0.5, open: 25, hc: [0.95, -0.3, 0.1],
      pre: { dt: -0.4, pos: [0.6, 0.5, 0.1], h: [0.85, -0.45, -0.2], n: [-0.2, 0.4, 0.9] },
      post: { dt: 0.4, pos: [0.4, 1.1, 0.75], h: [0.7, 0.3, 0.6], n: [-0.1, 0.55, 0.83] } },
    punch: { name: "拳擊推截擊 Punch Volley", grip: "大陸式握拍，手腕鎖死", face: "接近垂直", point: "胸前迎球，球拍在 10–11 點鐘方向", pathTxt: "不拉拍，向前短促刺拳頂出 6 吋", spinTxt: "平擊，借力使力", spin: "flat",
      R: 0.2, F: 0.5, open: 3, ry: 1.2, hc: [-0.3, 0.95, 0.05],
      pre: { dt: -0.2, pos: [0.16, 1.2, 0.38], h: [-0.35, 0.93, 0.05], n: [0, 0.08, 1] },
      post: { dt: 0.18, pos: [0.2, 1.16, 0.67], h: [-0.3, 0.95, 0.1], n: [0, 0.05, 1] } },
    roll: { name: "上旋滾截擊 Roll Volley", grip: "大陸式握拍", face: "微扣 10°–15°", point: "手肘在身前，網帶高度或下墜中的球", pathTxt: "前臂內旋（Pronation），由下往上滾刷", spinTxt: "上旋，越網後急沉到對手腳尖", spin: "top",
      R: 0.35, F: 0.5, open: -12, ry: 0.9, hc: [0.8, 0.55, 0.1],
      pre: { dt: -0.3, pos: [0.45, 0.68, 0.3], h: [0.9, -0.25, 0.1], n: [-0.2, -0.1, 0.97] },
      post: { dt: 0.28, pos: [0.05, 1.35, 0.7], h: [-0.2, 0.9, 0.35], n: [-0.3, -0.45, 0.85] } },
    flick: { name: "手腕快挑 Flick", grip: "觸球瞬間手指抓緊握把（Finger Squeeze）", face: "出手前像 Dink 一樣微開，觸球時轉正", point: "廚房線上略微浮高的球", pathTxt: "維持常規 Dink 隱蔽姿勢，觸球瞬間微甩手腕", spinTxt: "平擊帶少量上旋，短槓桿爆發球速", spin: "top",
      R: 0.35, F: 0.5, open: 5, ry: 0.95, hc: [0.85, -0.1, 0.15],
      pre: { dt: -0.35, pos: [0.38, 0.8, 0.42], h: [0.9, -0.35, 0.1], n: [-0.1, 0.35, 0.93] },
      post: { dt: 0.16, pos: [0.28, 1.22, 0.72], h: [0.3, 0.85, 0.4], n: [-0.1, -0.1, 0.99] } },
    reset: { name: "軟手重置 Reset", grip: "握力降到 2–3/10（海綿手感）", face: "微開 45°", point: "雙腳 Split & Freeze 煞停凍結，球在膝蓋以下", pathTxt: "不揮拍，靠手肘避震把球輕卸入廚房", spinTxt: "吸收來球力量，幾乎不帶旋轉", spin: "back",
      R: 0.15, F: 0.45, open: 45, ry: 0.3, hc: [0.85, -0.4, 0.2],
      pre: { dt: -0.3, pos: [0.2, 0.42, 0.38], h: [0.8, -0.5, 0.2], n: [-0.1, 0.65, 0.75] },
      post: { dt: 0.3, pos: [0.17, 0.4, 0.52], h: [0.82, -0.45, 0.2], n: [-0.05, 0.72, 0.69] } },
    dink: { name: "長丁克 Aggressive Dink", grip: "大陸式握拍，手腕鎖死", face: "微開，平推", point: "膝蓋彎曲，重心低於網高", pathTxt: "以肩膀為大擺鐘平推；拋物線頂點務必在己方半場", spinTxt: "平推或輕微上旋", spin: "top",
      R: 0.45, F: 0.45, open: 20, ry: 0.45, hc: [0.9, -0.4, 0.15],
      pre: { dt: -0.4, pos: [0.5, 0.4, 0.25], h: [0.85, -0.5, 0], n: [-0.15, 0.35, 0.92] },
      post: { dt: 0.4, pos: [0.3, 0.75, 0.75], h: [0.8, -0.2, 0.5], n: [-0.1, 0.45, 0.88] } },
    smash: { name: "高壓撲殺 Put-away", grip: "大陸式握拍", face: "略為關閉，正對落點", point: "頭部前上方，手臂伸展", pathTxt: "球拍先舉高，由上往下向前壓", spinTxt: "平擊", spin: "flat",
      R: 0.3, F: 0.4, open: -15, ry: 1.6, hc: [0.15, 0.98, 0.1],
      pre: { dt: -0.4, pos: [0.38, 1.72, -0.2], h: [0.2, 0.6, -0.75], n: [-0.6, 0.2, 0.75] },
      post: { dt: 0.3, pos: [-0.15, 0.9, 0.6], h: [-0.3, -0.6, 0.7], n: [0, -0.3, 0.95] } },
    scoop: { name: "腳邊被迫上撈", grip: "來不及調整", face: "被迫大幅開放", point: "腳踝高度，人還在跑動中", pathTxt: "只能自下往上撈，球必然上飄", spinTxt: "無法控制", spin: "back",
      R: 0.4, F: 0.45, open: 40, hc: [0.6, -0.8, 0.1],
      pre: { dt: -0.25, pos: [0.5, 0.45, 0.15], h: [0.7, -0.7, 0], n: [-0.2, 0.5, 0.85] },
      post: { dt: 0.3, pos: [0.35, 1.0, 0.6], h: [0.5, 0.3, 0.8], n: [0, 0.7, 0.7] } }
  };

  var Z_K = { type: "zone", x0: -HW, x1: HW, z0: 0, z1: KL, color: "#4FE39B", label: "KITCHEN 廚房 NVZ" };
  var Z_T = { type: "zone", x0: -HW, x1: HW, z0: KL, z1: 5.0, color: "#FF6A4D", label: "TRANSITION 過渡區" };
  var Z_B = { type: "zone", x0: -HW, x1: HW, z0: 5.0, z1: BL, color: "#8FE3FF", label: "BASELINE 底線" };
  function on(z) { return Object.assign({ on: 1 }, z); }

  /* reusable ball sequences */
  var SERVE = [
    { p: [1.2, 1.0, 7.0], T: 0.6 },
    { p: [1.25, 0.72, 6.95], T: 0.3, hit: "serve", cap: "第 1 拍 發球：肚臍以下觸球，由下往上刷上旋" }
  ];
  var OPP_SERVE = [
    { p: [-1.25, 0.72, -6.95], by: "o1", sw: "serve", T: 0.8 },
    { p: [1.5, 0, 5.9], T: 1.05, cap: "對手深發球過來" }
  ];
  var RET_SHORT = [
    { p: [-1.75, 0.8, -7.4], by: "o1", sw: "ret", T: 0.7 },
    { p: [1.1, 0, 3.0], T: 1.0, cap: "綠燈：對手接發偏淺，人還在跑動上網" },
    { p: [1.25, 0.9, 4.0], T: 0.32, hit: "drive", cap: "短引拍、拍頭低於手腕 4 吋，轉髖由低向高刷上旋" },
    { p: [-1.2, 0.45, -3.9], T: 0.5, by: "o1", sw: "scoop", cap: "過網 1 呎內急墜到膝蓋以下，直接抓腳底" }
  ];
  var RET_DEEP = [
    { p: [-1.75, 0.8, -7.4], by: "o1", sw: "ret", T: 0.7 },
    { p: [1.3, 0, 6.2], T: 1.5, cap: "紅燈：接發極深且低，你後仰失衡，對手已站穩廚房線" }
  ];
  var FEET = [
    { p: [-1.0, 1.2, -2.3], by: "o1", sw: "punch", T: 0.8 }
  ];

  var CH = [
    { no: "01", title: "核心五拍架構", en: "Five-Shot Tactical Framework",
      key: "第 1 拍發球 → 第 5 拍重置／長丁克。你是發球方：第 1、3、5 拍由你出手。",
      pts: ["第 1 & 2 拍：深發球壓底線鎖角度；高深接發換 2 秒 100% 上廚房。", "第 3 拍：淺高球果斷抽球（Drive）逼冒高；深低球軟吊（Drop）穩推進。", "第 4 拍：高球刺拳推深、網高滾截壓腳尖、浮球手腕快挑突擊。", "第 5 拍：過渡區軟手卸力進廚房；站穩廚房推對角長丁克造殺機。"],
      v: [
        { id: "drop", label: "吊球路線：Drop → 長丁克", you: [0.75, 7.4], partner: [-1.6, 7.2], o1: [-1.35, -7.7], o2: [1.5, -2.5], tags: { o1: "接球者" },
          marks: [Z_K, Z_T, Z_B], intro: "一分球的前五拍。你在右側底線後準備發球。",
          path: SERVE.concat([
            { p: [-1.6, 0, -6.0], T: 1.05, cap: "落在底線前 2–3 呎，把接球者釘在後場" },
            { p: [-1.75, 0.8, -7.4], T: 0.3, by: "o1", sw: "ret", cap: "第 2 拍 接發球：對手回高深球，接完就衝上網" },
            { p: [1.2, 0, 5.9], T: 1.45 },
            { p: [1.3, 0.6, 7.0], T: 0.34, hit: "drop", cap: "第 3 拍：來球又深又低 → 軟吊 Drop，頂點留在己方半場" },
            { p: [-1.2, 0, -1.3], T: 1.2, cap: "球落進廚房，你和搭檔趁機推進" },
            { p: [-1.3, 0.4, -2.0], T: 0.3, by: "o1", sw: "dink", cap: "第 4 拍：對手無法下壓，只能回一顆丁克" },
            { p: [0.9, 0, 1.3], T: 0.9 },
            { p: [1.25, 0.45, 1.9], T: 0.3, hit: "dink", cap: "第 5 拍：站穩廚房線，推對角長丁克" },
            { p: [-2.4, 0, -1.7], T: 0.82, cap: "大角度拉開防線，逼對手後退冒高" },
            { p: [-2.75, 0.35, -2.4], T: 0.3 }]),
          moves: [{ who: "o1", after: 3, delay: 0.15, to: [-1.0, -2.5], dur: 1.6 }, { who: "you", after: 5, delay: 0.3, to: [1.0, 2.6], dur: 1.5 }, { who: "partner", after: 5, delay: 0.3, to: [-1.3, 2.55], dur: 1.5 }] },
        { id: "drive", label: "抽球路線：Drive → Reset", you: [0.75, 7.4], partner: [-1.6, 7.2], o1: [-1.35, -7.7], o2: [1.5, -2.5], tags: { o1: "接球者" },
          marks: [Z_K, on(Z_T), Z_B], intro: "同樣的開局，這次對手的接發球回淺了。",
          path: SERVE.concat([
            { p: [-1.6, 0, -6.0], T: 1.05, cap: "深發球壓底線" },
            { p: [-1.75, 0.8, -7.4], T: 0.3, by: "o1", sw: "ret", cap: "第 2 拍 接發球：這次對手回得又淺又高" },
            { p: [1.1, 0, 3.4], T: 1.2 },
            { p: [1.25, 0.9, 4.5], T: 0.36, hit: "drive", cap: "第 3 拍：淺高球 → 果斷抽球 Drive 逼冒高" },
            { p: [-1.2, 0.85, -2.9], T: 0.5, by: "o1", sw: "punch", cap: "第 4 拍：對手 Punch 擋回，壓向你的腳邊" },
            { p: [1.0, 0.32, 3.5], T: 0.55, hit: "reset", cap: "第 5 拍：人還在過渡區 → 軟手 Reset 卸力" },
            { p: [-0.5, 0, -1.1], T: 1.0, cap: "球輕卸進廚房，對手攻勢中斷" },
            { p: [-0.65, 0.3, -1.7], T: 0.3 }]),
          moves: [{ who: "o1", after: 3, delay: 0.15, to: [-0.8, -3.25], dur: 1.5 }, { who: "you", after: 5, delay: 0.25, to: [1.0, 3.95], dur: 0.6 }, { who: "partner", after: 5, delay: 0.3, to: [-1.4, 2.6], dur: 1.7 }, { who: "you", after: 7, delay: 0.3, to: [0.9, 2.6], dur: 0.9 }],
          caps: [{ after: 7, delay: 1.0, text: "爭取最後兩步，安全踏上廚房線" }] }
      ] },

    { no: "02", title: "第 1 拍 發球", en: "Shot 1 · The Serve",
      key: "深壓底線，鎖死對手進攻。",
      pts: ["黃金法則：深度 80% ＞ 旋轉 15% ＞ 速度 5%。", "合法三要素：肚臍以下觸球、拍頭低於手腕、由下往上揮拍。", "轉髖刷上旋：拋球前伸 1 呎，下肢轉髖帶動肩膀，拍面微閉 10°–15° 刷上旋。", "底線煞停：發球後立即在底線後 Split-Step 煞停（守雙彈跳原則，禁衝場內）。"],
      vids: [["Briones Pickleball", "現代重上旋深發球力學：下肢轉髖發力與底線深區壓迫軌跡"], ["John Cincola", "五步驟機械化穩定發球：消除手腕翻甩、100% 合法穩定動力鏈"]],
      v: [
        { id: "deep", label: "GO 打深球", light: "go", lt: "常規首選｜打深球（底線前 2–3 呎）", when: "所有常規發球回合。", why: "把對手釘在底線深處，拉長其上網距離並削弱第 2 拍回球威脅。",
          you: [0.75, 7.4], partner: [-1.6, 7.2], o1: [-1.35, -7.7], o2: [1.5, -2.5], tags: { o1: "接球者" },
          marks: [{ type: "zone", x0: -HW, x1: 0, z0: -6.1, z1: -5.8, color: "#E4F23F", label: "底線前 2–3 呎", on: 1, lx: -1.5, ly: 0.9 }], intro: "你在右側底線後。目標：對角發球區的最深處。",
          path: SERVE.concat([
            { p: [-1.6, 0, -6.0], T: 1.05, cap: "深度優先：落在底線前 2–3 呎" },
            { p: [-1.75, 0.85, -7.5], T: 0.32, by: "o1", sw: "ret", cap: "對手被釘在底線深處，上網距離被拉長" },
            { p: [0.9, 0, 4.4], T: 1.25, cap: "回球威脅變小。你守在底線後等球彈地（雙彈跳原則）" },
            { p: [1.0, 0.8, 5.5], T: 0.35 }]),
          caps: [{ after: 1, delay: 0.4, text: "發完球立刻在底線後 Split-Step 煞停，禁衝場內" }] },
        { id: "bh", label: "ALT 壓反手", light: "alt", lt: "戰術變奏｜壓反手", when: "對手反手較弱時。", why: "逼對手移動中用弱側擊球，直接製造第 3 拍肉包高球。",
          you: [0.75, 7.4], partner: [-1.6, 7.2], o1: [-1.9, -7.6], o2: [1.5, -2.5], tags: { o1: "接球者（右手持拍）" },
          marks: [{ type: "zone", x0: -1.0, x1: 0, z0: -BL, z1: -5.0, color: "#FFC53D", label: "反手側", on: 1, lx: -0.5, ly: 0.9 }], intro: "右手持拍的接球者，反手在靠中線那一側。",
          path: SERVE.concat([
            { p: [-0.45, 0, -5.9], T: 1.05, cap: "發向中線 T 點深處：壓對手反手" },
            { p: [-0.35, 0.75, -7.3], T: 0.32, by: "o1", sw: "ret", bh: 1, cap: "對手移動中用反手弱側擊球" },
            { p: [0.8, 0, 3.4], T: 1.35, cap: "回球又淺又高：第 3 拍的肉包高球" },
            { p: [0.9, 1.0, 4.4], T: 0.36 }]) },
        { id: "wide", label: "ALT 切外角", light: "alt", lt: "戰術變奏｜切外角", when: "對手站位偏中線時。", why: "逼對手移動中擊球、把人拉出場外，直接製造第 3 拍肉包高球。",
          you: [0.75, 7.4], partner: [-1.6, 7.2], o1: [-0.9, -7.5], o2: [1.5, -2.5], tags: { o1: "接球者" },
          marks: [{ type: "zone", x0: -HW, x1: -2.2, z0: -5.6, z1: -3.4, color: "#FFC53D", label: "外角", on: 1, lx: -2.6, ly: 0.9 }], intro: "接球者站位偏中線，外側留出一條通道。",
          path: SERVE.concat([
            { p: [-2.7, 0, -4.5], T: 0.95, cap: "切外角：球彈地後繼續往場外跑" },
            { p: [-3.25, 0.7, -6.1], T: 0.32, by: "o1", sw: "ret", cap: "對手邊跑邊接，重心被拉出場外" },
            { p: [0.6, 0, 3.8], T: 1.3, cap: "回球品質下降，對手中路大開" },
            { p: [0.65, 0.9, 4.8], T: 0.35 }]) }
      ] },

    { no: "03", title: "第 2 拍 接發球", en: "Shot 2 · Return of Serve",
      key: "高深弧線換時間，100% 搶佔廚房線。唯一目標是安全護送自己與搭檔站穩廚房線，絕非拼一拍得分。",
      pts: ["0.2 秒預判墊步：在對手觸球前 0.2 秒完成 Split-Step 雙腳墊步，徹底消除啟動延遲。", "鎖腕平穩推擊：拍面微開（5°–10°）、固定手腕，以肩膀推高過網 3 呎以上之安全防護弧度。", "隨球衝刺煞停（Return & Rush）：擊球後立即前衝，在對手打第 3 拍前於廚房線前 0.5 步雙腳踩煞停步。"],
      vids: [["ThatPickleballGuy", "高深接發球換取 2 秒上網策略：以高度與深度爭取跑位時間、避免短球被抓腳底"], ["PlayPickleball", "完美接發球站位與隨球搶網步伐：Split-Step 預判啟動、固定手腕推擊與第一時間衝刺就位"]],
      v: [
        { id: "deep", label: "GO 高且深", light: "go", lt: "為何選「高且深（High & Deep）」慢速長球？", when: "面對對手深發球或強勁發球時。", why: "為自身爭取 1.5–2.0 秒充足滯空時間從容上廚房線；若打平快短球會壓縮自己上網時間，在半途被抓腳底。",
          you: [1.25, 7.8], partner: [-1.5, 2.55], o1: [-0.85, -7.3], o2: [1.6, -7.2], tags: { o1: "發球者" },
          marks: [{ type: "zone", x0: -HW, x1: HW, z0: -BL, z1: -5.3, color: "#E4F23F", label: "深區", on: 1, lx: 2.2, ly: 0.9 }], intro: "你是接球方，搭檔已經站在廚房線。對手觸球前 0.2 秒完成墊步。",
          path: OPP_SERVE.concat([
            { p: [1.65, 0.8, 7.3], T: 0.32, hit: "ret", cap: "鎖腕推擊：拍面微開 5°–10°，用肩膀把球推高" },
            { p: [-1.3, 0, -5.9], T: 1.5, cap: "高過網 3 呎以上的弧線，換來上網時間" },
            { p: [-1.45, 0.7, -7.2], T: 0.33, by: "o1", sw: "drop", cap: "對手打第 3 拍之前，你已在廚房線前踩煞站穩" },
            { p: [0.9, 0, 1.4], T: 1.25 },
            { p: [1.1, 0.4, 2.0], T: 0.3 }]),
          moves: [{ who: "you", after: 2, delay: 0.22, to: [1.3, 2.55], dur: 1.55 }],
          caps: [{ after: 2, delay: 0.3, text: "Return & Rush：擊球後立即前衝" }] },
        { id: "mid", label: "ALT 打中路", light: "alt", lt: "落點決策｜打雙打中路", when: "想縮小對手第 3 拍的回球角度時。", why: "縮小對手回球角度、製造搭檔搶球與溝通混亂。",
          you: [1.25, 7.8], partner: [-1.5, 2.55], o1: [-0.85, -7.3], o2: [1.6, -7.2], tags: { o1: "發球者" },
          marks: [{ type: "zone", x0: -0.8, x1: 0.8, z0: -BL, z1: -4.8, color: "#FFC53D", label: "中路", on: 1, lx: 0, ly: 0.9 }], intro: "同樣的高深接發，這次落點選在兩人中間。",
          path: OPP_SERVE.concat([
            { p: [1.65, 0.8, 7.3], T: 0.32, hit: "ret", cap: "鎖腕推擊，瞄準雙打中路深處" },
            { p: [0.1, 0, -5.8], T: 1.5, cap: "球落在兩人中間：你的？我的？" },
            { p: [0.15, 0.65, -7.0], T: 0.33, by: "o2", sw: "drop", cap: "遲疑半拍，回球角度被縮小、第 3 拍品質下降" },
            { p: [-0.9, 1.3, 2.1], T: 1.0, by: "partner", sw: "punch", cap: "第 3 拍吊得太高，搭檔直接截擊" },
            { p: [-0.3, 0, -5.2], T: 0.5 },
            { p: [-0.2, 0.4, -6.6], T: 0.3 }]),
          moves: [{ who: "you", after: 2, delay: 0.22, to: [1.3, 2.55], dur: 1.55 }, { who: "o1", after: 2, delay: 0.7, to: [-0.55, -6.9], dur: 0.6 }] },
        { id: "bh", label: "ALT 打反手深角", light: "alt", lt: "落點決策｜打反手深角", when: "對手第 3 拍正手強抽（Drive）威脅大時。", why: "精準推向對手深反手底角，封死其第 3 拍正手強抽（Drive）威力。",
          you: [1.15, 7.75], partner: [-1.5, 2.55], o1: [-0.85, -7.3], o2: [1.6, -7.2], tags: { o1: "發球者", o2: "右手持拍" },
          marks: [{ type: "zone", x0: 1.9, x1: HW, z0: -BL, z1: -5.3, color: "#FFC53D", label: "反手深角", on: 1, lx: 2.45, ly: 0.9 }], intro: "右手持拍的對手，反手深角在你正前方的底線角落。",
          path: OPP_SERVE.concat([
            { p: [1.65, 0.8, 7.3], T: 0.32, hit: "ret", cap: "鎖腕推擊，推向對手深反手底角" },
            { p: [2.5, 0, -6.0], T: 1.45, cap: "又高又深，落在反手底角" },
            { p: [2.65, 0.7, -7.2], T: 0.33, by: "o2", sw: "drop", bh: 1, cap: "對手只能用反手打第 3 拍：正手強抽被封死" },
            { p: [1.0, 0, 1.5], T: 1.3, cap: "回來的是一顆軟吊球，你已站穩廚房線" },
            { p: [1.1, 0.4, 2.1], T: 0.3 }]),
          moves: [{ who: "you", after: 2, delay: 0.22, to: [1.3, 2.6], dur: 1.55 }] },
        { id: "flat", label: "✕ 平快短球", light: "stop", lt: "反例｜平快短球", when: "把接發球打成又平、又快、又短的球。", why: "若打平快短球會壓縮自己上網時間，在半途被抓腳底。",
          you: [1.25, 7.8], partner: [-1.5, 2.55], o1: [-0.85, -7.3], o2: [1.6, -7.2], tags: { o1: "發球者" },
          marks: [on(Z_T)], intro: "反例：同樣的來球，這次你想用速度搶分。",
          path: OPP_SERVE.concat([
            { p: [1.65, 0.8, 7.3], T: 0.32, hit: "flat", cap: "反例：把接發球打成平快短球" },
            { p: [-1.0, 0, -4.5], T: 0.75, cap: "球很快就到，落點又淺" },
            { p: [-1.1, 1.05, -5.2], T: 0.25, by: "o1", sw: "drive", cap: "對手上步，舒服地強抽第 3 拍" },
            { p: [1.35, 0.25, 3.1], T: 0.6, hit: "scoop", cap: "你還在過渡區跑動中，球直接抓腳底" },
            { p: [-0.9, 1.7, -2.4], T: 0.75, by: "o1", sw: "smash", cap: "被迫上撈的肉包球，對手跟進撲殺" },
            { p: [0.3, 0, 3.6], T: 0.3, cap: "短球壓縮的是自己的上網時間" },
            { p: [0.6, 0.9, 7.2], T: 0.45 }]),
          moves: [{ who: "you", after: 2, delay: 0.22, to: [1.3, 3.5], dur: 1.3 }] }
      ] },

    { no: "04", title: "第 3 拍 抽球 vs. 吊球", en: "Shot 3 · Drive vs. Drop",
      key: "抽球不是賭一拍得分，而是「逼對手冒高、為第 5 拍鋪路的過渡武器」。",
      pts: ["沉拍頭刷上旋：短引拍、拍頭低於手腕 4 吋，轉髖由低向高刷出強烈上旋。", "貼網急沉軌跡：過網高度控制在 1 呎內，靠上旋急墜至對手膝蓋以下。", "抽球後前壓：收拍短促，擊球後立即前壓至中場過渡區踩煞，銜接第 5 拍。", "紅燈改吊球：失衡強抽易掛網或出界，改打頂點在己方半場的軟吊球。"],
      vids: [["Briones Pickleball", "現代低平急沉上旋抽球力學：沉拍頭 4 吋與轉髖刷球，使球過網急速下墜至膝蓋以下"], ["James Ignatowich", "第 3 拍抽球 vs. 吊球實戰決策：何時果斷強抽（Drive）、何時軟吊（Drop）"]],
      v: [
        { id: "drive", label: "GO 抽球 Drive", light: "go", lt: "綠燈｜選「抽球 (Drive)」", when: "對手接發偏淺／偏高；或對手仍在跑動上網未站穩。", why: "距離近、下壓角度大，成功率最高。快球抓腳底逼出肉包球，自己輕鬆打第 5 拍 Drop。",
          you: [0.9, 7.3], partner: [-1.6, 7.2], o1: [-1.35, -7.75], o2: [1.5, -2.5], tags: { o1: "接球者" },
          intro: "你剛發完球，守在底線後等對手的接發球。",
          path: RET_SHORT.concat([
            { p: [1.0, 0, 2.6], T: 1.1, cap: "對手被逼出肉包球" },
            { p: [1.1, 0.7, 3.3], T: 0.3, hit: "drop", cap: "第 5 拍輕鬆吊進廚房，順勢上網" },
            { p: [-0.9, 0, -1.2], T: 0.95 },
            { p: [-1.0, 0.35, -1.8], T: 0.3 }]),
          moves: [{ who: "o1", after: 0, delay: 0.45, to: [-0.8, -4.25], dur: 1.2 }, { who: "you", after: 2, delay: 0.25, to: [0.85, 3.95], dur: 0.7 }, { who: "partner", after: 2, delay: 0.3, to: [-1.4, 2.6], dur: 2.0 }, { who: "you", after: 5, delay: 0.3, to: [0.9, 2.6], dur: 0.9 }],
          caps: [{ after: 2, delay: 0.25, text: "收拍短促，擊球後立即前壓到過渡區踩煞" }] },
        { id: "crash", label: "GO Drive & Crash", light: "go", lt: "綠燈｜Drive & Crash", when: "對手仍在跑動上網未站穩。", why: "快球抓腳底逼出肉包球，讓搭檔 Drive & Crash 撲殺。",
          you: [0.9, 7.3], partner: [-1.6, 7.2], o1: [-1.35, -7.75], o2: [1.5, -2.5], tags: { o1: "接球者" },
          intro: "同樣的淺球。你抽球，搭檔同步搶網。",
          path: RET_SHORT.concat([
            { p: [-0.4, 1.5, 2.1], T: 0.8, by: "partner", sw: "smash", cap: "搭檔 Crash 搶到網前，肉包球直接撲殺" },
            { p: [0.6, 0, -4.2], T: 0.32, cap: "一抽一撲，兩拍結束" },
            { p: [1.2, 0.6, -6.6], T: 0.4 }]),
          moves: [{ who: "o1", after: 0, delay: 0.45, to: [-0.8, -4.25], dur: 1.2 }, { who: "partner", after: 2, delay: 0.02, to: [-0.85, 2.45], dur: 1.0 }, { who: "you", after: 2, delay: 0.25, to: [0.85, 3.6], dur: 0.8 }],
          caps: [{ after: 2, delay: 0.2, text: "你出手的同時，搭檔往前 Crash 搶網" }] },
        { id: "drop", label: "STOP 改吊球 Drop", light: "stop", lt: "紅燈｜改選「吊球 (Drop)」", when: "接發球極深且低、自己後仰失衡，且對手已站穩廚房線。", why: "失衡強抽易掛網或出界，改打頂點在己方半場的軟吊球爭取上網時間。",
          you: [0.9, 7.3], partner: [-1.6, 7.2], o1: [-1.35, -7.75], o2: [1.5, -2.5], tags: { o1: "接球者" },
          intro: "這次對手的接發球又高又深，人也已經上到廚房線。",
          path: RET_DEEP.concat([
            { p: [1.4, 0.4, 7.3], T: 0.3, hit: "drop", cap: "不硬抽：拍面開放、由低到高輕送" },
            { p: [-1.1, 0, -1.3], T: 1.3, cap: "頂點在己方半場，球軟軟掉進廚房" },
            { p: [-1.2, 0.4, -2.0], T: 0.3, by: "o1", sw: "dink", cap: "對手無法下壓，只能丁克回來" },
            { p: [0.8, 0, 1.3], T: 0.9 },
            { p: [1.0, 0.4, 1.9], T: 0.3 }]),
          moves: [{ who: "o1", after: 0, delay: 0.2, to: [-0.9, -2.5], dur: 1.6 }, { who: "you", after: 2, delay: 0.3, to: [1.0, 2.6], dur: 1.6 }, { who: "partner", after: 2, delay: 0.3, to: [-1.4, 2.6], dur: 1.6 }],
          caps: [{ after: 2, delay: 0.5, text: "軟吊球爭取到上網時間，你和搭檔一起推進" }] },
        { id: "net", label: "✕ 失衡硬抽", light: "stop", lt: "反例｜紅燈還硬抽", when: "接發球極深且低、自己後仰失衡，卻還是選擇強抽。", why: "失衡強抽易掛網或出界。",
          you: [0.9, 7.3], partner: [-1.6, 7.2], o1: [-1.35, -7.75], o2: [1.5, -2.5], tags: { o1: "接球者" },
          intro: "反例：同樣的深球，這次你硬抽。",
          path: RET_DEEP.concat([
            { p: [1.4, 0.4, 7.3], T: 0.3, hit: "force", cap: "反例：後仰失衡還硬抽" },
            { p: [0.2, 0.55, 0.06], T: 0.5, net: 1, cap: "掛網。紅燈時硬抽，失誤率最高" },
            { p: [0.2, 0, 0.4], T: 0.36 }]),
          moves: [{ who: "o1", after: 0, delay: 0.2, to: [-0.9, -2.5], dur: 1.6 }] }
      ] },

    { no: "05", title: "第 4 拍 Punch / Roll / Flick", en: "Shot 4 · Punch / Roll / Flick",
      key: "守住廚房，封鎖推進。依來球高度、旋轉與對手推進狀態，三維動態決策封鎖中前場。",
      pts: ["Punch 拳擊推截擊：拍置胸前 10–11 點鐘不拉拍，鎖死手腕向前短促刺拳頂出 6 吋。", "Roll 上旋滾截擊：拍面微扣 10°–15°、手肘在身前，前臂內旋（Pronation）由下往上滾刷。", "Flick 手腕快挑突擊：維持常規 Dink 隱蔽姿勢，觸球瞬間手指抓緊握把（Finger Squeeze）微甩手腕。", "低於網帶過多：紅燈禁挑。"],
      vids: [["Selkirk TV", "Punch vs. Roll Volley 高度判斷與分流：網前平推截擊與上旋滾截之關鍵高度判斷"], ["Zane Navratil", "網前 Roll、Poke 與 Flick 完整拆解：動作拆解與選擇時機"]],
      v: [
        { id: "punch", label: "Punch 拳擊推截擊", light: "go", lt: "Punch Volley 拳擊推截擊", when: "來球高於網帶，或迎擊對手第 3 拍強抽（Drive）。", why: "反應時間僅 0.3 秒，短刺拳最穩，直接借力把球深壓回對手底線／腳邊。",
          you: [1.15, 2.55], partner: [-1.4, 2.55], o1: [-1.0, -6.95], o2: [1.6, -7.0],
          intro: "你是接球方，已站穩廚房線。對手準備打第 3 拍。",
          path: [
            { p: [-1.4, 0.8, -6.6], by: "o1", sw: "drive", T: 0.8 },
            { p: [1.2, 1.2, 2.0], T: 0.5, hit: "punch", cap: "來球高於網帶：拍置胸前不拉拍，鎖腕短刺拳頂出 6 吋" },
            { p: [-1.2, 0, -5.6], T: 0.62, cap: "借力把球深壓回對手腳邊" },
            { p: [-1.35, 0.45, -6.9], T: 0.28 }],
          moves: [{ who: "o1", after: 0, delay: 0.2, to: [-0.85, -5.2], dur: 0.9 }] },
        { id: "roll", label: "Roll 上旋滾截擊", light: "go", lt: "Roll Volley 上旋滾截擊", when: "對手第 3 拍 Drop 略高，正處於網帶高度或下墜中需空中攔截時。", why: "高度不足以平推，靠上旋越網急沉壓在過渡區對手腳尖，逼其抬高下一拍。",
          you: [0.9, 2.55], partner: [-1.4, 2.55], o1: [-1.0, -7.35], o2: [1.6, -7.0],
          intro: "對手這次選擇吊球，但吊得略高。",
          path: [
            { p: [-1.4, 0.6, -7.0], by: "o1", sw: "drop", T: 0.8 },
            { p: [1.0, 0.9, 1.9], T: 1.1, hit: "roll", cap: "球在網帶高度下墜中：不等它落地，空中攔截" },
            { p: [-1.2, 0, -3.5], T: 0.62, cap: "拍面微扣、前臂內旋由下往上滾刷：上旋越網急沉" },
            { p: [-1.25, 0.25, -3.85], T: 0.14, by: "o1", sw: "scoop", cap: "球壓在過渡區對手腳尖，逼他往上撈" },
            { p: [1.05, 1.45, 2.0], T: 0.85, hit: "punch", cap: "抬高的下一拍：直接 Punch 收掉" },
            { p: [0.3, 0, -4.6], T: 0.4 },
            { p: [0.5, 0.5, -6.4], T: 0.35 }],
          moves: [{ who: "o1", after: 0, delay: 0.25, to: [-0.85, -4.2], dur: 1.3 }, { who: "o2", after: 0, delay: 0.25, to: [1.5, -4.4], dur: 1.4 }] },
        { id: "flick", label: "Flick 手腕快挑", light: "go", lt: "Flick 手腕快挑突擊", when: "廚房區來球略微浮高、對手重心偏離或未防備時。", why: "極高隱蔽性與短槓桿爆發球速，精準突襲對手執拍肩腋下（Chicken Wing）。",
          you: [0.9, 2.5], partner: [-1.4, 2.55], o1: [-0.5, -2.35], o2: [1.5, -2.5],
          intro: "雙方都在廚房線。對手的丁克略微浮高。",
          path: [
            { p: [-0.9, 0.45, -2.0], by: "o1", sw: "dink", T: 0.8 },
            { p: [1.0, 0.95, 1.9], T: 0.75, hit: "flick", cap: "姿勢和丁克一模一樣，觸球瞬間手指抓緊、微甩手腕" },
            { p: [-0.8, 1.0, -2.3], T: 0.27, by: "o1", sw: "punch", cap: "突襲對手執拍肩腋下（Chicken Wing）" },
            { p: [-0.3, 0.5, -0.06], T: 0.3, net: 1, cap: "對手被卡住，回球掛網" },
            { p: [-0.3, 0, -0.4], T: 0.34 }] },
        { id: "low", label: "✕ 低球禁挑", light: "stop", lt: "紅燈｜低於網帶過多禁挑", when: "來球低於網帶過多時。", why: "低於網帶過多紅燈禁挑：由下往上出手，球只會往上飛，等於把球送到對手拍前。",
          you: [0.9, 2.5], partner: [-1.4, 2.55], o1: [-0.5, -2.35], o2: [1.5, -2.5],
          intro: "反例：這顆丁克壓得很低。",
          path: [
            { p: [-0.9, 0.45, -2.0], by: "o1", sw: "dink", T: 0.8 },
            { p: [0.9, 0, 1.1], T: 0.9, cap: "球落在廚房裡，彈起來遠低於網帶" },
            { p: [1.0, 0.3, 1.6], T: 0.25, hit: "flick", open: 14, cap: "反例：低於網帶還硬挑" },
            { p: [-0.7, 1.55, -2.2], T: 0.44, by: "o1", sw: "smash", cap: "球只能往上飛，剛好送到對手拍前" },
            { p: [0.6, 0, 3.7], T: 0.34, cap: "被對手反擊下壓" },
            { p: [0.9, 0.7, 5.6], T: 0.4 }] }
      ] },

    { no: "06", title: "第 5 拍 Reset vs. 長丁克", en: "Shot 5 · Reset or Aggressive Dink",
      key: "化被動為主動，奪取網前控制權。",
      pts: ["五拍架構：過渡區軟手卸力進廚房；站穩廚房推對角長丁克造殺機。", "Reset：雙腳「Split & Freeze」煞停凍結，握力降至 2–3/10（海綿手感），拍面微開 45° 不揮拍，靠手肘避震把球輕卸入廚房。", "長丁克：膝蓋彎曲使重心低於網高，手腕鎖死、以肩膀為大擺鐘將球平推向對角線大角度或對手腳邊（拋物線頂點務必在己方半場）。"],
      vids: [["Tanner Pickleball", "過渡區 Split & Freeze 軟手重置秘訣：雙腳煞停凍結、2–3/10 握力卸力進廚房"], ["Tanner Pickleball", "2026 必備四大丁克球與長丁克壓迫：對角線大角度空間拉扯"]],
      v: [
        { id: "reset", label: "Reset 軟手重置", light: "go", lt: "Reset 過渡區軟手重置（受壓防守）", when: "人還卡在中場過渡區（無人區），且對手第 4 拍強勢截擊下壓至腳邊時。", why: "低於膝蓋硬抽 90% 掛網或彈高被殺！軟手卸入廚房能強迫對手彎腰向上提球、中斷其攻勢，為自己爭取最後兩步安全踏上廚房線。",
          you: [1.1, 4.5], partner: [-1.4, 4.6], o1: [-0.6, -2.65], o2: [1.5, -2.5],
          marks: [Z_K, on(Z_T)], intro: "你卡在過渡區，對手在網前準備下壓。",
          path: FEET.concat([
            { p: [1.1, 0.3, 4.0], T: 0.5, hit: "reset", cap: "Split & Freeze：握力 2–3/10、拍面開 45°、不揮拍" },
            { p: [-0.7, 0, -1.2], T: 1.05, cap: "靠手肘避震，把球輕卸進廚房" },
            { p: [-0.8, 0.35, -1.85], T: 0.3, by: "o1", sw: "dink", cap: "對手被迫彎腰向上提球，攻勢中斷" },
            { p: [0.9, 0, 1.3], T: 0.9 },
            { p: [1.05, 0.4, 1.9], T: 0.3 }]),
          moves: [{ who: "you", after: 1, delay: 0.3, to: [1.0, 2.6], dur: 0.9 }, { who: "partner", after: 1, delay: 0.3, to: [-1.4, 2.6], dur: 0.9 }],
          caps: [{ after: 1, delay: 0.75, text: "爭取最後兩步，安全踏上廚房線" }] },
        { id: "force", label: "✕ 低點硬抽", light: "stop", lt: "反例｜低於膝蓋硬抽", when: "人在過渡區、來球低於膝蓋，卻選擇發力回擊。", why: "低於膝蓋硬抽 90% 掛網或彈高被殺！",
          you: [1.1, 4.5], partner: [-1.4, 4.6], o1: [-0.6, -2.65], o2: [1.5, -2.5],
          marks: [Z_K, on(Z_T)], intro: "反例：同樣被壓在腳邊，這次你硬抽。",
          path: FEET.concat([
            { p: [1.1, 0.3, 4.0], T: 0.5, hit: "force", cap: "反例：低於膝蓋還硬抽" },
            { p: [-0.9, 1.75, -2.4], T: 0.5, by: "o1", sw: "smash", cap: "沒掛網，就是彈高" },
            { p: [0.5, 0, 3.6], T: 0.32, cap: "彈高的球被對手一拍扣殺" },
            { p: [0.9, 0.8, 6.9], T: 0.45 }]) },
        { id: "dink", label: "長丁克 Aggressive Dink", light: "go", lt: "長丁克 Aggressive Dink（網前壓迫）", when: "已順利推進站穩廚房線，或對手第 4 拍回球偏淺／偏高浮起時。", why: "瞄準球網中央 34 吋最低處打出壓迫腳邊或大角度長丁克，能大幅拉扯對手防線、逼其後退冒高，為下一拍 Speedup 突擊或扣殺創造絕佳機會。",
          you: [1.95, 2.55], partner: [-1.4, 2.55], o1: [-0.6, -2.35], o2: [1.5, -2.5],
          marks: [{ type: "label", p: [0, 1.3, 0], text: "網中央 34 吋", color: "#E4F23F" }, { type: "label", p: [3.35, 1.4, 0], text: "網柱 36 吋", color: "#F3F7FB" }, { type: "label", p: [-3.35, 1.4, 0], text: "網柱 36 吋", color: "#F3F7FB" },
            { type: "line", pts: [[1.9, 0.03, 1.9], [-2.5, 0.03, -1.7]], color: "#E4F23F", w: 0.08 }],
          intro: "你已站穩廚房線。網子中央最低，只有 34 吋。",
          path: [
            { p: [-1.0, 0.4, -2.0], by: "o1", sw: "dink", T: 0.8 },
            { p: [1.7, 0, 1.2], T: 0.85, cap: "對手第 4 拍回球偏淺" },
            { p: [1.9, 0.45, 1.9], T: 0.3, hit: "dink", cap: "屈膝降重心、手腕鎖死，以肩膀為大擺鐘平推" },
            { p: [-2.5, 0, -1.7], T: 0.8, cap: "從網中央最低處過網，落在對角大角度" },
            { p: [-2.85, 0.4, -2.4], T: 0.3, by: "o1", sw: "scoop", cap: "對手被拉出場邊、後退冒高" },
            { p: [0.5, 1.4, 2.0], T: 0.85, hit: "punch", cap: "殺機出現：Speedup 突擊中路空檔" },
            { p: [-0.3, 0, -4.6], T: 0.36 },
            { p: [-0.4, 0.5, -6.4], T: 0.35 }] }
      ] }
  ];

  /* Slides 13–15 of the deck: coaching and gear. */
  var INFO = {
    coach: { title: "Coach Ninja 專業教學課程", sub: "科學化動作動力鏈精修 ｜ 認證教學體系 & 高速攝影逐格診斷",
      facts: ["助學員突破 DUPR 3.0 → 4.0", "RPO / PPR 國際職業教練認證", "高速慢動作攝影逐格技術診斷，專治手腕代償翻腕與過渡區失誤。", "學員專屬福利：上課期間提供 Six Zero 全系列旗艦球拍免費試打體驗，並加贈專業球拍鉛片配重客製化調整指導。"],
      where: "雙北 · 天母 · 北投 · 內湖 專業場館彈性開班",
      plans: [["01", "1-on-1 / 1-on-2 個人技術精修班", "慢動作逐格拆解第 1–5 拍動力鏈，矯正手腕代償翻腕，打造穩健個人化動作模型。"], ["02", "雙打搭檔實戰戰術特訓營", "聚焦雙人連動走位、中路責任區劃分與「Drive & Crash」搶網撲殺戰術。"], ["03", "DUPR 分級進階班 & 新手體驗班（3–4 人精緻小班）", "從擊球決策紅綠燈到高強度情境對抗，深度內化實戰肌肉記憶。"]] },
    gear: { title: "Six Zero 官方球拍專屬優惠", sub: "澳洲頂級球拍：出色停球滯空感（Dwell Time）與減震大甜區，大幅提升第 3 拍 Drop 與第 5 拍 Reset 成功率。",
      paddles: [["Double Black Diamond (DBD)", "日本 Toray 生碳纖維", "極致手感回饋與軟手 Reset 首選，全能型選手的頂級標竿戰拍。", "第 5 拍 Reset"], ["Ruby Pro", "100% 杜邦 Kevlar 芳綸纖維面板", "提供極限咬球旋轉與超高耐磨度，是第 3 拍抽球（Drive）與上旋滾截擊（Roll）的進攻神器。", "第 3 拍 Drive ・ 第 4 拍 Roll"], ["Coral Pro / Infinity 系列", "熱壓一體成型製程", "結合周邊高密度減震發泡，全面擴大防守容錯甜區並賦予網前反擊爆炸力。", "第 4 拍 網前反擊"]],
      code: "NINJA", deal: "結帳輸入專屬折扣碼 NINJA，即享全品項 9 折。官方授權認證合作夥伴 · 正品保障 · 享原廠完整保固。" },
    links: [["預約課程", "ninjapb.vercel.app", "https://ninjapb.vercel.app"], ["官方 IG", "@ninjapbtw", "https://www.instagram.com/ninjapbtw"], ["Six Zero 官方商城", "sixzeropickleball.com", "https://sixzeropickleball.com"]]
  };

  root.NINJAPB = { CH: CH, SWINGS: SWINGS, INFO: INFO, DIM: { BL: BL, KL: KL, HW: HW } };
  if (typeof module !== "undefined" && module.exports) module.exports = root.NINJAPB;
})(typeof window !== "undefined" ? window : globalThis);
