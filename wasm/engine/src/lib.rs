mod dp;
mod search;
mod wall;

use shanten_dp::{Mode, calc_shanten, make_tile_limits};
use wasm_bindgen::prelude::*;

use crate::dp::{query_policy_discard, run_solve};
use crate::search::{SearchOptions, SearchState, run_search};
use crate::wall::NUM_TILES;

/// 探索結果を保持するハンドル (§5.3)
#[wasm_bindgen]
pub struct SearchResult {
    inner: SearchState,
}

#[wasm_bindgen]
impl SearchResult {
    /// 到達した聴牌形の件数
    #[wasm_bindgen(getter)]
    pub fn tempai_count(&self) -> usize {
        self.inner.tempai_states.len()
    }

    /// 訪問した全13枚状態数
    #[wasm_bindgen(getter)]
    pub fn state_count(&self) -> usize {
        self.inner.states.len()
    }

    /// 探索中に追加で抜き得る北の最大枚数 (0〜4)
    #[wasm_bindgen(getter)]
    pub fn max_extra_nuki(&self) -> u8 {
        self.inner.e_max
    }

    /// 待ちと聴牌形の組の総数 (values 配列の長さ計算に使用)
    #[wasm_bindgen(getter)]
    pub fn total_waits(&self) -> usize {
        self.inner.tempai_wait_tiles.len()
    }

    /// 到達した聴牌形の牌数配列を平坦にして返す (tempai_count * 34)
    pub fn tempai_hands(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(self.inner.tempai_states.len() * NUM_TILES);
        for &sid in &self.inner.tempai_states {
            out.extend_from_slice(&self.inner.states[sid as usize].hand);
        }
        out
    }

    /// 聴牌形ごとの待ち枚数(長さ tempai_count)
    pub fn tempai_wait_counts(&self) -> Vec<u32> {
        let n = self.inner.tempai_states.len();
        let mut out = Vec::with_capacity(n);
        for i in 0..n {
            out.push(self.inner.tempai_wait_offsets[i + 1] - self.inner.tempai_wait_offsets[i]);
        }
        out
    }

    /// 全聴牌形の待ち牌 index 列 (0..34)
    pub fn tempai_wait_tiles(&self) -> Vec<u8> {
        self.inner.tempai_wait_tiles.clone()
    }

    /// テスト用: 訪問した全13枚状態の手牌配列 (state_count * 34)
    pub fn all_state_hands(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(self.inner.states.len() * NUM_TILES);
        for s in &self.inner.states {
            out.extend_from_slice(&s.hand);
        }
        out
    }

    /// テスト用: 向聴が増える遷移(戻し)の本数
    pub fn backtrack_edge_count(&self) -> usize {
        let st = &self.inner;
        let mut count = 0;
        for node in &st.states {
            if node.shanten == 0 {
                continue;
            }
            let off = node.trans_offset as usize;
            for tr in &st.transitions[off..off + node.trans_len as usize] {
                let start = tr.next_offset as usize;
                for &nsid in &st.next_state_ids[start..start + tr.next_len as usize] {
                    if st.states[nsid as usize].shanten > node.shanten {
                        count += 1;
                    }
                }
            }
        }
        count
    }

    /// テスト用: 全遷移で現れたツモ牌・打牌・待ちの index のビットマスク
    pub fn seen_tile_masks(&self) -> Vec<u32> {
        let mut draw_mask: u64 = 0;
        for tr in &self.inner.transitions {
            draw_mask |= 1u64 << tr.draw;
        }
        let mut disc_mask: u64 = 0;
        for &d in &self.inner.next_discards {
            disc_mask |= 1u64 << d;
        }
        let mut wait_mask: u64 = 0;
        for &sid in &self.inner.tempai_states {
            wait_mask |= self.inner.states[sid as usize].waits;
        }
        vec![
            draw_mask as u32,
            (draw_mask >> 32) as u32,
            disc_mask as u32,
            (disc_mask >> 32) as u32,
            wait_mask as u32,
            (wait_mask >> 32) as u32,
        ]
    }
}

/// 三麻の牌の上限 (2m〜8m を 0、他を 4、番兵 index 34 は 4)
#[wasm_bindgen]
pub fn sanma_tile_limits() -> Vec<u8> {
    make_tile_limits(true).to_vec()
}

/// 三麻ルールでの向聴数を返す (13枚/14枚換算ともに対応)
#[wasm_bindgen]
pub fn calc_shanten_sanma(hand: &[u8], melds_m: usize) -> i8 {
    assert_eq!(hand.len(), NUM_TILES, "hand must have 34 elements");
    let mut h = [0u8; NUM_TILES];
    h.copy_from_slice(hand);
    let limits = make_tile_limits(true);
    calc_shanten(&h, &limits, melds_m, Mode::all(), false, true)
        .expect("invalid hand in calc_shanten_sanma")
        .expect("calc_shanten_sanma returned None")
}

/// 探索を実行して SearchResult ハンドルを返す (§5.3)
#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn search(
    h0: &[u8],
    hands: &[u8],
    melds_m: usize,
    u0: &[u8],
    tile_limits: &[u8],
    nuki_mode: bool,
    max_draws: u32,
    tegawari: bool,
    backtrack: bool,
    diff_slack: u8,
    s_ref: i8,
) -> SearchResult {
    assert_eq!(h0.len(), NUM_TILES);
    assert_eq!(u0.len(), NUM_TILES);
    assert_eq!(tile_limits.len(), NUM_TILES + 1);

    let mut h0_arr = [0u8; NUM_TILES];
    h0_arr.copy_from_slice(h0);
    let mut u0_arr = [0u8; NUM_TILES];
    u0_arr.copy_from_slice(u0);
    let mut limits_arr = [0u8; NUM_TILES + 1];
    limits_arr.copy_from_slice(tile_limits);

    let state = run_search(
        h0_arr,
        s_ref,
        hands,
        melds_m,
        u0_arr,
        limits_arr,
        nuki_mode,
        max_draws,
        SearchOptions {
            tegawari,
            backtrack,
            diff_slack,
        },
    );
    SearchResult { inner: state }
}

