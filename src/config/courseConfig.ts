// コース/ステージ設計の中核となる設定ファイル。
//
// 「旅・人力・冒険」を表現するため、3コース × 各6セクション(距離500m刻み)で
// 地域ごとのモチーフ・色・マイルストーン文言を定義する。
// 画像アセットは一切使わず、Canvas の図形/シルエット/テキストで描く。
//
// === 拡張方法（README にも記載） ===
// - コース追加 : courses[] に CourseConfig を1件足す
// - section追加: 対象 CourseConfig の sections[] に CourseSection を足す
// - motif追加  : CourseMotifType に型を足し、courseRenderer.ts の
//                drawCourseMotif() に case を1つ追加する

export type CourseId = 'japan' | 'route66' | 'africa';

/** モチーフの種類。courseRenderer.drawCourseMotif() が全種類を描画する */
export type CourseMotifType =
  | 'mountain' | 'tower' | 'gate' | 'castle' | 'temple' | 'shrine' | 'torii'
  | 'sign' | 'road_sign' | 'desert' | 'cactus' | 'gas_station' | 'motel'
  | 'bridge' | 'monument' | 'animal' | 'tree' | 'sun' | 'moon' | 'road_runner'
  | 'baobab' | 'savanna_tree' | 'elephant' | 'giraffe' | 'lion' | 'village'
  | 'market' | 'film_marker' | 'supporter_board';

/** セクション内に配置する背景モチーフ1個 */
export type CourseMotif = {
  id: string;
  type: CourseMotifType;
  label?: string;
  /** セクション内の水平位置（ワールド単位 px） */
  xOffset: number;
  /** 地面ラインからの垂直オフセット（正 = 上方向） */
  yOffset: number;
  /** 1.0 = 標準サイズ */
  scale: number;
  color?: string;
  accentColor?: string;
};

/** 距離で区切られたセクション（コースの6分割の1つ） */
export type CourseSection = {
  id: string;
  name: string;
  distanceStart: number;
  distanceEnd: number;
  backgroundColor: string;
  skyColor: string;
  groundColor: string;
  accentColor: string;
  motifs: CourseMotif[];
  milestoneText?: string;
};

/** コース定義 */
export type CourseConfig = {
  id: CourseId;
  name: string;
  displayName: string;
  description: string;
  themeColor: string;
  availableVehicles: Array<'runner' | 'bicycle' | 'rickshaw'>;
  sections: CourseSection[];
};

// ---- 日本縦断 -------------------------------------------------------------

