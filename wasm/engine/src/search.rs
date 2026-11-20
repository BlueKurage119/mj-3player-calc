use std::collections::{HashMap, VecDeque};

use shanten_dp::{Mode, calc_shanten, calc_shanten2};

use crate::wall::{
    FastBuildHasher, NORTH_INDEX, NUM_TILES, can_draw_tile, diff_from_initial, encode_hand,
};

/// 探索オプション (§3.6)
#[derive(Clone, Copy, Debug)]
pub struct SearchOptions {
    pub tegawari: bool,
    pub backtrack: bool,
    pub diff_margin: u8,
}

/// 非聴牌状態からあるツモ牌 k を引いたときの打牌候補リスト(CSR 参照)
#[derive(Clone, Copy, Debug)]
pub struct DrawTransition {
    pub draw: u8,
    pub next_offset: u32,
    pub next_len: u16,
}

/// 探索で到達した13枚換算の状態
#[derive(Clone, Debug)]
pub struct StateNode {
    pub hand: [u8; NUM_TILES],
    pub shanten: i8,
    /// s == 0 のとき、待ちビットマスク。s >= 1 のときは 0
    pub waits: u64,
    /// s == 0 のとき、聴牌形テーブル内の添字 (None は s >= 1)
    pub tempai_index: Option<u32>,
    /// s >= 1 のとき、transitions 配列内の開始位置と個数
    pub trans_offset: u32,
    pub trans_len: u16,
}

/// DP 状態（後退 DP と前進計算のテーブルを保持し、`policy_discard` に備える）
#[derive(Clone, Debug, Default)]
pub struct SolvedTables {
    /// dp[t][state_id * e_count + e] = (tenpai, win, ev)
    /// メモリと速度のため、1次元配列で保持する: ((t * num_states + state_id) * e_count + e)
    pub max_t: usize,
    pub e_count: usize,
    /// 非聴牌状態用と聴牌状態の r=0 用 (通常巡の開始時):
    /// 要素は [tenpai, win, ev] の3つ組
    pub dp: Vec<f64>,
    /// 聴牌状態の補充ツモ直後 (r=true) 用:
    /// 要素は [win, ev] の2つ組 (tenpai は常に 1)
    /// サイズ: ((t * num_tempai + tempai_id) * e_count + e) * 2
    pub dp_tempai_rinshan: Vec<f64>,
    /// 14枚入力の各候補に対応した解決済みかどうか
    pub solved: bool,
}

/// 探索結果ハンドル
#[allow(dead_code)]
pub struct SearchState {
    pub h0: [u8; NUM_TILES],
    pub s0: i8,
    pub hand_len: u8,
    pub melds_m: usize,
    pub u0: [u8; NUM_TILES],
    pub tile_limits: [u8; NUM_TILES + 1],
    pub nuki_mode: bool,
    pub max_draws: u32,
    pub options: SearchOptions,
    pub e_max: u8,

    /// 探索出発点（14枚入力の打牌候補ごと、または13枚入力の1件）の state_id
    pub root_state_ids: Vec<u32>,

    /// 訪問した全13枚状態 (0..states.len())
    pub states: Vec<StateNode>,
    pub state_map: HashMap<u128, u32, FastBuildHasher>,

    /// 到達した聴牌形 (s == 0) の state_id リスト (0..tempai_states.len())
    pub tempai_states: Vec<u32>,
    /// 聴牌形ごとの待ち牌 index 列への CSR オフセット (長さ tempai_states.len() + 1)
    pub tempai_wait_offsets: Vec<u32>,
    /// 聴牌形ごとの待ち牌 index (0..34)
    pub tempai_wait_tiles: Vec<u8>,

    /// 各 (非聴牌状態, ツモ牌 k) の遷移先リスト (CSR)
    pub transitions: Vec<DrawTransition>,
    /// 各 DrawTransition の遷移先 state_id 列
    pub next_state_ids: Vec<u32>,
    /// 遷移に対応する打牌 index (next_state_ids と同じ長さ。policy_discard で使用)
    pub next_discards: Vec<u8>,

    /// 解決済み DP テーブル (policy_discard 用)
    pub solved_tables: SolvedTables,
}

