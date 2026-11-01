# 牌画像素材 (assets)

このディレクトリに含まれる SVG ファイルは、上流リポジトリから取り込み、SVGO により最適化したものです。手動での編集は行わないでください。

## 出典

- 上流リポジトリ: https://github.com/FluffyStuff/riichi-mahjong-tiles
- コミット: `26e127ba2117f45cdce5ea0225748cc0cfad3169`
- ライセンス: CC0 1.0 Universal (パブリックドメイン)

## 再生成手順

リポジトリ外の一時ディレクトリに上流を clone し、最適化スクリプトを実行します。

```sh
UPSTREAM_DIR=$(mktemp -d /tmp/riichi-tiles-XXXXXX)
git clone --depth 1 https://github.com/FluffyStuff/riichi-mahjong-tiles.git "$UPSTREAM_DIR"
git -C "$UPSTREAM_DIR" fetch --depth 1 origin 26e127ba2117f45cdce5ea0225748cc0cfad3169
git -C "$UPSTREAM_DIR" checkout 26e127ba2117f45cdce5ea0225748cc0cfad3169
npm run tiles:optimize -- "$UPSTREAM_DIR/Regular"
rm -rf "$UPSTREAM_DIR"
```
