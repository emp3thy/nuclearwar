import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

export interface BtnProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'cyan' | 'ghost';
  size?: 'md' | 'lg' | 'xl';
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
}

/** Button */
export default function Btn({
  children, variant = 'default', size = 'md', onClick, disabled, style = {}, type = 'button',
}: BtnProps) {
  const cls = ['btn'];
  if (variant === 'primary') cls.push('primary');
  if (variant === 'danger') cls.push('danger');
  if (variant === 'cyan') cls.push('cyan');
  if (variant === 'ghost') cls.push('ghost');
  if (size === 'lg') cls.push('lg');
  if (size === 'xl') cls.push('xl');
  return (
    <button className={cls.join(' ')} onClick={onClick} disabled={disabled} type={type} style={style}>
      {children}
    </button>
  );
}