/// 14枚 H + draw に対する打牌候補のビットマスクを返す (§3.3・§3.6・§5.3)
///
/// 戻り値: 打牌候補とする牌の index ビットマスク (0..34)
pub fn discard_candidates(
    hand13: &[u8; NUM_TILES],
    draw: u8,
    s: i8,
    h0: &[u8; NUM_TILES],
    s0: i8,
    hand_len: u8,
    melds_m: usize,
    tile_limits: &[u8; NUM_TILES + 1],
    opts: SearchOptions,
    shanten_cache: &mut HashMap<u128, i8, FastBuildHasher>,
    state_map: &HashMap<u128, u32, FastBuildHasher>,
    states: &[StateNode],
) -> u64 {
    let mut h14 = *hand13;
    h14[draw as usize] += 1;

    let data = calc_shanten2(&h14, tile_limits, melds_m, Mode::all(), false, true)
        .expect("invalid hand in discard_candidates")
        .expect("shanten calculation returned None");
    let s14 = data.shanten;

    // 構成 A (手替わりなし)
    if !opts.tegawari {
        if s14 < s {
            // 前進できるツモ: 前進する打牌のみ
            return data.discards;
        }
        // 前進できないツモ: ツモ切りのみ (§3.6)
        return 1u64 << draw;
    }

    // 構成 B′ (手替わりあり・戻しなし) / B′+戻し
    if s14 == s {
        // s14 == s: data.discards が維持 (s' == s)、それ以外の手の牌種が戻し (s' == s + 1)
        let mut mask = data.discards;
        if opts.backtrack && s + 1 <= 3 {
            let max_diff = (s0 as u8).saturating_add(opts.diff_margin);
            for d in 0..NUM_TILES {
                if h14[d] == 0 || ((data.discards >> d) & 1) != 0 {
                    continue;
                }
                let mut h_next = h14;
                h_next[d] -= 1;
                if diff_from_initial(&h_next, h0, hand_len) <= max_diff {
                    mask |= 1u64 << d;
                }
            }
        }
        return mask;
    }

    // s14 == s - 1: data.discards が前進 (s' == s - 1)。
    // 残りの牌種は維持 (s' == s) または戻し (s' == s + 1) なので個別に判定する (§3.3)
    let mut mask = data.discards;
    let allow_backtrack_by_s = opts.backtrack && s + 1 <= 3;
    let max_diff = (s0 as u8).saturating_add(opts.diff_margin);

    for d in 0..NUM_TILES {
        if h14[d] == 0 || ((data.discards >> d) & 1) != 0 {
            continue;
        }
        let mut h_next = h14;
        h_next[d] -= 1;
        let next_key = encode_hand(&h_next);

        let s_next = if let Some(&sid) = state_map.get(&next_key) {
            states[sid as usize].shanten
        } else if let Some(&cached) = shanten_cache.get(&next_key) {
            cached
        } else {
            let sh = calc_shanten(&h_next, tile_limits, melds_m, Mode::all(), false, false)
                .expect("invalid hand in calc_shanten")
                .expect("calc_shanten returned None");
            shanten_cache.insert(next_key, sh);
            sh
        };

        if s_next == s {
            // 維持
            mask |= 1u64 << d;
        } else if allow_backtrack_by_s && s_next == s + 1 {
            // 戻し (案Y: s' <= 3, 案Q: diff <= s0 + K)
            if diff_from_initial(&h_next, h0, hand_len) <= max_diff {
                mask |= 1u64 << d;
            }
        }
    }
    mask
}

