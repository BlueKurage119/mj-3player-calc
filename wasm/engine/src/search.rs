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
    /// 差の上限の余裕 M (§3.6a)
    pub diff_slack: u8,
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
    pub s_ref: i8,
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

/// 維持・戻しの打牌が差の上限を満たすか (§3.6a)
///
/// `diff(H′) ≤ (s_ref − s′) + M`(符号付き)。ツモ切り(H′ = H)は手が変わらないので常に許す
#[inline]
fn within_diff_limit(
    h_next: &[u8; NUM_TILES],
    hand13: &[u8; NUM_TILES],
    s_next: i8,
    h0: &[u8; NUM_TILES],
    s_ref: i8,
    hand_len: u8,
    diff_slack: u8,
) -> bool {
    if h_next == hand13 {
        return true;
    }
    let diff = diff_from_initial(h_next, h0, hand_len) as i16;
    diff <= (s_ref as i16 - s_next as i16) + diff_slack as i16
}

/// 14枚 H + draw に対する打牌候補のビットマスクを返す (§3.3・§3.6・§3.6a・§5.3)
///
/// 戻り値: 打牌候補とする牌の index ビットマスク (0..34)
#[allow(clippy::too_many_arguments)]
pub fn discard_candidates(
    hand13: &[u8; NUM_TILES],
    draw: u8,
    s: i8,
    h0: &[u8; NUM_TILES],
    s_ref: i8,
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
    // 前進 (s' = s-1) は常に許す。維持 (s' = s)・戻し (s' = s+1) は差の上限に従う
    let mut mask: u64 = 0;
    let allow_backtrack_by_s = opts.backtrack && s + 1 <= 3;

    for d in 0..NUM_TILES {
        if h14[d] == 0 {
            continue;
        }
        let mut h_next = h14;
        h_next[d] -= 1;

        let s_next = if s14 == s {
            // s14 == s: data.discards が維持、それ以外の手の牌種が戻し (s' == s + 1)
            if ((data.discards >> d) & 1) != 0 {
                s
            } else {
                s + 1
            }
        } else if ((data.discards >> d) & 1) != 0 {
            // s14 == s - 1: data.discards が前進
            s - 1
        } else {
            // 残りの牌種は維持か戻し。個別に向聴を求める (§3.3)
            let next_key = encode_hand(&h_next);
            if let Some(&sid) = state_map.get(&next_key) {
                states[sid as usize].shanten
            } else if let Some(&cached) = shanten_cache.get(&next_key) {
                cached
            } else {
                let sh = calc_shanten(&h_next, tile_limits, melds_m, Mode::all(), false, false)
                    .expect("invalid hand in calc_shanten")
                    .expect("calc_shanten returned None");
                shanten_cache.insert(next_key, sh);
                sh
            }
        };

        let ok = if s_next < s {
            true
        } else if s_next == s {
            within_diff_limit(&h_next, hand13, s_next, h0, s_ref, hand_len, opts.diff_slack)
        } else {
            allow_backtrack_by_s
                && within_diff_limit(&h_next, hand13, s_next, h0, s_ref, hand_len, opts.diff_slack)
        };
        if ok {
            mask |= 1u64 << d;
        }
    }
    mask
}