const japan: CourseConfig = {
  id: 'japan',
  name: '日本縦断',
  displayName: '日本縦断',
  description: '北から南へ、人の力で日本を駆け抜ける。',
  themeColor: '#c8302f',
  availableVehicles: ['runner', 'bicycle', 'rickshaw'],
  sections: [
    {
      id: 'jp_hokkaido',
      name: '北海道・北の大地',
      distanceStart: 0,
      distanceEnd: 500,
      backgroundColor: '#3c5a74',
      skyColor: '#5b86ad',
      groundColor: '#e6ebf2',
      accentColor: '#ffffff',
      milestoneText: '北海道 START',
      motifs: [
        { id: 'jp_hk_mt1', type: 'mountain', xOffset: 120, yOffset: 90, scale: 1.4, color: '#aebfd0', accentColor: '#ffffff' },
        { id: 'jp_hk_mt2', type: 'mountain', xOffset: 420, yOffset: 70, scale: 1.1, color: '#9fb2c6', accentColor: '#ffffff' },
        { id: 'jp_hk_tree1', type: 'tree', xOffset: 300, yOffset: 0, scale: 0.9, color: '#2f4f3a' },
        { id: 'jp_hk_tree2', type: 'tree', xOffset: 640, yOffset: 0, scale: 1.0, color: '#274434' },
        { id: 'jp_hk_fox', type: 'animal', xOffset: 520, yOffset: 0, scale: 0.7, color: '#b5651d', label: 'キツネ' },
        { id: 'jp_hk_sign', type: 'sign', xOffset: 760, yOffset: 30, scale: 0.9, color: '#1f3a52', accentColor: '#ffffff', label: '北海道' },
      ],
    },
    {
      id: 'jp_tohoku',
      name: '東北',
      distanceStart: 500,
      distanceEnd: 1000,
      backgroundColor: '#4a5b3a',
      skyColor: '#6f8a5a',
      groundColor: '#3a2a18',
      accentColor: '#e8c34a',
      milestoneText: '東北を南へ',
      motifs: [
        { id: 'jp_th_mt1', type: 'mountain', xOffset: 160, yOffset: 80, scale: 1.2, color: '#5a6a48' },
        { id: 'jp_th_mt2', type: 'mountain', xOffset: 480, yOffset: 100, scale: 1.3, color: '#4f5e40' },
        { id: 'jp_th_tree', type: 'tree', xOffset: 360, yOffset: 0, scale: 0.95, color: '#2f4226' },
        { id: 'jp_th_lantern', type: 'sign', xOffset: 600, yOffset: 50, scale: 0.7, color: '#c8302f', accentColor: '#ffe08a', label: '祭' },
        { id: 'jp_th_cow', type: 'animal', xOffset: 740, yOffset: 0, scale: 0.8, color: '#c8302f', label: '赤べこ' },
      ],
    },
    {
      id: 'jp_tokyo',
      name: '東京',
      distanceStart: 1000,
      distanceEnd: 1500,
      backgroundColor: '#39414f',
      skyColor: '#5d6577',
      groundColor: '#2b2f38',
      accentColor: '#ff8c2a',
      milestoneText: 'TOKYO',
      motifs: [
        { id: 'jp_tk_tower', type: 'tower', xOffset: 200, yOffset: 200, scale: 1.5, color: '#d65a3a', accentColor: '#ffffff' },
        { id: 'jp_tk_bldg1', type: 'monument', xOffset: 380, yOffset: 120, scale: 1.0, color: '#4a5160', label: 'ビル' },
        { id: 'jp_tk_bldg2', type: 'monument', xOffset: 470, yOffset: 150, scale: 1.2, color: '#525a6b', label: 'ビル' },
        { id: 'jp_tk_gate', type: 'gate', xOffset: 620, yOffset: 0, scale: 1.0, color: '#c8302f', accentColor: '#1a1a1a', label: '雷門' },
        { id: 'jp_tk_rickshaw', type: 'animal', xOffset: 780, yOffset: 0, scale: 0.8, color: '#2a2a2a', label: '人力車' },
      ],
    },
    {
      id: 'jp_fuji',
      name: '富士・東海道',
      distanceStart: 1500,
      distanceEnd: 2000,
      backgroundColor: '#6a7fa0',
      skyColor: '#88a0c0',
      groundColor: '#4a3a2a',
      accentColor: '#f4a8c0',
      milestoneText: '富士を越えろ',
      motifs: [
        { id: 'jp_fj_fuji', type: 'mountain', xOffset: 260, yOffset: 130, scale: 1.9, color: '#5a6f96', accentColor: '#ffffff' },
        { id: 'jp_fj_sakura1', type: 'tree', xOffset: 160, yOffset: 0, scale: 0.9, color: '#f0a8c4' },
        { id: 'jp_fj_sakura2', type: 'tree', xOffset: 520, yOffset: 0, scale: 1.0, color: '#ec9ebc' },
        { id: 'jp_fj_torii', type: 'torii', xOffset: 640, yOffset: 0, scale: 1.0, color: '#d6402f' },
        { id: 'jp_fj_chaya', type: 'temple', xOffset: 780, yOffset: 0, scale: 0.8, color: '#6a4a2a', accentColor: '#3a2818', label: '茶屋' },
      ],
    },
    {
      id: 'jp_kyoto',
      name: '京都・奈良',
      distanceStart: 2000,
      distanceEnd: 2500,
      backgroundColor: '#5a4a52',
      skyColor: '#7a6470',
      groundColor: '#3a2e26',
      accentColor: '#d6402f',
      milestoneText: '古都を走る',
      motifs: [
        { id: 'jp_ky_torii', type: 'torii', xOffset: 130, yOffset: 0, scale: 1.2, color: '#d6402f' },
        { id: 'jp_ky_pagoda', type: 'temple', xOffset: 320, yOffset: 60, scale: 1.3, color: '#5a3a22', accentColor: '#2a1c10', label: '五重塔' },
        { id: 'jp_ky_deer', type: 'animal', xOffset: 480, yOffset: 0, scale: 0.7, color: '#9a6a3a', label: '鹿' },
        { id: 'jp_ky_town', type: 'monument', xOffset: 600, yOffset: 60, scale: 0.8, color: '#4a3a2e', label: '街並み' },
        { id: 'jp_ky_shrine', type: 'shrine', xOffset: 740, yOffset: 0, scale: 0.9, color: '#6a4a2a', accentColor: '#d6402f' },
      ],
    },
    {
      id: 'jp_kyushu',
      name: '九州・南へ',
      distanceStart: 2500,
      distanceEnd: 3000,
      backgroundColor: '#4a6a78',
      skyColor: '#6a94a0',
      groundColor: '#3a3026',
      accentColor: '#ff8c2a',
      milestoneText: '日本縦断 FINISH',
      motifs: [
        { id: 'jp_ks_volcano', type: 'mountain', xOffset: 180, yOffset: 110, scale: 1.5, color: '#5a4640', accentColor: '#ff6a3a' },
        { id: 'jp_ks_tree', type: 'tree', xOffset: 360, yOffset: 0, scale: 1.0, color: '#2f5a3a' },
        { id: 'jp_ks_castle', type: 'castle', xOffset: 520, yOffset: 0, scale: 1.1, color: '#4a4a52', accentColor: '#2a2a30' },
        { id: 'jp_ks_sun', type: 'sun', xOffset: 660, yOffset: 220, scale: 1.0, color: '#ffd86a' },
        { id: 'jp_ks_gate', type: 'gate', xOffset: 800, yOffset: 0, scale: 1.1, color: '#c8302f', accentColor: '#1a1a1a', label: 'GOAL' },
      ],
    },
  ],
};