/// 全候補に対する後退 DP と前進計算を実行する (§5.3)
#[wasm_bindgen]
pub fn solve(handle: &mut SearchResult, values: &[f64]) -> Vec<f64> {
    run_solve(&mut handle.inner, values, None)
}

/// 指定した候補インデックス群だけに対して後退 DP と前進計算を実行する
#[wasm_bindgen]
pub fn solve_for_candidates(
    handle: &mut SearchResult,
    values: &[f64],
    candidate_indices: &[usize],
) -> Vec<f64> {
    run_solve(&mut handle.inner, values, Some(candidate_indices))
}

/// solve 後に方針が選ぶ打牌の牌 index を返す (聴牌状態・該当なしは -1) (§5.3)
#[wasm_bindgen]
pub fn policy_discard(handle: &SearchResult, hand: &[u8], t: u32, e: u8, draw: u8) -> i8 {
    if hand.len() != NUM_TILES {
        return -1;
    }
    let mut h = [0u8; NUM_TILES];
    h.copy_from_slice(hand);
    query_policy_discard(&handle.inner, &h, t, e, draw)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tempai_closed_exact_win_prob() {
        let mut h0 = [0u8; 34];
        h0[9] = 3;
        h0[10] = 1;
        h0[11] = 1;
        h0[12] = 1;
        h0[13] = 1;
        h0[14] = 1;
        h0[15] = 1;
        h0[27] = 2;
        h0[19] = 1;
        h0[20] = 1;

        let limits = make_tile_limits(true);
        let s0 = calc_shanten(&h0, &limits, 4, Mode::all(), false, true)
            .unwrap()
            .unwrap();
        assert_eq!(s0, 0);

        let mut u0 = [0u8; 34];
        for i in 0..34 {
            if !(1..=7).contains(&i) {
                u0[i] = 4 - h0[i];
            }
        }
        let mut res = search(&h0, &h0, 4, &u0, &limits, false, 2, true, true, 2, s0);
        assert_eq!(res.tempai_count(), 1);
        assert_eq!(res.total_waits(), 2);

        let values = vec![1000.0, 0.0, 1000.0, 0.0];
        let out = solve(&mut res, &values);
        let q = 8.0 / 95.0;
        let expected_win = 1.0 - (1.0 - q) * (1.0 - q);
        assert!((out[0] - 1.0).abs() < 1e-12);
        assert!((out[1] - expected_win).abs() < 1e-12);
        assert!((out[2] - expected_win * 1000.0).abs() < 1e-9);
    }

    #[test]
    fn forward_keeps_tempai_mass_when_wall_empty() {
        let mut h0 = [0u8; 34];
        h0[9] = 3;
        h0[10] = 1;
        h0[11] = 1;
        h0[12] = 1;
        h0[13] = 1;
        h0[14] = 1;
        h0[15] = 1;
        h0[27] = 2;
        h0[19] = 1;
        h0[20] = 1;

        let limits = make_tile_limits(true);
        let s0 = calc_shanten(&h0, &limits, 4, Mode::all(), false, true)
            .unwrap()
            .unwrap();
        assert_eq!(s0, 0);

        let u0 = [0u8; 34];
        let mut res = search(&h0, &h0, 4, &u0, &limits, false, 2, true, true, 2, s0);
        let values = vec![1000.0; res.total_waits() * 2];
        let out = solve(&mut res, &values);
        assert_eq!(out.len(), 9);
        for &idx in &[0usize, 3, 6] {
            assert!((out[idx] - 1.0).abs() < 1e-12, "out[{idx}] = {}", out[idx]);
        }
        for &idx in &[1usize, 2, 4, 5, 7, 8] {
            assert!(out[idx].abs() < 1e-12, "out[{idx}] = {}", out[idx]);
        }
    }

    #[test]
    fn forward_keeps_rinshan_tempai_mass_when_wall_empty() {
        let mut h0 = [0u8; 34];
        h0[9] = 3;
        h0[10] = 1;
        h0[11] = 1;
        h0[12] = 1;
        h0[13] = 1;
        h0[14] = 1;
        h0[15] = 1;
        h0[27] = 2;
        h0[19] = 1;
        h0[20] = 1;

        let limits = make_tile_limits(true);
        let s0 = calc_shanten(&h0, &limits, 4, Mode::all(), false, true)
            .unwrap()
            .unwrap();
        assert_eq!(s0, 0);

        let mut u0 = [0u8; 34];
        u0[30] = 1;
        let mut res = search(&h0, &h0, 4, &u0, &limits, true, 2, true, true, 2, s0);
        let e_count = res.max_extra_nuki() as usize + 1;
        let values = vec![1000.0; res.total_waits() * 2 * e_count];
        let out = solve(&mut res, &values);
        assert_eq!(out.len(), 9);
        for &idx in &[0usize, 3, 6] {
            assert!((out[idx] - 1.0).abs() < 1e-12, "out[{idx}] = {}", out[idx]);
        }
        for &idx in &[1usize, 2, 4, 5, 7, 8] {
            assert!(out[idx].abs() < 1e-12, "out[{idx}] = {}", out[idx]);
        }
    }
}
