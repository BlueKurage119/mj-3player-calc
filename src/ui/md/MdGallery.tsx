import { useState } from 'react';
import type React from 'react';
import { ConnectedButtonGroup, type ConnectedOption } from '../expressive';
import { useTheme } from '../theme';
import {
  AssistChip,
  Button,
  ChipSet,
  Dialog,
  Divider,
  FilterChip,
  FocusRing,
  IconButton,
  PrimaryTab,
  Ripple,
  Select,
  SelectOption,
  Switch,
  Tabs
} from './index';

const CONNECTED_OPTIONS: readonly ConnectedOption[] = [
  { value: 'opt1', label: '選択肢1' },
  { value: 'opt2', label: '選択肢2' },
  { value: 'opt3', label: '選択肢3' }
] as const;

export default function MdGallery(): React.JSX.Element {
  const { preference, resolved } = useTheme();

  const [switchVal, setSwitchVal] = useState(false);
  const [filterSelected, setFilterSelected] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReturnValue, setDialogReturnValue] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectVal, setSelectVal] = useState('apple');
  const [connectedVal, setConnectedVal] = useState('opt1');

  const sampleIcon = (
    <svg viewBox="0 0 24 24" width="1.5rem" height="1.5rem" aria-hidden="true">
      <path d="M12 2L2 22h20L12 2z" fill="currentColor" />
    </svg>
  );

  return (
    <main
      style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}
    >
      <h1>Material Web &amp; Expressive ギャラリー</h1>

      <section>
        <h2>Theme Status</h2>
        <p id="theme-status">
          Preference: <span id="theme-preference">{preference}</span>, Resolved:{' '}
          <span id="theme-resolved">{resolved}</span>
        </p>
      </section>

      <Divider />

      <section>
        <h2>Buttons</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="filled">Filled</Button>
          <Button variant="tonal">Tonal</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
        </div>
      </section>

      <section>
        <h2>Icon Buttons</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <IconButton variant="standard" label="Standard Icon">
            {sampleIcon}
          </IconButton>
          <IconButton variant="filled" label="Filled Icon">
            {sampleIcon}
          </IconButton>
          <IconButton variant="tonal" label="Tonal Icon">
            {sampleIcon}
          </IconButton>
          <IconButton variant="outlined" label="Outlined Icon">
            {sampleIcon}
          </IconButton>
        </div>
      </section>

      <section>
        <h2>Chips</h2>
        <ChipSet>
          <FilterChip
            label="Filter Chip"
            selected={filterSelected}
            onSelectedChange={setFilterSelected}
          />
          <AssistChip label="Assist Chip" icon={sampleIcon} />
        </ChipSet>
      </section>

      <section>
        <h2>Switch</h2>
        <Switch
          selected={switchVal}
          onSelectedChange={setSwitchVal}
          label="サンプルスイッチ"
        />
      </section>

      <section>
        <h2>Tabs</h2>
        <Tabs activeIndex={activeTab} onActiveIndexChange={setActiveTab}>
          <PrimaryTab>タブ 1</PrimaryTab>
          <PrimaryTab>タブ 2</PrimaryTab>
        </Tabs>
      </section>

      <section>
        <h2>Select</h2>
        <Select
          label="フルーツ選択"
          value={selectVal}
          onValueChange={setSelectVal}
        >
          <SelectOption value="apple">りんご</SelectOption>
          <SelectOption value="banana">バナナ</SelectOption>
          <SelectOption value="orange">オレンジ</SelectOption>
        </Select>
      </section>

      <section>
        <h2>Dialog</h2>
        <Button variant="filled" onClick={() => setDialogOpen(true)}>
          ダイアログを開く
        </Button>
        <span id="dialog-return-value" style={{ marginLeft: '1rem' }}>
          ReturnValue: {dialogReturnValue}
        </span>
        <Dialog
          open={dialogOpen}
          headline="テスト用ダイアログ"
          actions={
            <Button
              variant="text"
              onClick={() => {
                setDialogOpen(false);
              }}
            >
              閉じる
            </Button>
          }
          onClose={retVal => {
            setDialogOpen(false);
            setDialogReturnValue(`closed:${retVal || 'empty'}`);
          }}
        >
          これはダイアログの内容です。
        </Dialog>
      </section>

      <section>
        <h2>Connected Button Group</h2>
        <ConnectedButtonGroup
          label="サンプル選択肢"
          options={CONNECTED_OPTIONS}
          value={connectedVal}
          onValueChange={setConnectedVal}
        />
      </section>

      <section>
        <h2>Ripple &amp; FocusRing (Standalone Demo)</h2>
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            border: 'thin solid var(--md-sys-color-outline)'
          }}
        >
          <Ripple />
          <FocusRing />
          <span>Interactive Box</span>
        </div>
      </section>
    </main>
  );
}
