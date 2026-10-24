import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  titleExtra?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function Card({
  title,
  titleExtra,
  action,
  className = '',
  bodyClassName = '',
  children,
}: CardProps) {
  const hasHeader = title !== undefined || action !== undefined;

  return (
    <section className={['fd-card', className].filter(Boolean).join(' ')}>
      {hasHeader && (
        <header className="fd-card__header">
          <div className="fd-card__heading">
            {title !== undefined && <h2 className="fd-card__title">{title}</h2>}
            {titleExtra}
          </div>
          {action}
        </header>
      )}
      <div className={['fd-card__body', bodyClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
    </section>
  );
}