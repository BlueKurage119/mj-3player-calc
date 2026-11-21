import { describe, expect, it } from 'vitest';
import * as symbolPaths from './symbol-paths';
import {
  SYMBOL_ANALYTICS,
  SYMBOL_ARROW_BACK,
  SYMBOL_CONTENT_COPY,
  SYMBOL_DOWNLOAD,
  SYMBOL_MORE_VERT,
  SYMBOL_REMOVE,
  SYMBOL_SHARE
} from './symbol-paths';

describe('インライン SVG の Symbols 化: 新規定数', () => {
  it('SYMBOL_REMOVE は公式 remove_24px.svg のパスと完全一致する', () => {
    // 理由: 公式 SVG の d を書き写した値と完全一致を確かめるため
    expect(SYMBOL_REMOVE).toBe('M200-440v-80h560v80H200Z');
  });

  it('SYMBOL_MORE_VERT は公式 more_vert_24px.svg のパスと完全一致する', () => {
    // 理由: 公式 SVG の d を書き写した値と完全一致を確かめるため
    expect(SYMBOL_MORE_VERT).toBe(
      'M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z'
    );
  });

  it('SYMBOL_ARROW_BACK は公式 arrow_back_24px.svg のパスと完全一致する', () => {
    // 理由: 公式 SVG の d を書き写した値と完全一致を確かめるため
    expect(SYMBOL_ARROW_BACK).toBe(
      'm313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z'
    );
  });

  it('SYMBOL_SHARE は公式 share_24px.svg のパスと完全一致する', () => {
    // 理由: 公式 SVG の d を書き写した値と完全一致を確かめるため
    expect(SYMBOL_SHARE).toBe(
      'M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM240-440q17 0 28.5-11.5T280-480q0-17-11.5-28.5T240-520q-17 0-28.5 11.5T200-480q0 17 11.5 28.5T240-440Zm480 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Zm0-600ZM240-480Zm480 280Z'
    );
  });

  it('SYMBOL_DOWNLOAD は公式 download_24px.svg のパスと完全一致する', () => {
    // 理由: 公式 SVG の d を書き写した値と完全一致を確かめるため
    expect(SYMBOL_DOWNLOAD).toBe(
      'M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z'
    );
  });

  it('SYMBOL_ANALYTICS は公式 analytics_24px.svg のパスと完全一致する', () => {
    // 理由: 公式 SVG の d を書き写した値と完全一致を確かめるため
    expect(SYMBOL_ANALYTICS).toBe(
      'M280-280h80v-200h-80v200Zm320 0h80v-400h-80v400Zm-160 0h80v-120h-80v120Zm0-200h80v-80h-80v80ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z'
    );
  });

  it('SYMBOL_CONTENT_COPY は公式 content_copy_24px.svg のパスと完全一致する', () => {
    // 理由: 公式 SVG の d を書き写した値と完全一致を確かめるため
    expect(SYMBOL_CONTENT_COPY).toBe(
      'M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z'
    );
  });

  it('定数の総数は 17 個である', () => {
    // 理由: 定数の追加・削除漏れ(出典・ライセンス表記の更新漏れ)を検知するため
    expect(Object.keys(symbolPaths)).toHaveLength(17);
  });
});