// ---- Route66横断 ----------------------------------------------------------

const route66: CourseConfig = {
  id: 'route66',
  name: 'Route66横断',
  displayName: 'Route66横断',
  description: '砂漠、モーテル、ロードランナー。アメリカの道を走れ。',
  themeColor: '#1f4e8c',
  availableVehicles: ['runner', 'bicycle', 'rickshaw'],
  sections: [
    {
      id: 'r66_chicago',
      name: 'Chicago Start',
      distanceStart: 0,
      distanceEnd: 500,
      backgroundColor: '#39434f',
      skyColor: '#5a6878',
      groundColor: '#2c3038',
      accentColor: '#3a8ad6',
      milestoneText: 'CHICAGO START',
      motifs: [
        { id: 'r66_ch_sign', type: 'road_sign', xOffset: 120, yOffset: 60, scale: 1.0, color: '#1f4e8c', accentColor: '#ffffff', label: 'START' },
        { id: 'r66_ch_tower1', type: 'tower', xOffset: 300, yOffset: 200, scale: 1.3, color: '#3f4753', accentColor: '#5a6470' },
        { id: 'r66_ch_tower2', type: 'monument', xOffset: 420, yOffset: 160, scale: 1.1, color: '#454d5a', label: 'ビル' },
        { id: 'r66_ch_sign2', type: 'sign', xOffset: 560, yOffset: 40, scale: 0.7, color: '#c8302f', accentColor: '#ffe08a', label: '信号' },
        { id: 'r66_ch_bridge', type: 'bridge', xOffset: 720, yOffset: 0, scale: 1.1, color: '#4a525e' },
      ],
    },
    {
      id: 'r66_midwest',
      name: 'Midwest Road',
      distanceStart: 500,
      distanceEnd: 1000,
      backgroundColor: '#7a8a5a',
      skyColor: '#9aac74',
      groundColor: '#6a5a36',
      accentColor: '#e8c34a',
      milestoneText: 'MIDWEST ROAD',
      motifs: [
        { id: 'r66_mw_windmill', type: 'tower', xOffset: 160, yOffset: 80, scale: 0.9, color: '#d8d2c0', accentColor: '#8a8270' },
        { id: 'r66_mw_barn', type: 'monument', xOffset: 320, yOffset: 0, scale: 0.9, color: '#9a4a3a', label: '牧場' },
        { id: 'r66_mw_sign', type: 'road_sign', xOffset: 500, yOffset: 50, scale: 0.85, color: '#5a6a3a', accentColor: '#ffffff', label: '66' },
        { id: 'r66_mw_tree', type: 'tree', xOffset: 620, yOffset: 0, scale: 0.9, color: '#4a5a32' },
        { id: 'r66_mw_truck', type: 'monument', xOffset: 760, yOffset: 0, scale: 0.7, color: '#2a3038', label: 'トラック' },
      ],
    },
    {
      id: 'r66_tulsa',
      name: 'Tulsa',
      distanceStart: 1000,
      distanceEnd: 1500,
      backgroundColor: '#6a5a48',
      skyColor: '#8a7458',
      groundColor: '#4a3c2c',
      accentColor: '#ff5a3a',
      milestoneText: 'TULSA',
      motifs: [
        { id: 'r66_tl_sign', type: 'road_sign', xOffset: 130, yOffset: 70, scale: 1.1, color: '#1f4e8c', accentColor: '#ffffff', label: '66' },
        { id: 'r66_tl_gas', type: 'gas_station', xOffset: 320, yOffset: 0, scale: 1.0, color: '#c8503a', accentColor: '#f0e8d0' },
        { id: 'r66_tl_diner', type: 'sign', xOffset: 520, yOffset: 50, scale: 0.9, color: '#d63a6a', accentColor: '#ffe08a', label: 'DINER' },
        { id: 'r66_tl_neon', type: 'sign', xOffset: 700, yOffset: 80, scale: 0.7, color: '#3ad6c8', accentColor: '#ffffff', label: 'OPEN' },
        { id: 'r66_tl_motel', type: 'motel', xOffset: 800, yOffset: 0, scale: 0.9, color: '#5a6a8a', accentColor: '#ff8c2a' },
      ],
    },
    {
      id: 'r66_amarillo',
      name: 'Amarillo',
      distanceStart: 1500,
      distanceEnd: 2000,
      backgroundColor: '#9a6a48',
      skyColor: '#c08a52',
      groundColor: '#7a5234',
      accentColor: '#ff7a3a',
      milestoneText: 'AMARILLO',
      motifs: [
        { id: 'r66_am_sun', type: 'sun', xOffset: 220, yOffset: 210, scale: 1.3, color: '#ff9a4a' },
        { id: 'r66_am_desert', type: 'desert', xOffset: 380, yOffset: 0, scale: 1.2, color: '#b5824a' },
        { id: 'r66_am_sign', type: 'sign', xOffset: 520, yOffset: 60, scale: 0.9, color: '#8a4a2a', accentColor: '#ffe08a', label: 'COWBOY' },
        { id: 'r66_am_bigsign', type: 'road_sign', xOffset: 660, yOffset: 90, scale: 1.3, color: '#1f4e8c', accentColor: '#ffffff', label: 'BIG' },
        { id: 'r66_am_car', type: 'monument', xOffset: 800, yOffset: 0, scale: 0.7, color: '#3a3a44', label: '車' },
      ],
    },
    {
      id: 'r66_desert',
      name: 'New Mexico / Arizona Desert',
      distanceStart: 2000,
      distanceEnd: 2500,
      backgroundColor: '#a6603e',
      skyColor: '#cf8a52',
      groundColor: '#8a4a2e',
      accentColor: '#ffba6a',
      milestoneText: 'DESERT RUN',
      motifs: [
        { id: 'r66_ds_cactus1', type: 'cactus', xOffset: 130, yOffset: 0, scale: 1.0, color: '#3f7a4a' },
        { id: 'r66_ds_mesa1', type: 'monument', xOffset: 280, yOffset: 90, scale: 1.4, color: '#9a4a32', label: 'メサ' },
        { id: 'r66_ds_desert', type: 'desert', xOffset: 440, yOffset: 0, scale: 1.3, color: '#b5703e' },
        { id: 'r66_ds_rock', type: 'monument', xOffset: 580, yOffset: 50, scale: 0.9, color: '#8a3a28', label: '岩' },
        { id: 'r66_ds_cactus2', type: 'cactus', xOffset: 700, yOffset: 0, scale: 0.8, color: '#367040' },
        { id: 'r66_ds_runner', type: 'road_runner', xOffset: 820, yOffset: 0, scale: 0.9, color: '#3a2a1e' },
      ],
    },
    {
      id: 'r66_santamonica',
      name: 'Santa Monica',
      distanceStart: 2500,
      distanceEnd: 3000,
      backgroundColor: '#3a6a8a',
      skyColor: '#e08a5a',
      groundColor: '#caa86a',
      accentColor: '#ff8c2a',
      milestoneText: 'SANTA MONICA FINISH',
      motifs: [
        { id: 'r66_sm_sun', type: 'sun', xOffset: 200, yOffset: 190, scale: 1.4, color: '#ff7a4a' },
        { id: 'r66_sm_palm1', type: 'tree', xOffset: 320, yOffset: 0, scale: 1.2, color: '#2f6a4a' },
        { id: 'r66_sm_palm2', type: 'tree', xOffset: 560, yOffset: 0, scale: 1.0, color: '#2a5e44' },
        { id: 'r66_sm_pier', type: 'sign', xOffset: 460, yOffset: 60, scale: 1.0, color: '#1f4e8c', accentColor: '#ffe08a', label: 'PIER' },
        { id: 'r66_sm_gate', type: 'gate', xOffset: 800, yOffset: 0, scale: 1.1, color: '#1f4e8c', accentColor: '#ffe08a', label: 'FINISH' },
      ],
    },
  ],
};

