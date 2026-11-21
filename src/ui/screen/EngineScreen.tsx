import { useRef, useState } from 'react';
import type React from 'react';
import { instantiateMeld } from '../../core/input';
import type { EngineClient } from '../../engine/client';
import { useResult } from '../calc/use-result';
import { EngineView } from '../engine/EngineView';
import {
  ENGINE_DRAWS,
  buildEngineRequest,
  engineKey
} from '../engine/engine-request';
import { isSlowRun } from '../engine/engine-estimate';
import { visibleRunState } from '../engine/engine-run';
import { useEngineRun } from '../engine/use-engine-run';
import { classifyResult } from '../result/classify';
import { engineHandSize, engineStartShanten } from '../result/engine-entry';
import { useAppDispatch, useAppState } from '../state';
import './main-screen.css';

/** 表示する巡目の既定(計算は常に18巡目まで一括) */
const DEFAULT_DISPLAY_TURN = 3;
const MAX_TURN = ENGINE_DRAWS;

export interface EngineScreenProps {
  /** テストでフェイクを注入する。既定は Worker を使うクライアント */
  createClient?: (() => EngineClient) | undefined;
}

export function EngineScreen({
  createClient
}: EngineScreenProps): React.JSX.Element {
  const app = useAppState();
  const dispatch = useAppDispatch();
  const resultState = useResult();
  const [detailed, setDetailed] = useState(false);
  const [displayTurn, setDisplayTurn] = useState(DEFAULT_DISPLAY_TURN);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const nextId = useRef(0);

  const { hand, melds } = app.input;
  const view = classifyResult(
    resultState.status === 'ok' ? resultState.result : null
  );
  const size = engineHandSize(hand.length, melds.length);
  const startShanten = engineStartShanten(view, hand.length, melds.length);
  const available = size !== null && startShanten !== null;
  // 13枚の聴牌・1向聴は計算方法で結果が変わらない(2択を出さない)。14枚は出す
  const methodChoice =
    available && (size === 14 || (startShanten !== null && startShanten >= 2));
  const effectiveDetailed = methodChoice && detailed;
  const conditions = { detailed: effectiveDetailed, draws: ENGINE_DRAWS };
  const key = engineKey(app, conditions);

  const engine = useEngineRun(key, createClient);
  const run = visibleRunState(engine.state, key);

  const tiles = [
    ...hand,
    ...melds.flatMap(m => instantiateMeld(m, app.rule.red))
  ];

  return (
    <EngineView
      onBack={() => dispatch({ type: 'navigate', screen: 'main' })}
      onOpenHelp={() =>
        dispatch({ type: 'open-help', focus: 'engine', returnTo: 'engine' })
      }
      tiles={tiles}
      premise={{
        dora: app.input.dora,
        nuki: app.input.nuki,
        round: app.table.round,
        seat: app.table.seat
      }}
      available={available}
      methodChoice={methodChoice}
      detailed={effectiveDetailed}
      onDetailedChange={setDetailed}
      slow={
        available &&
        size !== null &&
        startShanten !== null &&
        isSlowRun({ detailed: effectiveDetailed, size, startShanten })
      }
      run={run}
      onRun={() => {
        nextId.current += 1;
        setSelectedIndex(null);
        engine.run(buildEngineRequest(nextId.current, app, conditions), key);
      }}
      onCancel={engine.cancel}
      result={{
        displayTurn,
        onTurnChange: turn =>
          setDisplayTurn(Math.min(MAX_TURN, Math.max(1, Math.round(turn)))),
        selectedIndex,
        onSelect: setSelectedIndex
      }}
    />
  );
}

export default EngineScreen;
