use crate::search::SearchState;
use crate::wall::{NORTH_INDEX, NUM_TILES, encode_hand, remaining_counts};

/// DP の評価値: (tenpai, win, ev)
#[derive(Clone, Copy, Debug, Default)]
pub struct DpVal {
    pub tenpai: f64,
    pub win: f64,
    pub ev: f64,
}

/// 候補 a が現在の最良 b より厳密に優れているか (§3.3)
/// 優先順: ev 最大 → win 最大 → tenpai 最大 (同値なら先の候補＝小さい牌 index を維持)
#[inline]
pub fn is_better(a: DpVal, b: DpVal) -> bool {
    if a.ev != b.ev {
        return a.ev > b.ev;
    }
    if a.win != b.win {
        return a.win > b.win;
    }
    a.tenpai > b.tenpai
}

#[inline]
fn dp_idx(t: usize, sid: usize, e: usize, num_states: usize, e_count: usize) -> usize {
    ((t * num_states + sid) * e_count + e) * 3
}

#[inline]
fn rinshan_idx(t: usize, tid: usize, e: usize, num_tempai: usize, e_count: usize) -> usize {
    ((t * num_tempai + tid) * e_count + e) * 2
}

/// (聴牌形, 待ち) -> 値テーブルの wait_pair_idx を O(1) で引くルックアップ表を作る
fn build_wait_lookup(state: &SearchState) -> (Vec<u32>, usize) {
    let num_tempai = state.tempai_states.len();
    let mut lookup = vec![u32::MAX; num_tempai * NUM_TILES];
    let mut pair_idx: u32 = 0;
    for tid in 0..num_tempai {
        let start = state.tempai_wait_offsets[tid] as usize;
        let end = state.tempai_wait_offsets[tid + 1] as usize;
        for &w in &state.tempai_wait_tiles[start..end] {
            lookup[tid * NUM_TILES + w as usize] = pair_idx;
            pair_idx += 1;
        }
    }
    (lookup, pair_idx as usize)
}

/// 遷移先のうち最良の (next_sid, discard, val) を選ぶ
#[inline]
fn select_best_next(
    state: &SearchState,
    dp: &[f64],
    t_prev: usize,
    e: usize,
    e_count: usize,
    next_offset: u32,
    next_len: u16,
) -> (u32, u8, DpVal) {
    let num_states = state.states.len();
    let start = next_offset as usize;
    let end = start + next_len as usize;

    let first_sid = state.next_state_ids[start];
    let first_disc = state.next_discards[start];
    let idx0 = dp_idx(t_prev, first_sid as usize, e, num_states, e_count);
    let mut best_sid = first_sid;
    let mut best_disc = first_disc;
    let mut best_val = DpVal {
        tenpai: dp[idx0],
        win: dp[idx0 + 1],
        ev: dp[idx0 + 2],
    };

    for pos in (start + 1)..end {
        let nsid = state.next_state_ids[pos];
        let ndisc = state.next_discards[pos];
        let idx = dp_idx(t_prev, nsid as usize, e, num_states, e_count);
        let cand = DpVal {
            tenpai: dp[idx],
            win: dp[idx + 1],
            ev: dp[idx + 2],
        };
        if is_better(cand, best_val) {
            best_sid = nsid;
            best_disc = ndisc;
            best_val = cand;
        }
    }
    (best_sid, best_disc, best_val)
}

