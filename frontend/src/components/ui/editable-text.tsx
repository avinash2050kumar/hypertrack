import { EditOutlined } from '@mui/icons-material';
import { ButtonBase, InputBase } from '@mui/material';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { MAX_LABEL_LENGTH } from '../../data';

interface EditableTextProps {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  label: string;
  maxLength?: number;
  size?: 'md' | 'lg';
}

const FONT: Record<
  NonNullable<EditableTextProps['size']>,
  { fontSize: string; fontWeight: number }
> = {
  md: { fontSize: '0.875rem', fontWeight: 500 },
  lg: { fontSize: '1.125rem', fontWeight: 600 },
};

export function EditableText({
  value,
  placeholder,
  onSave,
  label,
  maxLength = MAX_LABEL_LENGTH,
  size = 'md',
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') commit();
    if (event.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <InputBase
        inputRef={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        onClick={(event) => event.stopPropagation()}
        slotProps={{ input: { maxLength, 'aria-label': label } }}
        sx={[
          FONT[size],
          {
            ml: -0.75,
            px: 0.75,
            borderRadius: 1,
            border: 1,
            borderColor: 'primary.main',
            bgcolor: 'background.paper',
          },
        ]}
      />
    );
  }

  return (
    <ButtonBase
      aria-label={`${label}: ${value || 'none'}. Click to edit`}
      onClick={(event) => {
        event.stopPropagation();
        setDraft(value);
        setEditing(true);
      }}
      sx={[
        FONT[size],
        {
          ml: -0.75,
          px: 0.75,
          py: 0.25,
          gap: 0.75,
          maxWidth: '100%',
          borderRadius: 1,
          justifyContent: 'flex-start',
          color: value ? 'text.primary' : 'text.disabled',
          '&:hover': { bgcolor: 'raised' },
          '& .MuiSvgIcon-root': { opacity: 0, transition: 'opacity 120ms' },
          '&:hover .MuiSvgIcon-root, &:focus-visible .MuiSvgIcon-root': { opacity: 1 },
        },
      ]}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || placeholder}
      </span>
      <EditOutlined aria-hidden="true" sx={{ fontSize: 12, color: 'text.disabled' }} />
    </ButtonBase>
  );
}