/// 探索を実行し、状態グラフと到達聴牌形を構築する (§5.3)
#[allow(clippy::too_many_arguments)]
pub fn run_search(
    h0: [u8; NUM_TILES],
    s_ref: i8,
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
                s_ref,
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
        s_ref,
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


#[cfg(test)]
mod tests {
    use super::*;
    use shanten_dp::make_tile_limits;

    /// "5p3s45567z" 形式の牌姿を34種の枚数配列に変換する
    fn h(s: &str) -> [u8; NUM_TILES] {
        let mut out = [0u8; NUM_TILES];
        let mut digits: Vec<usize> = vec![];
        for ch in s.chars() {
            if let Some(d) = ch.to_digit(10) {
                digits.push(d as usize);
            } else {
                let base = match ch {
                    'm' => 0,
                    'p' => 9,
                    's' => 18,
                    'z' => 27,
                    _ => continue,
                };
                for d in digits.drain(..) {
                    out[base + d - 1] += 1;
                }
            }
        }
        out
    }

    fn sh(hand: &[u8; NUM_TILES], m: usize) -> i8 {
        let limits = make_tile_limits(true);
        calc_shanten(hand, &limits, m, Mode::all(), false, true)
            .unwrap()
            .unwrap()
    }

    fn u0_of(h0: &[u8; NUM_TILES]) -> [u8; NUM_TILES] {
        let mut u0 = [0u8; NUM_TILES];
        for i in 0..NUM_TILES {
            if !(1..=7).contains(&i) {
                u0[i] = 4 - h0[i];
            }
        }
        u0
    }

    /// `discard_candidates` の許可・拒否を検査する。打牌 d が候補に含まれるか
    fn allowed(
        hand: &[u8; NUM_TILES],
        draw: usize,
        s: i8,
        h0: &[u8; NUM_TILES],
        s_ref: i8,
        melds_m: usize,
        slack: u8,
        discard: usize,
    ) -> bool {
        let limits = make_tile_limits(true);
        let mut cache = HashMap::with_hasher(FastBuildHasher);
        let sm = HashMap::with_hasher(FastBuildHasher);
        let hand_len = (melds_m * 3 + 1) as u8;
        let opts = SearchOptions {
            tegawari: true,
            backtrack: true,
            diff_slack: slack,
        };
        let mask = discard_candidates(
            hand, draw as u8, s, h0, s_ref, hand_len, melds_m, &limits, opts, &mut cache, &sm, &[],
        );
        (mask >> discard) & 1 == 1
    }

    /// A-4c: 差の定義は副露数に依らず、起点の候補は diff = 0 (13 固定の式では副露手で 6 になる)
    #[test]
    fn a4c_diff_is_zero_at_roots_for_melded_and_14_tile_inputs() {
        // 2副露(7枚)の13枚入力
        let h0 = h("5p3s45567z");
        assert_eq!(h0.iter().map(|&x| x as usize).sum::<usize>(), 7);
        assert_eq!(diff_from_initial(&h0, &h0, 7), 0);
        // 14枚入力(8枚): 各打牌候補は H0 の部分集合なので diff = 0
        let h14 = h("5p3s455667z");
        assert_eq!(h14.iter().map(|&x| x as usize).sum::<usize>(), 8);
        for d in 0..NUM_TILES {
            if h14[d] == 0 {
                continue;
            }
            let mut cand = h14;
            cand[d] -= 1;
            assert_eq!(diff_from_initial(&cand, &h14, 7), 0, "candidate {d}");
        }
        // 13 固定の式 13 − Σmin なら副露手では 6 になる(回帰防止の対比)
        let common: u8 = (0..NUM_TILES).map(|i| h0[i].min(h0[i])).sum();
        assert_eq!(13 - common as i32, 6);
    }

    /// A-5a: 戻しの許可・拒否の遷移 (M=0・1・2 で各1つ以上)
    #[test]
    fn a5a_backtrack_allow_and_reject_transitions() {
        // 許可 M=0: s_ref=3 で2回前進(s=1, diff=2)した後に片方を取り消す(s'=2, diff'=1)
        let h0 = h("5p3s45567z");
        let hh = h("33s55677z");
        assert_eq!(sh(&h0, 2), 3);
        assert_eq!(sh(&hh, 2), 1);
        assert_eq!(diff_from_initial(&hh, &h0, 7), 2);
        // 5p(index 13) をツモって 6z(index 33) を捨てる: s'=2, diff'=1 <= 3-2+M
        let mut hp = hh;
        hp[13] += 1;
        hp[33] -= 1;
        assert_eq!(sh(&hp, 2), 2);
        assert_eq!(diff_from_initial(&hp, &h0, 7), 1);
        for m in 0..3 {
            assert!(allowed(&hh, 13, 1, &h0, 3, 2, m, 33), "M={m}");
        }

        // 許可 M=1・拒否 M=0 (A-5d(2) の遷移): s_ref=2、前進1回(s=1, diff=1)の後、
        // ツモった牌を入れて前進で入れた牌を捨てる戻し(s'=2, diff'=1 <= 2-2+M)
        let h0b = h("34467s12z");
        let hb = h("3446s122z");
        assert_eq!(sh(&h0b, 2), 2);
        assert_eq!(sh(&hb, 2), 1);
        assert_eq!(diff_from_initial(&hb, &h0b, 7), 1);
        let mut hbp = hb;
        hbp[14] += 1;
        hbp[28] -= 1;
        assert_eq!(sh(&hbp, 2), 2);
        assert_eq!(diff_from_initial(&hbp, &h0b, 7), 1);
        assert!(!allowed(&hb, 14, 1, &h0b, 2, 2, 0, 28), "M=0 は拒否");
        assert!(allowed(&hb, 14, 1, &h0b, 2, 2, 1, 28), "M=1 は許可");
        assert!(allowed(&hb, 14, 1, &h0b, 2, 2, 2, 28), "M=2 は許可");

        // 許可 M=2・拒否 M=0・1 (A-5 の起点、A-5d(1) の遷移): s0=1=s_ref の起点から
        // 1枚入れ替えた2向聴(diff=1 <= 1-2+M)へ戻す
        let h0c = h("28p12377s");
        let hc = h0c;
        assert_eq!(sh(&h0c, 2), 1);
        let mut hcp = hc;
        hcp[8] += 1;
        hcp[24] -= 1;
        assert_eq!(sh(&hcp, 2), 2);
        assert_eq!(diff_from_initial(&hcp, &h0c, 7), 1);
        assert!(!allowed(&hc, 8, 1, &h0c, 1, 2, 0, 24), "M=0 は拒否");
        assert!(!allowed(&hc, 8, 1, &h0c, 1, 2, 1, 24), "M=1 は拒否");
        assert!(allowed(&hc, 8, 1, &h0c, 1, 2, 2, 24), "M=2 は許可");
    }

    /// 維持の打牌にも差の上限が課され(ツモ切りは常に許可)、M を増やすと候補は増えるだけ (§3.6a)
    #[test]
    fn a5a_maintain_is_limited_and_candidates_are_monotone_in_slack() {
        let limits = make_tile_limits(true);
        let sm = HashMap::with_hasher(FastBuildHasher);
        let cases = [
            ("28p12377s", 1i8, 8usize),
            ("5p3s45567z", 3, 13),
            ("46p12567s", 1, 16),
            ("34467s12z", 2, 14),
        ];
        let mut saw_difference = false;
        for (hs, s_ref, draw) in cases {
            let h0 = h(hs);
            let s = sh(&h0, 2);
            let mut prev: u64 = 0;
            for m in 0..4u8 {
                let mut cache = HashMap::with_hasher(FastBuildHasher);
                let opts = SearchOptions {
                    tegawari: true,
                    backtrack: true,
                    diff_slack: m,
                };
                let mask = discard_candidates(
                    &h0, draw as u8, s, &h0, s_ref, 7, 2, &limits, opts, &mut cache, &sm, &[],
                );
                // ツモ切りは常に許可
                if h0[draw] + 1 > 0 {
                    assert!((mask >> draw) & 1 == 1, "{hs} M={m}: ツモ切り");
                }
                // 各候補は条件を満たす
                let mut h14 = h0;
                h14[draw] += 1;
                for d in 0..NUM_TILES {
                    if (mask >> d) & 1 == 0 {
                        continue;
                    }
                    let mut hn = h14;
                    hn[d] -= 1;
                    let sn = sh(&hn, 2);
                    if sn >= s && hn != h0 {
                        let diff = diff_from_initial(&hn, &h0, 7) as i16;
                        assert!(diff <= (s_ref as i16 - sn as i16) + m as i16, "{hs} d={d} M={m}");
                    }
                }
                assert_eq!(prev & !mask, 0, "{hs}: M を増やしても候補は減らない");
                if m > 0 && mask != prev {
                    saw_difference = true;
                }
                prev = mask;
            }
        }
        assert!(saw_difference);
    }

    fn run(
        h0: &[u8; NUM_TILES],
        melds_m: usize,
        t: u32,
        m: u8,
        backtrack: bool,
        s_ref: i8,
    ) -> SearchState {
        let limits = make_tile_limits(true);
        let u0 = u0_of(h0);
        run_search(
            *h0,
            s_ref,
            h0,
            melds_m,
            u0,
            limits,
            false,
            t,
            SearchOptions {
                tegawari: true,
                backtrack,
                diff_slack: m,
            },
        )
    }

    /// A-4d: 到達する聴牌前の手は差の不変条件を満たし、T=6 の到達集合は T=12 の到達集合に含まれる
    #[test]
    fn a4d_diff_invariant_and_inclusion() {
        // 2副露(7枚)の2向聴(S3 の手は TS 側の A-4d で検査する。M=1 で約1万4千状態あり debug ビルドでは遅い)
        let cases: [(&str, usize); 1] = [("34467s12z", 2)];
        for (hs, melds_m) in cases {
            let h0 = h(hs);
            let s_ref = sh(&h0, melds_m);
            let hand_len = (melds_m * 3 + 1) as u8;
            for m in 0..2u8 {
                let r6 = run(&h0, melds_m, 6, m, true, s_ref);
                let r12 = run(&h0, melds_m, 12, m, true, s_ref);
                for r in [&r6, &r12] {
                    for node in r.states.iter().filter(|n| n.shanten >= 1) {
                        let diff = diff_from_initial(&node.hand, &h0, hand_len) as i16;
                        assert!(
                            diff <= (s_ref as i16 - node.shanten as i16) + m as i16,
                            "{hs} M={m}: 不変条件違反"
                        );
                    }
                }
                for node in r6.states.iter().filter(|n| n.shanten >= 1) {
                    assert!(
                        r12.state_map.contains_key(&encode_hand(&node.hand)),
                        "{hs} M={m}: T=6 の状態が T=12 に無い"
                    );
                }
                let pre = |r: &SearchState| r.states.len() - r.tempai_states.len();
                println!(
                    "A-4d参考 {hs} M={m}: 聴牌前の手の異なるキー数 T=6:{} T=12:{}",
                    pre(&r6),
                    pre(&r12)
                );
            }
        }
    }
}
