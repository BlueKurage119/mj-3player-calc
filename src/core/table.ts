/** 三麻の風。北は自風・場風にならない */
export type Wind = 'east' | 'south' | 'west';

export interface Table {
  round: Wind; // 場風
  seat: Wind; // 自風
  continue: number; // 本場数(0以上の整数)
  deposit: number; // 供託の本数(0以上の整数)
}

/** 親か。自風が東の者が親 */
export const isDealer = (table: Table): boolean => table.seat === 'east';
