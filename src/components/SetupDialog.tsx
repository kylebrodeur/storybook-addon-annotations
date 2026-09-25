import React from 'react';

import { Button, Modal } from 'storybook/internal/components';
import { useTheme } from 'storybook/theming';

type StoreTracking = 'track' | 'ignore';

export interface SetupDialogProps {
  open: boolean;
  busy: boolean;
  storyId?: string;
  reviewerName: string;
  onCancel: () => void;
  onConfirm: (options: { storeTracking: StoreTracking; includeDocs: boolean; reviewerName: string }) => void;
}

/**
 * Option row for the store-tracking choice. Rendered as a themed card rather
 * than a native radio: the whole card is the hit target, and selection is a
 * themed border instead of a browser-chrome widget.
 */
function TrackingOption({
  selected,
  title,
  detail,
  onPick,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onPick: () => void;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 10,
        rowGap: 2,
        alignItems: 'center',
        textAlign: 'left',
        width: '100%',
        padding: '10px 12px',
        borderRadius: theme.appBorderRadius,
        border: `1px solid ${selected ? theme.color.secondary : theme.appBorderColor}`,
        background: selected ? theme.background.app : 'transparent',
        cursor: 'pointer',
        color: theme.color.defaultText,
      }}
    >
      <span
        aria-hidden
        style={{
          gridColumn: 1,
          gridRow: 'span 2',
          width: 16,
          height: 16,
          borderRadius: 999,
          border: `1px solid ${selected ? theme.color.secondary : theme.appBorderColor}`,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {selected ? (
          <span style={{ width: 8, height: 8, borderRadius: 999, background: theme.color.secondary }} />
        ) : null}
      </span>
      <span style={{ gridColumn: 2, fontWeight: 'bold' }}>{title}</span>
      <span style={{ gridColumn: 2, fontSize: 13, color: theme.textMutedColor }}>{detail}</span>
    </button>
  );
}

/**
 * Native confirmation for project setup, replacing window.confirm. Asks the
 * one decision that belongs to the team — whether review threads are committed
 * content or machine-local — plus the optional docs report for the story in
 * view. The report is opt-in, matching the install wizard. Storybook hot-adds
 * .mdx pages, so docs need no restart; only a config change does.
 */
export function SetupDialog({
  open,
  busy,
  storyId,
  reviewerName,
  onCancel,
  onConfirm,
}: SetupDialogProps): React.ReactElement {
  const theme = useTheme();
  const [storeTracking, setStoreTracking] = React.useState<StoreTracking>('track');
  const [includeDocs, setIncludeDocs] = React.useState(true);
  const [name, setName] = React.useState(reviewerName);

  React.useEffect(() => {
    if (open) setName(reviewerName);
  }, [open, reviewerName]);

  const onStory = storyId !== undefined;
  const docsChecked = includeDocs && onStory;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? undefined : onCancel())}
      width={520}
      ariaLabel="Set up Annotations"
    >
      <Modal.Header style={{ padding: '20px 20px 4px' }}>
        <Modal.Title>Set up Annotations</Modal.Title>
        <Modal.Description>
          {onStory
            ? 'Choose how review threads are stored. A refresh shows the annotations page in the sidebar.'
            : 'Choose how review threads are stored. Open a story to also create the annotations page.'}
        </Modal.Description>
      </Modal.Header>
      <Modal.Content style={{ padding: '4px 20px 20px' }}>
        <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: theme.color.defaultText }}>Your display name</span>
          <input
            type="text"
            value={name}
            placeholder="Reviewer"
            onChange={(event) => setName(event.target.value)}
            style={{
              font: 'inherit',
              fontSize: 14,
              padding: '8px 10px',
              borderRadius: theme.appBorderRadius,
              border: `1px solid ${theme.appBorderColor}`,
              background: theme.background.app,
              color: theme.color.defaultText,
            }}
          />
        </label>
        <div role="radiogroup" aria-label="Store tracking" style={{ display: 'grid', gap: 10 }}>
          <TrackingOption
            selected={storeTracking === 'track'}
            title="Tracked in git"
            detail="Annotations are review content, committed with the code."
            onPick={() => setStoreTracking('track')}
          />
          <TrackingOption
            selected={storeTracking === 'ignore'}
            title="Local only"
            detail="Ignore the JSONL store; annotations stay on this machine."
            onPick={() => setStoreTracking('ignore')}
          />
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={docsChecked}
          aria-disabled={!onStory}
          disabled={!onStory}
          onClick={() => setIncludeDocs(!includeDocs)}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: 10,
            alignItems: 'center',
            width: '100%',
            marginTop: 0,
            padding: '10px 12px',
            borderRadius: theme.appBorderRadius,
            border: `1px solid ${docsChecked ? theme.color.secondary : theme.appBorderColor}`,
            background: docsChecked ? theme.background.app : 'transparent',
            cursor: onStory ? 'pointer' : 'not-allowed',
            opacity: onStory ? 1 : 0.5,
            color: theme.color.defaultText,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: `1px solid ${docsChecked ? theme.color.secondary : theme.appBorderColor}`,
              background: docsChecked ? theme.color.secondary : 'transparent',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {docsChecked ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 5.5l2.2 2.2L8.5 2.8"
                  stroke={theme.color.lightest}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
          <span style={{ fontSize: 14 }}>
            {onStory ? 'Create the annotations page (Review/Annotations)' : 'Annotations page — open a story first'}
          </span>
        </button>
      </Modal.Content>
      <Modal.Actions style={{ padding: '0 20px 20px' }}>
        <Button variant="ghost" ariaLabel={false} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="solid"
          ariaLabel={false}
          disabled={busy}
          onClick={() => onConfirm({ storeTracking, includeDocs: docsChecked, reviewerName: name })}
        >
          {busy ? 'Setting up…' : 'Set up'}
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
