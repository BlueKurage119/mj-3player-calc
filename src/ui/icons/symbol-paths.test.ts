import { describe, expect, it } from 'vitest';
import {
  SYMBOL_ARROW_BACK,
  SYMBOL_MORE_VERT,
  SYMBOL_REMOVE
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
});