// ---- アフリカ縦断 ---------------------------------------------------------

const africa: CourseConfig = {
  id: 'africa',
  name: 'アフリカ縦断',
  displayName: 'アフリカ縦断',
  description: '大地、村、サバンナ、朝日。冒険の先へ。',
  themeColor: '#d2691e',
  availableVehicles: ['runner', 'bicycle', 'rickshaw'],
  sections: [
    {
      id: 'af_desert',
      name: 'North Africa / Desert',
      distanceStart: 0,
      distanceEnd: 500,
      backgroundColor: '#b07a44',
      skyColor: '#dba85a',
      groundColor: '#caa05a',
      accentColor: '#ffd86a',
      milestoneText: 'DESERT START',
      motifs: [
        { id: 'af_ds_sun', type: 'sun', xOffset: 200, yOffset: 210, scale: 1.4, color: '#ffce5a' },
        { id: 'af_ds_dune1', type: 'desert', xOffset: 340, yOffset: 0, scale: 1.3, color: '#c08a4a' },
        { id: 'af_ds_dune2', type: 'desert', xOffset: 560, yOffset: 0, scale: 1.1, color: '#b8824a' },
        { id: 'af_ds_camel', type: 'animal', xOffset: 480, yOffset: 0, scale: 0.9, color: '#8a5a30', label: 'ラクダ' },
        { id: 'af_ds_oasis', type: 'tree', xOffset: 720, yOffset: 0, scale: 1.0, color: '#2f6a44' },
      ],
    },
    {
      id: 'af_village',
      name: 'Village Road',
      distanceStart: 500,
      distanceEnd: 1000,
      backgroundColor: '#a06a3e',
      skyColor: '#cf9050',
      groundColor: '#8a5a32',
      accentColor: '#e8a23a',
      milestoneText: 'VILLAGE ROAD',
      motifs: [
        { id: 'af_vl_village', type: 'village', xOffset: 180, yOffset: 0, scale: 1.1, color: '#9a5a32', accentColor: '#6a3a1e' },
        { id: 'af_vl_hut', type: 'village', xOffset: 420, yOffset: 0, scale: 0.8, color: '#8a4a28', accentColor: '#5a3018' },
        { id: 'af_vl_child', type: 'animal', xOffset: 560, yOffset: 0, scale: 0.55, color: '#3a2418', label: '子ども' },
        { id: 'af_vl_tree', type: 'tree', xOffset: 660, yOffset: 0, scale: 1.0, color: '#3a6a3a' },
        { id: 'af_vl_wave', type: 'animal', xOffset: 780, yOffset: 0, scale: 0.6, color: '#2a1c12', label: '手を振る人' },
      ],
    },
    {
      id: 'af_savanna',
      name: 'Savanna',
      distanceStart: 1000,
      distanceEnd: 1500,
      backgroundColor: '#b8924a',
      skyColor: '#e0b964',
      groundColor: '#9a7a3a',
      accentColor: '#ff9a3a',
      milestoneText: 'SAVANNA',
      motifs: [
        { id: 'af_sv_tree1', type: 'savanna_tree', xOffset: 150, yOffset: 0, scale: 1.2, color: '#5a4a2a', accentColor: '#3a5a30' },
        { id: 'af_sv_giraffe', type: 'giraffe', xOffset: 320, yOffset: 0, scale: 1.0, color: '#c89a4a' },
        { id: 'af_sv_elephant', type: 'elephant', xOffset: 500, yOffset: 0, scale: 1.0, color: '#6a6a72' },
        { id: 'af_sv_tree2', type: 'savanna_tree', xOffset: 640, yOffset: 0, scale: 0.9, color: '#544428', accentColor: '#36542c' },
        { id: 'af_sv_baobab', type: 'baobab', xOffset: 800, yOffset: 0, scale: 1.0, color: '#6a5236' },
      ],
    },
    {
      id: 'af_market',
      name: 'Market / City',
      distanceStart: 1500,
      distanceEnd: 2000,
      backgroundColor: '#9a5a3e',
      skyColor: '#c8804e',
      groundColor: '#7a4a2e',
      accentColor: '#ff7a3a',
      milestoneText: 'MARKET RUN',
      motifs: [
        { id: 'af_mk_market1', type: 'market', xOffset: 160, yOffset: 0, scale: 1.1, color: '#8a4a3a', accentColor: '#e8a23a' },
        { id: 'af_mk_market2', type: 'market', xOffset: 380, yOffset: 0, scale: 0.95, color: '#7a3a3a', accentColor: '#d6402f' },
        { id: 'af_mk_city', type: 'monument', xOffset: 540, yOffset: 80, scale: 0.9, color: '#5a4438', label: '街' },
        { id: 'af_mk_stall', type: 'market', xOffset: 680, yOffset: 0, scale: 0.8, color: '#8a5236', accentColor: '#3ad6c8' },
        { id: 'af_mk_lion', type: 'lion', xOffset: 800, yOffset: 0, scale: 0.85, color: '#c8923a' },
      ],
    },
    {
      id: 'af_redearth',
      name: 'Mountain / Red Earth',
      distanceStart: 2000,
      distanceEnd: 2500,
      backgroundColor: '#9a4a32',
      skyColor: '#cf6a44',
      groundColor: '#7a3826',
      accentColor: '#ff6a3a',
      milestoneText: 'RED EARTH',
      motifs: [
        { id: 'af_re_sun', type: 'sun', xOffset: 200, yOffset: 200, scale: 1.3, color: '#ff7a4a' },
        { id: 'af_re_mt1', type: 'mountain', xOffset: 340, yOffset: 110, scale: 1.5, color: '#7a3826', accentColor: '#9a4a32' },
        { id: 'af_re_mt2', type: 'mountain', xOffset: 560, yOffset: 80, scale: 1.1, color: '#6a3022' },
        { id: 'af_re_walker', type: 'animal', xOffset: 480, yOffset: 0, scale: 0.6, color: '#2a1810', label: '歩く人' },
        { id: 'af_re_board', type: 'supporter_board', xOffset: 720, yOffset: 0, scale: 1.0, color: '#d2691e', accentColor: '#ffffff' },
      ],
    },
    {
      id: 'af_finish',
      name: 'Finish / Restart',
      distanceStart: 2500,
      distanceEnd: 3000,
      backgroundColor: '#8a5a44',
      skyColor: '#e8a85a',
      groundColor: '#7a4a32',
      accentColor: '#ff8c2a',
      milestoneText: 'RESTART FINISH',
      motifs: [
        { id: 'af_fn_sun', type: 'sun', xOffset: 200, yOffset: 200, scale: 1.5, color: '#ffce5a' },
        { id: 'af_fn_film', type: 'film_marker', xOffset: 360, yOffset: 40, scale: 1.0, color: '#1a1a1a', accentColor: '#ffffff' },
        { id: 'af_fn_crowd', type: 'animal', xOffset: 520, yOffset: 0, scale: 0.6, color: '#2a1c14', label: '応援する人々' },
        { id: 'af_fn_crowd2', type: 'animal', xOffset: 600, yOffset: 0, scale: 0.55, color: '#33231a', label: '応援する人々' },
        { id: 'af_fn_gate', type: 'gate', xOffset: 800, yOffset: 0, scale: 1.1, color: '#d2691e', accentColor: '#ffffff', label: 'GOAL' },
      ],
    },
  ],
};

export const courses: CourseConfig[] = [japan, route66, africa];
