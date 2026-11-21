use std::hash::{BuildHasher, Hasher};

/// 三麻における牌の種類数 (0..34: 1m-9m, 1p-9p, 1s-9s, 東南西北白發中)
pub const NUM_TILES: usize = 34;

/// 北の index (4z = 27 + 3)
pub const NORTH_INDEX: usize = 30;

/// 34種の各枚数(0..=4)を 3bit ずつ使って u128 にパッキングする。
/// 34 * 3 = 102 bit のため衝突のない可逆キーになる。
#[inline]
pub fn encode_hand(hand: &[u8; NUM_TILES]) -> u128 {
    let mut key: u128 = 0;
    for (i, &c) in hand.iter().enumerate() {
        key |= (c as u128) << (i * 3);
    }
    key
}

/// 高速な非暗号論的ハッシャー (外部 crate 不要の FxHash 風実装)
#[derive(Clone, Default)]
pub struct FastHasher(u64);

impl Hasher for FastHasher {
    #[inline]
    fn finish(&self) -> u64 {
        self.0
    }

    #[inline]
    fn write(&mut self, bytes: &[u8]) {
        let mut h = self.0;
        for &b in bytes {
            h = (h.rotate_left(5) ^ (b as u64)).wrapping_mul(0x517c_c1b7_2722_0a95);
        }
        self.0 = h;
    }

    #[inline]
    fn write_u128(&mut self, i: u128) {
        let lo = i as u64;
        let hi = (i >> 64) as u64;
        let mut h = lo.wrapping_mul(0x517c_c1b7_2722_0a95);
        h = (h.rotate_left(5) ^ hi).wrapping_mul(0x517c_c1b7_2722_0a95);
        self.0 = h;
    }
}

#[derive(Clone, Default)]
pub struct FastBuildHasher;

impl BuildHasher for FastBuildHasher {
    type Hasher = FastHasher;

    #[inline]
    fn build_hasher(&self) -> Self::Hasher {
        FastHasher(0)
    }
}

/// 開始手 h0 から手牌 h へ入れ替わった枚数: hand_len - Σ_k min(h[k], h0[k])
#[inline]
pub fn diff_from_initial(hand: &[u8; NUM_TILES], h0: &[u8; NUM_TILES], hand_len: u8) -> u8 {
    let mut common: u8 = 0;
    for i in 0..NUM_TILES {
        common += hand[i].min(h0[i]);
    }
    hand_len.saturating_sub(common)
}

/// 状態 (H, e) での各牌の見えていない残り枚数 c_k を計算する (§3.2)
#[inline]
pub fn remaining_counts(
    hand: &[u8; NUM_TILES],
    h0: &[u8; NUM_TILES],
    u0: &[u8; NUM_TILES],
    nuki_mode: bool,
    e: u8,
) -> ([u8; NUM_TILES], u32) {
    let mut counts = [0u8; NUM_TILES];
    let mut total: u32 = 0;
    for k in 0..NUM_TILES {
        let inc = hand[k].saturating_sub(h0[k]);
        let mut c = u0[k].saturating_sub(inc);
        if nuki_mode && k == NORTH_INDEX {
            c = c.saturating_sub(e);
        }
        counts[k] = c;
        total += c as u32;
    }
    (counts, total)
}

/// 状態 H と初期状態 h0・u0 のもとで、牌 k がツモられ得るか(e=0 時の上限が正か)
#[inline]
pub fn can_draw_tile(hand: &[u8; NUM_TILES], h0: &[u8; NUM_TILES], u0: &[u8; NUM_TILES], k: usize) -> bool {
    let inc = hand[k].saturating_sub(h0[k]);
    u0[k].saturating_sub(inc) > 0
}
