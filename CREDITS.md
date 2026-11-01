# クレジット (Credits)

本プロジェクトで使用している第三者素材・リソースのクレジット一覧です。

## 牌画像素材

- 提供元: FluffyStuff / riichi-mahjong-tiles
- URL: https://github.com/FluffyStuff/riichi-mahjong-tiles
- コミット: `26e127ba2117f45cdce5ea0225748cc0cfad3169`
- ライセンス: CC0 1.0 Universal (パブリックドメイン)
- 備考: ライセンス上の義務はありませんが、素晴らしい素材の公開に感謝してここに謝意を記載します。
- 加工内容:
  - `Regular` ディレクトリから三人麻雀で使用する図柄 29 ファイルを選定して取り込み
  - SVGO (`svgo.tiles.config.mjs`) による最適化 (viewBox 保持)

## 牌の下地・裏 (livewing/mahjong-calc)

- 提供元: livewing / mahjong-calc
- URL: https://github.com/livewing/mahjong-calc
- バージョン: v2.1.4
- コミット: `6550200`
- ライセンス: MIT License (Copyright 2021 livewing.net、全文はリポジトリルートの `LICENSE` を参照)
- 使用内容:
  - 表の下地 `bg.svg`・裏 `back.svg` を内容そのままで `Front.svg`・`Back.svg` に改名して使用
  - 絵柄を下地に重ねて 0.9 倍に縮小する配置を参考にした