/// 後退 DP と前進計算を実行する (§3.3・§3.4・§3.7・§5.3)
///
/// `target_roots`: 指定すればその root_state_ids の添字分だけ結果を計算・返却する
/// (None なら全 root_state_ids 分)
pub fn run_solve(
    state: &mut SearchState,
    values: &[f64],
    target_roots: Option<&[usize]>,
) -> Vec<f64> {
    let max_t = state.max_draws as usize;
    let e_count = state.e_max as usize + 1;
    let num_states = state.states.len();
    let num_tempai = state.tempai_states.len();

    let (wait_lookup, total_waits) = build_wait_lookup(state);
    let expected_values_len = total_waits * e_count * 2;
    assert_eq!(
        values.len(),
        expected_values_len,
        "values length mismatch: expected {}, got {}",
        expected_values_len,
        values.len()
    );

    let mut dp = vec![0.0f64; (max_t + 1) * num_states * e_count * 3];
    let mut dp_tempai_rinshan = vec![0.0f64; (max_t + 1) * num_tempai * e_count * 2];

    // t = 0 の初期条件 (§3.7): 聴牌状態は tenpai = 1.0, win = 0.0, ev = 0.0
    for &sid in &state.tempai_states {
        for e in 0..e_count {
            let idx = dp_idx(0, sid as usize, e, num_states, e_count);
            dp[idx] = 1.0;
        }
    }

    let nuki_mode = state.nuki_mode;

    // 後退 DP: t = 1..=max_t
    for t in 1..=max_t {
        for sid in 0..num_states {
            let hand = state.states[sid].hand;
            let shanten = state.states[sid].shanten;

            if shanten == 0 {
                let tid = state.states[sid].tempai_index.expect("tempai_index missing") as usize;

                // e は降順 (e_max -> 0) に計算すると、同巡内の補充ツモ (e + 1) が参照可能
                for e_rev in 0..e_count {
                    let e = e_count - 1 - e_rev;
                    let (counts, total_c) =
                        remaining_counts(&hand, &state.h0, &state.u0, nuki_mode, e as u8);

                    if total_c == 0 {
                        let idx = dp_idx(t, sid, e, num_states, e_count);
                        dp[idx] = 1.0;
                        continue;
                    }
                    let total_f = total_c as f64;

                    // r = 1 (補充ツモ直後, nuki_mode かつ e > 0 のみ) と r = 0 (通常巡開始時)
                    let r_max = if nuki_mode && e > 0 { 1 } else { 0 };
                    for r in (0..=r_max).rev() {
                        let mut sum_win = 0.0;
                        let mut sum_ev = 0.0;

                        for (k, &ck) in counts.iter().enumerate() {
                            if ck == 0 {
                                continue;
                            }
                            let pk = (ck as f64) / total_f;
                            let wp = wait_lookup[tid * NUM_TILES + k];
                            if wp != u32::MAX {
                                let v_idx = ((wp as usize) * e_count + e) * 2 + r;
                                let v = values[v_idx];
                                if v > 0.0 {
                                    sum_win += pk;
                                    sum_ev += pk * v;
                                    continue;
                                }
                            }
                            if nuki_mode && k == NORTH_INDEX {
                                if e + 1 < e_count {
                                    let ridx = rinshan_idx(t, tid, e + 1, num_tempai, e_count);
                                    sum_win += pk * dp_tempai_rinshan[ridx];
                                    sum_ev += pk * dp_tempai_rinshan[ridx + 1];
                                }
                                continue;
                            }
                            // ツモ切りで t - 1, r = 0 へ
                            let prev_idx = dp_idx(t - 1, sid, e, num_states, e_count);
                            sum_win += pk * dp[prev_idx + 1];
                            sum_ev += pk * dp[prev_idx + 2];
                        }

                        if r == 1 {
                            let ridx = rinshan_idx(t, tid, e, num_tempai, e_count);
                            dp_tempai_rinshan[ridx] = sum_win;
                            dp_tempai_rinshan[ridx + 1] = sum_ev;
                        } else {
                            let idx = dp_idx(t, sid, e, num_states, e_count);
                            dp[idx] = 1.0;
                            dp[idx + 1] = sum_win;
                            dp[idx + 2] = sum_ev;
                        }
                    }
                }
            } else {
                // 非聴牌 (s >= 1)
                let trans_offset = state.states[sid].trans_offset as usize;
                let trans_len = state.states[sid].trans_len as usize;

                for e_rev in 0..e_count {
                    let e = e_count - 1 - e_rev;
                    let (counts, total_c) =
                        remaining_counts(&hand, &state.h0, &state.u0, nuki_mode, e as u8);
                    if total_c == 0 {
                        continue;
                    }
                    let total_f = total_c as f64;

                    let mut sum_tp = 0.0;
                    let mut sum_win = 0.0;
                    let mut sum_ev = 0.0;

                    if nuki_mode && counts[NORTH_INDEX] > 0 && e + 1 < e_count {
                        let p_north = (counts[NORTH_INDEX] as f64) / total_f;
                        let n_idx = dp_idx(t, sid, e + 1, num_states, e_count);
                        sum_tp += p_north * dp[n_idx];
                        sum_win += p_north * dp[n_idx + 1];
                        sum_ev += p_north * dp[n_idx + 2];
                    }

                    for tr in &state.transitions[trans_offset..(trans_offset + trans_len)] {
                        let ck = counts[tr.draw as usize];
                        if ck == 0 {
                            continue;
                        }
                        let pk = (ck as f64) / total_f;
                        let (_, _, best_val) = select_best_next(
                            state,
                            &dp,
                            t - 1,
                            e,
                            e_count,
                            tr.next_offset,
                            tr.next_len,
                        );
                        sum_tp += pk * best_val.tenpai;
                        sum_win += pk * best_val.win;
                        sum_ev += pk * best_val.ev;
                    }

                    let idx = dp_idx(t, sid, e, num_states, e_count);
                    dp[idx] = sum_tp;
                    dp[idx + 1] = sum_win;
                    dp[idx + 2] = sum_ev;
                }
            }
        }
    }

    // 前進計算: 指定候補ごとに [tenpai, win, ev, perTurn(draw_1..draw_T) * 3]
    let stride = 3 + max_t * 3;
    let roots_count = match target_roots {
        Some(list) => list.len(),
        None => state.root_state_ids.len(),
    };
    let mut result = Vec::with_capacity(roots_count * stride);

    let mut cur_mass = vec![0.0f64; num_states * e_count];
    let mut next_mass = vec![0.0f64; num_states * e_count];
    let mut rinshan_mass = vec![0.0f64; num_tempai * e_count];

    for i_idx in 0..roots_count {
        let root_pos = match target_roots {
            Some(list) => list[i_idx],
            None => i_idx,
        };
        let root_sid = state.root_state_ids[root_pos] as usize;
        let root_dp_idx = dp_idx(max_t, root_sid, 0, num_states, e_count);
        result.push(dp[root_dp_idx]);
        result.push(dp[root_dp_idx + 1]);
        result.push(dp[root_dp_idx + 2]);

        if max_t == 0 {
            continue;
        }

        cur_mass.fill(0.0);
        cur_mass[root_sid * e_count] = 1.0;
        let mut cum_win = 0.0;
        let mut cum_ev = 0.0;

        for turn in 1..=max_t {
            let t = max_t + 1 - turn;
            next_mass.fill(0.0);
            rinshan_mass.fill(0.0);

            for sid in 0..num_states {
                let hand = state.states[sid].hand;
                let shanten = state.states[sid].shanten;

                if shanten == 0 {
                    let tid =
                        state.states[sid].tempai_index.expect("tempai_index missing") as usize;

                    for e in 0..e_count {
                        let m0 = cur_mass[sid * e_count + e];
                        let m1 = if nuki_mode && e > 0 {
                            rinshan_mass[tid * e_count + e]
                        } else {
                            0.0
                        };
                        if m0 == 0.0 && m1 == 0.0 {
                            continue;
                        }
                        let (counts, total_c) =
                            remaining_counts(&hand, &state.h0, &state.u0, nuki_mode, e as u8);
                        if total_c == 0 {
                            continue;
                        }
                        let total_f = total_c as f64;

                        for (r, mass) in [(0usize, m0), (1usize, m1)] {
                            if mass == 0.0 {
                                continue;
                            }
                            for (k, &ck) in counts.iter().enumerate() {
                                if ck == 0 {
                                    continue;
                                }
                                let prob = mass * (ck as f64) / total_f;
                                let wp = wait_lookup[tid * NUM_TILES + k];
                                if wp != u32::MAX {
                                    let v_idx = ((wp as usize) * e_count + e) * 2 + r;
                                    let v = values[v_idx];
                                    if v > 0.0 {
                                        cum_win += prob;
                                        cum_ev += prob * v;
                                        continue;
                                    }
                                }
                                if nuki_mode && k == NORTH_INDEX {
                                    if e + 1 < e_count {
                                        rinshan_mass[tid * e_count + (e + 1)] += prob;
                                    }
                                    continue;
                                }
                                next_mass[sid * e_count + e] += prob;
                            }
                        }
                    }
                } else {
                    let trans_offset = state.states[sid].trans_offset as usize;
                    let trans_len = state.states[sid].trans_len as usize;

                    for e in 0..e_count {
                        let mass = cur_mass[sid * e_count + e];
                        if mass == 0.0 {
                            continue;
                        }
                        let (counts, total_c) =
                            remaining_counts(&hand, &state.h0, &state.u0, nuki_mode, e as u8);
                        if total_c == 0 {
                            continue;
                        }
                        let total_f = total_c as f64;

                        if nuki_mode && counts[NORTH_INDEX] > 0 && e + 1 < e_count {
                            let p_north = (counts[NORTH_INDEX] as f64) / total_f;
                            cur_mass[sid * e_count + (e + 1)] += mass * p_north;
                        }

                        for tr in &state.transitions[trans_offset..(trans_offset + trans_len)] {
                            let ck = counts[tr.draw as usize];
                            if ck == 0 {
                                continue;
                            }
                            let pk = (ck as f64) / total_f;
                            let (best_sid, _, _) = select_best_next(
                                state,
                                &dp,
                                t - 1,
                                e,
                                e_count,
                                tr.next_offset,
                                tr.next_len,
                            );
                            next_mass[best_sid as usize * e_count + e] += mass * pk;
                        }
                    }
                }
            }

            std::mem::swap(&mut cur_mass, &mut next_mass);

            let mut cur_tenpai_mass = 0.0;
            for &sid in &state.tempai_states {
                let base = sid as usize * e_count;
                for e in 0..e_count {
                    cur_tenpai_mass += cur_mass[base + e];
                }
            }
            result.push((cum_win + cur_tenpai_mass).min(1.0));
            result.push(cum_win.min(1.0));
            result.push(cum_ev);
        }
    }

    state.solved_tables.max_t = max_t;
    state.solved_tables.e_count = e_count;
    state.solved_tables.dp = dp;
    state.solved_tables.dp_tempai_rinshan = dp_tempai_rinshan;
    state.solved_tables.solved = true;

    result
}

/// 方針が選ぶ打牌の牌 index を返す (聴牌状態・該当なしは -1) (§5.3)
pub fn query_policy_discard(
    state: &SearchState,
    hand: &[u8; NUM_TILES],
    t: u32,
    e: u8,
    draw: u8,
) -> i8 {
    if !state.solved_tables.solved || t == 0 || t > state.max_draws || e > state.e_max {
        return -1;
    }
    if state.nuki_mode && draw as usize == NORTH_INDEX {
        return -1;
    }
    let key = encode_hand(hand);
    let Some(&sid) = state.state_map.get(&key) else {
        return -1;
    };
    let node = &state.states[sid as usize];
    if node.shanten == 0 {
        return -1;
    }

    let trans_offset = node.trans_offset as usize;
    let trans_len = node.trans_len as usize;
    let Some(tr) = state.transitions[trans_offset..(trans_offset + trans_len)]
        .iter()
        .find(|tr| tr.draw == draw)
    else {
        return -1;
    };

    let (_, best_disc, _) = select_best_next(
        state,
        &state.solved_tables.dp,
        t as usize - 1,
        e as usize,
        state.solved_tables.e_count,
        tr.next_offset,
        tr.next_len,
    );
    best_disc as i8
}