/// 探索を実行し、状態グラフと到達聴牌形を構築する (§5.3)
#[allow(clippy::too_many_arguments)]
pub fn run_search(
    h0: [u8; NUM_TILES],
    s0: i8,
    hands_flat: &[u8],
    melds_m: usize,
    u0: [u8; NUM_TILES],
    tile_limits: [u8; NUM_TILES + 1],
    nuki_mode: bool,
    max_draws: u32,
    opts: SearchOptions,
) -> SearchState {
    assert_eq!(hands_flat.len() % NUM_TILES, 0);
    let num_roots = hands_flat.len() / NUM_TILES;
    let hand_len = (melds_m * 3 + 1) as u8;
    let e_max = if nuki_mode {
        u0[NORTH_INDEX].min(4)
    } else {
        0
    };

    let mut states: Vec<StateNode> = Vec::new();
    let mut state_map: HashMap<u128, u32, FastBuildHasher> =
        HashMap::with_hasher(FastBuildHasher);
    let mut shanten_cache: HashMap<u128, i8, FastBuildHasher> =
        HashMap::with_hasher(FastBuildHasher);

    let mut tempai_states: Vec<u32> = Vec::new();
    let mut tempai_wait_offsets: Vec<u32> = Vec::new();
    tempai_wait_offsets.push(0);
    let mut tempai_wait_tiles: Vec<u8> = Vec::new();

    let mut transitions: Vec<DrawTransition> = Vec::new();
    let mut next_state_ids: Vec<u32> = Vec::new();
    let mut next_discards: Vec<u8> = Vec::new();

    let mut queue: VecDeque<(u32, u32)> = VecDeque::new(); // (state_id, depth)

    // 状態登録ヘルパ
    let register_state = |hand: [u8; NUM_TILES],
                              depth: u32,
                              states: &mut Vec<StateNode>,
                              state_map: &mut HashMap<u128, u32, FastBuildHasher>,
                              shanten_cache: &mut HashMap<u128, i8, FastBuildHasher>,
                              tempai_states: &mut Vec<u32>,
                              tempai_wait_offsets: &mut Vec<u32>,
                              tempai_wait_tiles: &mut Vec<u8>,
                              queue: &mut VecDeque<(u32, u32)>|
     -> u32 {
        let key = encode_hand(&hand);
        if let Some(&sid) = state_map.get(&key) {
            return sid;
        }
        let data = calc_shanten2(&hand, &tile_limits, melds_m, Mode::all(), false, true)
            .expect("invalid hand in register_state")
            .expect("calc_shanten2 returned None");
        shanten_cache.insert(key, data.shanten);

        let sid = states.len() as u32;
        state_map.insert(key, sid);

        if data.shanten == 0 {
            let tid = tempai_states.len() as u32;
            tempai_states.push(sid);
            for w in 0..NUM_TILES {
                if ((data.waits >> w) & 1) != 0 {
                    tempai_wait_tiles.push(w as u8);
                }
            }
            tempai_wait_offsets.push(tempai_wait_tiles.len() as u32);
            states.push(StateNode {
                hand,
                shanten: 0,
                waits: data.waits,
                tempai_index: Some(tid),
                trans_offset: 0,
                trans_len: 0,
            });
        } else {
            states.push(StateNode {
                hand,
                shanten: data.shanten,
                waits: 0,
                tempai_index: None,
                trans_offset: 0,
                trans_len: 0,
            });
            if depth < max_draws {
                queue.push_back((sid, depth));
            }
        }
        sid
    };

    let mut root_state_ids = Vec::with_capacity(num_roots);
    for r in 0..num_roots {
        let mut hand = [0u8; NUM_TILES];
        hand.copy_from_slice(&hands_flat[r * NUM_TILES..(r + 1) * NUM_TILES]);
        let sid = register_state(
            hand,
            0,
            &mut states,
            &mut state_map,
            &mut shanten_cache,
            &mut tempai_states,
            &mut tempai_wait_offsets,
            &mut tempai_wait_tiles,
            &mut queue,
        );
        root_state_ids.push(sid);
    }

    // BFS 展開
    while let Some((sid, depth)) = queue.pop_front() {
        let hand = states[sid as usize].hand;
        let s = states[sid as usize].shanten;
        debug_assert!(s >= 1 && depth < max_draws);

        let trans_start = transitions.len() as u32;
        let next_depth = depth + 1;

        for k in 0..NUM_TILES {
            // 抜きドラ設定の北は、補充ツモであり手牌を変えないため遷移テーブルに含めない
            if nuki_mode && k == NORTH_INDEX {
                continue;
            }
            // 山に残っていない牌(e=0でも0枚)はツモれない
            if !can_draw_tile(&hand, &h0, &u0, k) {
                continue;
            }

            let cand_mask = discard_candidates(
                &hand,
                k as u8,
                s,
                &h0,
                s0,
                hand_len,
                melds_m,
                &tile_limits,
                opts,
                &mut shanten_cache,
                &state_map,
                &states,
            );

            let next_start = next_state_ids.len() as u32;
            let mut h14 = hand;
            h14[k] += 1;

            for d in 0..NUM_TILES {
                if ((cand_mask >> d) & 1) == 0 {
                    continue;
                }
                let mut h_next = h14;
                h_next[d] -= 1;
                let next_sid = register_state(
                    h_next,
                    next_depth,
                    &mut states,
                    &mut state_map,
                    &mut shanten_cache,
                    &mut tempai_states,
                    &mut tempai_wait_offsets,
                    &mut tempai_wait_tiles,
                    &mut queue,
                );
                next_state_ids.push(next_sid);
                next_discards.push(d as u8);
            }

            let next_len = (next_state_ids.len() as u32 - next_start) as u16;
            if next_len > 0 {
                transitions.push(DrawTransition {
                    draw: k as u8,
                    next_offset: next_start,
                    next_len,
                });
            }
        }

        let trans_len = (transitions.len() as u32 - trans_start) as u16;
        states[sid as usize].trans_offset = trans_start;
        states[sid as usize].trans_len = trans_len;
    }

    SearchState {
        h0,
        s0,
        hand_len,
        melds_m,
        u0,
        tile_limits,
        nuki_mode,
        max_draws,
        options: opts,
        e_max,
        root_state_ids,
        states,
        state_map,
        tempai_states,
        tempai_wait_offsets,
        tempai_wait_tiles,
        transitions,
        next_state_ids,
        next_discards,
        solved_tables: SolvedTables::default(),
    }
}
